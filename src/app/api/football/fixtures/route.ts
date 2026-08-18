import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiFootballFixtures } from "@/lib/football/api-football-provider";
import { fixtureFor, footballEntities } from "@/lib/demo-data";

const schema = z.object({ teamId: z.string().min(1), playerName: z.string().max(100).optional() });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({ teamId: url.searchParams.get("teamId"), playerName: url.searchParams.get("playerName") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "A valid club is required." }, { status: 400 });
  try {
    const live = Boolean(process.env.FOOTBALL_API_KEY) && process.env.FOOTBALL_API_PROVIDER !== "demo";
    if (live) return NextResponse.json({ provider: "api-football", fixtures: await getApiFootballFixtures(parsed.data.teamId, parsed.data.playerName) });
    const entity = footballEntities.find((item) => item.id === parsed.data.teamId || item.id.endsWith(parsed.data.teamId));
    return NextResponse.json({ provider: "demo", fixtures: entity ? [{ ...fixtureFor(entity), selectedPlayer: parsed.data.playerName }] : [] });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("rate limit") ? "Daily football API limit reached. Try again later." : "Upcoming fixtures could not be loaded.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
