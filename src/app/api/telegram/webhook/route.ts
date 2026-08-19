import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

const updateSchema = z.object({ message: z.object({ chat: z.object({ id: z.number() }), text: z.string().optional() }).optional() });

export async function POST(request: Request) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!configuredSecret || request.headers.get("x-telegram-bot-api-secret-token") !== configuredSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const text = parsed.data.message?.text || "";
  const activationToken = text.startsWith("/start ") ? text.slice(7).trim() : null;
  const chatId = parsed.data.message?.chat.id;
  if (!activationToken || !chatId || !databaseConfigured()) return NextResponse.json({ ok: true });
  const user = await prisma.user.findUnique({ where: { telegramActivationToken: activationToken } });
  if (!user) {
    await sendTelegramMessage(String(chatId), "This activation link is invalid or has expired. Generate a new link in Futonic Settings.");
    return NextResponse.json({ ok: true });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { telegramChatId: String(chatId), telegramActivatedAt: new Date(), telegramActivationToken: null } }),
    prisma.notificationPreference.upsert({ where: { userId: user.id }, update: { telegram: true, reminder48h: true }, create: { userId: user.id, telegram: true, reminder48h: true } }),
  ]);
  await sendTelegramMessage(String(chatId), "✅ Futonic notifications are active. You will receive a reminder when a match enters the 24–48 hour window.");
  return NextResponse.json({ ok: true, activated: true });
}
