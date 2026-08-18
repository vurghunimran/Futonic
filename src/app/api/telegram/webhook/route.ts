import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({ message: z.object({ chat: z.object({ id: z.number() }), text: z.string().optional() }).optional() });

export async function POST(request: Request) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!configuredSecret || request.headers.get("x-telegram-bot-api-secret-token") !== configuredSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const text = parsed.data.message?.text || "";
  const activationToken = text.startsWith("/start ") ? text.slice(7).trim() : null;
  // Production persistence: match this one-time token to User, store chat.id,
  // set telegramActivatedAt, and invalidate the token in one transaction.
  return NextResponse.json({ ok: true, activationReceived: Boolean(activationToken) });
}
