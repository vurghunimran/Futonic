import { NextResponse } from "next/server";
import { databaseConfigured, databaseErrorMessage, prisma } from "@/lib/prisma";
import { hasAdminSession, sessionUserId } from "@/lib/session";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = sessionUserId(request);
  if (!databaseConfigured() || !userId) return NextResponse.json({ error: "Account session is not connected to the database." }, { status: 409 });
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true, phone: true } });
    if (!user?.telegramChatId) return NextResponse.json({ error: "Telegram is not connected to this account. Generate a new activation link first." }, { status: 409 });
    try { await sendTelegramMessage(user.telegramChatId, `✅ Futonic test notification\n\nTelegram is connected to ${user.phone || "your account"}.`); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? `Telegram delivery failed: ${error.message}` : "Telegram delivery failed" }, { status: 502 }); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503 });
  }
}
