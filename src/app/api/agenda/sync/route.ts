import { NextResponse } from "next/server";
import { databaseConfigured, prisma } from "@/lib/prisma";
import { hasAdminSession, sessionUserId } from "@/lib/session";
import { sendMatchReminder } from "@/lib/match-reminders";
import { parseAgendaSyncItems } from "@/lib/agenda-sync";

const statuses = { Unassigned: "UNASSIGNED", Assigned: "ASSIGNED", "In Progress": "IN_PROGRESS", "Ready for Review": "READY_FOR_REVIEW", Completed: "COMPLETED", Cancelled: "CANCELLED" } as const;
const priorities = { Low: "LOW", Medium: "MEDIUM", High: "HIGH", Urgent: "URGENT" } as const;

export async function POST(request: Request) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const parsed = parseAgendaSyncItems(await request.json().catch(() => null));
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const userId = sessionUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign out and register again to enable notifications" }, { status: 409 });

  const ids = parsed.items.map((item) => item.id);
  await prisma.$transaction([
    prisma.agendaItem.deleteMany({ where: { userId, ...(ids.length ? { id: { notIn: ids } } : {}) } }),
    ...parsed.items.map((item) => prisma.agendaItem.upsert({
      where: { id: item.id },
      create: { id: item.id, userId, kind: item.kind === "fixture" ? "FIXTURE" : "MANUAL", title: item.title, startsAt: new Date(item.startsAt), status: statuses[item.status], priority: priorities[item.priority], client: item.client, workType: item.kind === "fixture" || (item.home && item.away) ? "match" : "task", description: JSON.stringify({ competition: item.competition, home: item.home, away: item.away, selectedPlayer: item.selectedPlayer, venue: item.venue, contentType: item.contentType }) },
      update: { title: item.title, startsAt: new Date(item.startsAt), status: statuses[item.status], priority: priorities[item.priority], client: item.client, workType: item.kind === "fixture" || (item.home && item.away) ? "match" : "task", description: JSON.stringify({ competition: item.competition, home: item.home, away: item.away, selectedPlayer: item.selectedPlayer, venue: item.venue, contentType: item.contentType }) },
    })),
  ]);
  const now = new Date();
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const urgentMatchCount = parsed.items.filter((item) => {
    const startsAt = new Date(item.startsAt);
    return (item.kind === "fixture" || Boolean(item.home && item.away)) && startsAt > now && startsAt <= until && item.status !== "Completed" && item.status !== "Cancelled";
  }).length;
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
  const urgentMatches = await prisma.agendaItem.findMany({
    where: { id: { in: ids }, userId, workType: "match", startsAt: { gt: now, lte: until }, status: { notIn: ["COMPLETED", "CANCELLED"] }, user: { telegramChatId: { not: null }, preferences: { telegram: true, reminder48h: true } } },
    include: { user: true },
  });
  const reminders = await Promise.all(urgentMatches.map(sendMatchReminder));
  return NextResponse.json({
    ok: true,
    synced: parsed.items.length,
    ignoredLegacyItems: parsed.invalid,
    remindersSent: reminders.filter((result) => result === "sent").length,
    remindersFailed: reminders.filter((result) => result === "failed").length,
    urgentMatchCount,
    telegramConnected: Boolean(account?.telegramChatId),
  });
}
