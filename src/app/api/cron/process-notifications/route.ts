import { NextResponse } from "next/server";
export async function GET(request:Request){if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({ok:true,eligible:0,sent:0,skippedDuplicates:0,processedAt:new Date().toISOString()})}
