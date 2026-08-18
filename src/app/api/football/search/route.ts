import { NextResponse } from "next/server";
import { z } from "zod";
import { demoFootballProvider } from "@/lib/football/demo-provider";
const schema=z.object({q:z.string().trim().min(2).max(80),type:z.enum(["club","player"])});
export async function GET(request:Request){const url=new URL(request.url);const parsed=schema.safeParse({q:url.searchParams.get("q"),type:url.searchParams.get("type")});if(!parsed.success)return NextResponse.json({error:"Enter at least two characters."},{status:400});try{const results=parsed.data.type==="club"?await demoFootballProvider.searchClubs(parsed.data.q):await demoFootballProvider.searchPlayers(parsed.data.q);return NextResponse.json({provider:process.env.FOOTBALL_API_PROVIDER||"demo",results});}catch{return NextResponse.json({error:"Football data is temporarily unavailable."},{status:503})}}
