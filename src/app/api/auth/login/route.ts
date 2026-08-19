import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, prisma } from "@/lib/prisma";

const schema = z.object({ phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid telephone number." }, { status: 400 });
  const phone = parsed.data.phone.replace(/[^+\d]/g, "");
  const user = databaseConfigured() ? await prisma.user.findUnique({ where: { phone } }) : null;
  const demoPhone = (process.env.ADMIN_PHONE || "+994501234567").replace(/[^+\d]/g, "");
  if (!user && phone !== demoPhone) return NextResponse.json({ error: "This telephone number is not registered." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("futonic_session", "admin", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  if (user) response.cookies.set("futonic_user_id", user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
