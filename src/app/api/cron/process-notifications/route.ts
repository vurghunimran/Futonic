import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMatchReminder } from "@/lib/match-reminders";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const items = await prisma.agendaItem.findMany({
    where: { workType: "match", startsAt: { gt: now, lte: until }, status: { notIn: ["COMPLETED", "CANCELLED"] }, user: { telegramChatId: { not: null }, preferences: { telegram: true, reminder48h: true } } },
    include: { user: true },
  });
  let sent = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  for (const item of items) {
    const result = await sendMatchReminder(item);
    if (result === "sent") sent++;
    else if (result === "failed") failed++;
    else skippedDuplicates++;
  }
  return NextResponse.json({ ok: true, eligible: items.length, sent, failed, skippedDuplicates, processedAt: now.toISOString() });
}
