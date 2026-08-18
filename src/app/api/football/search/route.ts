import { NextResponse } from "next/server";
import { z } from "zod";
import { demoFootballProvider } from "@/lib/football/demo-provider";
import { searchApiFootball } from "@/lib/football/api-football-provider";
const schema=z.object({q:z.string().trim().min(3).max(80),type:z.enum(["club","player"])});
export async function GET(request:Request){const url=new URL(request.url);const parsed=schema.safeParse({q:url.searchParams.get("q"),type:url.searchParams.get("type")});if(!parsed.success)return NextResponse.json({error:"Enter at least three characters."},{status:400});try{const live=Boolean(process.env.FOOTBALL_API_KEY)&&process.env.FOOTBALL_API_PROVIDER!=="demo";const results=live?await searchApiFootball(parsed.data.q,parsed.data.type):parsed.data.type==="club"?await demoFootballProvider.searchClubs(parsed.data.q):await demoFootballProvider.searchPlayers(parsed.data.q);return NextResponse.json({provider:live?"api-football":"demo",results});}catch(error){const message=error instanceof Error&&error.message.includes("rate limit")?"Daily football API limit reached. Try again later.":"Football data is temporarily unavailable.";return NextResponse.json({error:message},{status:503})}}
