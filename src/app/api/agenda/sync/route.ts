import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, prisma } from "@/lib/prisma";
import { hasAdminSession, sessionUserId } from "@/lib/session";
import { sendMatchReminder } from "@/lib/match-reminders";

const itemSchema = z.object({
  id: z.string().min(1).max(180),
  kind: z.enum(["fixture", "manual"]),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  status: z.enum(["Unassigned", "Assigned", "In Progress", "Ready for Review", "Completed", "Cancelled"]),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  client: z.string().max(160),
  competition: z.string().max(160).optional(),
  home: z.string().max(160).optional(),
  away: z.string().max(160).optional(),
  selectedPlayer: z.string().max(160).optional(),
  venue: z.string().max(240).optional(),
});
const schema = z.object({ items: z.array(itemSchema).max(1000) });

const statuses = { Unassigned: "UNASSIGNED", Assigned: "ASSIGNED", "In Progress": "IN_PROGRESS", "Ready for Review": "READY_FOR_REVIEW", Completed: "COMPLETED", Cancelled: "CANCELLED" } as const;
const priorities = { Low: "LOW", Medium: "MEDIUM", High: "HIGH", Urgent: "URGENT" } as const;

export async function POST(request: Request) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid agenda data" }, { status: 400 });
  const userId = sessionUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign out and register again to enable notifications" }, { status: 409 });

  const ids = parsed.data.items.map((item) => item.id);
  await prisma.$transaction([
    prisma.agendaItem.deleteMany({ where: { userId, ...(ids.length ? { id: { notIn: ids } } : {}) } }),
    ...parsed.data.items.map((item) => prisma.agendaItem.upsert({
      where: { id: item.id },
      create: { id: item.id, userId, kind: item.kind === "fixture" ? "FIXTURE" : "MANUAL", title: item.title, startsAt: new Date(item.startsAt), status: statuses[item.status], priority: priorities[item.priority], client: item.client, workType: item.kind === "fixture" || (item.home && item.away) ? "match" : "task", description: JSON.stringify({ competition: item.competition, home: item.home, away: item.away, selectedPlayer: item.selectedPlayer, venue: item.venue }) },
      update: { title: item.title, startsAt: new Date(item.startsAt), status: statuses[item.status], priority: priorities[item.priority], client: item.client, workType: item.kind === "fixture" || (item.home && item.away) ? "match" : "task", description: JSON.stringify({ competition: item.competition, home: item.home, away: item.away, selectedPlayer: item.selectedPlayer, venue: item.venue }) },
    })),
  ]);
  const now = new Date();
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const urgentMatches = await prisma.agendaItem.findMany({
    where: { id: { in: ids }, userId, workType: "match", startsAt: { gt: now, lte: until }, status: { notIn: ["COMPLETED", "CANCELLED"] }, user: { telegramChatId: { not: null }, preferences: { telegram: true, reminder48h: true } } },
    include: { user: true },
  });
  const reminders = await Promise.all(urgentMatches.map(sendMatchReminder));
  return NextResponse.json({ ok: true, synced: parsed.data.items.length, remindersSent: reminders.filter((result) => result === "sent").length });
}
