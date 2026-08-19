import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { databaseConfigured, prisma } from "@/lib/prisma";
import { hasAdminSession, sessionUserId } from "@/lib/session";
import { configureTelegramWebhook } from "@/lib/telegram";

async function activation(request: Request, regenerate: boolean) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = sessionUserId(request);
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!databaseConfigured() || !userId || !username) {
    return NextResponse.json({ error: "Telegram requires DATABASE_URL and TELEGRAM_BOT_USERNAME." }, { status: 503 });
  }
  try { await configureTelegramWebhook(request.url); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Telegram webhook setup failed" }, { status: 502 }); }
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const token = regenerate || !current.telegramActivationToken ? randomBytes(18).toString("base64url") : current.telegramActivationToken;
  const user = await prisma.user.update({
    where: { id: userId },
    data: regenerate ? { telegramActivationToken: token, telegramChatId: null, telegramActivatedAt: null } : { telegramActivationToken: token },
  });
  return NextResponse.json({ telegramUrl: `https://t.me/${username}?start=${token}`, connected: Boolean(user.telegramChatId) });
}

export async function GET(request: Request) { return activation(request, false); }
export async function POST(request: Request) { return activation(request, true); }
