import type { AgendaItem, User } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type ReminderItem = AgendaItem & { user: User };
export type ReminderResult = "sent" | "skipped" | "failed";

function competitionFromDescription(description: string | null) {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as { competition?: unknown };
    return typeof parsed.competition === "string" ? parsed.competition : null;
  } catch {
    return null;
  }
}

export async function sendMatchReminder(item: ReminderItem): Promise<ReminderResult> {
  if (!item.user.telegramChatId) return "skipped";
  const idempotencyKey = `telegram-48h:${item.id}`;
  const existing = await prisma.notificationLog.findUnique({ where: { idempotencyKey } });
  if (existing?.status === "SENT" || (existing?.retryCount ?? 0) >= 3) return "skipped";

  const log = existing
    ? await prisma.notificationLog.update({ where: { id: existing.id }, data: { status: "PENDING", scheduledAt: new Date(), safeError: null, retryCount: { increment: 1 } } })
    : await prisma.notificationLog.create({ data: { agendaItemId: item.id, recipient: item.user.telegramChatId, channel: "TELEGRAM", type: "MATCH_48H", idempotencyKey, scheduledAt: new Date() } });
  try {
    const kickoff = formatInTimeZone(item.startsAt, item.user.timezone || "Asia/Baku", "dd MMM yyyy · HH:mm");
    const detail = [item.client, competitionFromDescription(item.description)].filter(Boolean).join(" · ");
    await sendTelegramMessage(item.user.telegramChatId, `⚠️ Match in less than 48 hours\n\n${item.title}\n${kickoff}${detail ? `\n${detail}` : ""}`);
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } });
    return "sent";
  } catch (error) {
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "FAILED", safeError: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" } });
    return "failed";
  }
}
