import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, databaseErrorMessage, prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { hasAdminSession, sessionUserId } from "@/lib/session";

const schema = z.object({ phone: z.string().trim().min(8).max(24) });

function identity(request: Request) {
  if (!hasAdminSession(request)) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const userId = sessionUserId(request);
  if (!databaseConfigured() || !userId) return { error: NextResponse.json({ error: "Account session is not connected to the database. Sign out and sign in again." }, { status: 409 }) };
  return { userId };
}

export async function GET(request: Request) {
  const session = identity(request);
  if (session.error) return session.error;
  try {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, surname: true, phone: true, telegramActivatedAt: true } });
    if (!user) return NextResponse.json({ error: "Account not found. Sign out and register again." }, { status: 404 });
    return NextResponse.json({ ...user, telegramConnected: Boolean(user.telegramActivatedAt) });
  } catch (error) {
    return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = identity(request);
  if (session.error) return session.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid telephone number." }, { status: 400 });
  let phone: string;
  try { phone = normalizePhone(parsed.data.phone); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    const owner = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (owner && owner.id !== session.userId) return NextResponse.json({ error: "This telephone number belongs to another account." }, { status: 409 });
    const user = await prisma.user.update({ where: { id: session.userId }, data: { phone }, select: { phone: true } });
    return NextResponse.json({ ok: true, phone: user.phone });
  } catch (error) {
    return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503 });
  }
}
