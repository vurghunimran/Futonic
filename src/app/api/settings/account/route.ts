import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.union([z.literal(""), z.string().min(8).max(128)]).optional(),
});

export async function POST(request: Request) {
  const session = request.headers.get("cookie")?.includes("futonic_session=admin");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the phone number and password." }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("futonic_account_settings", Buffer.from(JSON.stringify({ phone: parsed.data.phone.replace(/[^+\d]/g, ""), passwordChanged: Boolean(parsed.data.newPassword) })).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
