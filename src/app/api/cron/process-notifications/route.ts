import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const from = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const items = await prisma.agendaItem.findMany({
    where: { startsAt: { gt: from, lte: until }, status: { notIn: ["COMPLETED", "CANCELLED"] }, user: { telegramChatId: { not: null }, preferences: { telegram: true, reminder48h: true } } },
    include: { user: true },
  });
  let sent = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  for (const item of items) {
    const idempotencyKey = `telegram-48h:${item.id}`;
    if (await prisma.notificationLog.findUnique({ where: { idempotencyKey } })) { skippedDuplicates++; continue; }
    const log = await prisma.notificationLog.create({ data: { agendaItemId: item.id, recipient: item.user.telegramChatId!, channel: "TELEGRAM", type: "MATCH_48H", idempotencyKey, scheduledAt: now } });
    try {
      const kickoff = formatInTimeZone(item.startsAt, item.user.timezone || "Asia/Baku", "dd MMM yyyy · HH:mm");
      const detail = [item.client, item.workType].filter(Boolean).join(" · ");
      await sendTelegramMessage(item.user.telegramChatId!, `⚽ Match reminder\n\n${item.title}\n${kickoff}${detail ? `\n${detail}` : ""}`);
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } });
      sent++;
    } catch (error) {
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", safeError: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" } });
      failed++;
    }
  }
  return NextResponse.json({ ok: true, eligible: items.length, sent, failed, skippedDuplicates, processedAt: now.toISOString() });
}
