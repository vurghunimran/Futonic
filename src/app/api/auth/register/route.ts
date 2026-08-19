import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  surname: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, surname and telephone number." }, { status: 400 });
  const phone = parsed.data.phone.replace(/[^+\d]/g, "");
  const activationToken = randomBytes(18).toString("base64url");
  let userId: string | null = null;
  if (databaseConfigured()) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: parsed.data.name, surname: parsed.data.surname, telegramActivationToken: activationToken },
      create: { name: parsed.data.name, surname: parsed.data.surname, phone, telegramActivationToken: activationToken },
    });
    userId = user.id;
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: { telegram: true, reminder48h: true },
      create: { userId: user.id, telegram: true, reminder48h: true },
    });
  }
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const telegramUrl = botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}?start=${activationToken}` : null;
  const response = NextResponse.json({ ok: true, telegramUrl, telegramConfigured: Boolean(botUsername) });
  response.cookies.set("futonic_session", "admin", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.cookies.set("futonic_profile", Buffer.from(JSON.stringify({ ...parsed.data, phone, activationToken })).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  if (userId) response.cookies.set("futonic_user_id", userId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
