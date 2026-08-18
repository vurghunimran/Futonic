import { NextResponse } from "next/server";
import { demoFootballProvider } from "@/lib/football/demo-provider";
export async function GET(request:Request){if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});const result=await demoFootballProvider.syncSavedFixtures();return NextResponse.json({ok:true,...result,processedAt:new Date().toISOString()})}
