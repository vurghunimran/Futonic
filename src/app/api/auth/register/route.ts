import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, databaseErrorMessage, prisma } from "@/lib/prisma";
import { normalizePhone, phoneLookupValues } from "@/lib/phone";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  surname: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, surname and telephone number." }, { status: 400 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Account database is not configured. Add DATABASE_URL in Vercel and redeploy." }, { status: 503 });
  let phone: string;
  try { phone = normalizePhone(parsed.data.phone); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const activationToken = randomBytes(18).toString("base64url");
  let userId: string;
  let accountCreated = false;
  try {
    const existing = await prisma.user.findFirst({ where: { phone: { in: phoneLookupValues(parsed.data.phone) } } });
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { phone, telegramActivationToken: activationToken } })
      : await prisma.user.create({ data: { name: parsed.data.name, surname: parsed.data.surname, phone, telegramActivationToken: activationToken } });
    accountCreated = !existing;
    userId = user.id;
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: { telegram: true, reminder48h: true },
      create: { userId: user.id, telegram: true, reminder48h: true },
    });
  } catch (error) {
    console.error("Registration database error", error);
    return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503 });
  }
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const telegramUrl = botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}?start=${activationToken}` : null;
  const response = NextResponse.json({ ok: true, accountCreated, telegramUrl, telegramConfigured: Boolean(botUsername) });
  response.cookies.set("futonic_session", "admin", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.cookies.set("futonic_profile", Buffer.from(JSON.stringify({ ...parsed.data, phone, activationToken })).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.cookies.set("futonic_user_id", userId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
