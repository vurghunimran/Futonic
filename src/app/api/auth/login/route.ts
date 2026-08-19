import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseConfigured, prisma } from "@/lib/prisma";
import { normalizePhone, phoneLookupValues } from "@/lib/phone";

const schema = z.object({ phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid telephone number." }, { status: 400 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Account database is not configured. Add DATABASE_URL in Vercel and redeploy." }, { status: 503 });
  let phone: string;
  try { phone = normalizePhone(parsed.data.phone); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  let user;
  try {
    user = await prisma.user.findFirst({ where: { phone: { in: phoneLookupValues(parsed.data.phone) } } });
    if (user && user.phone !== phone) user = await prisma.user.update({ where: { id: user.id }, data: { phone } });
  } catch (error) {
    console.error("Sign-in database error", error);
    return NextResponse.json({ error: "The account database is unavailable. Check DATABASE_URL and apply the Prisma schema." }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "This telephone number is not registered. Create an account first." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("futonic_session", "admin", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  response.cookies.set("futonic_user_id", user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}
