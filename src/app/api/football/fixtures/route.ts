import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { getApiFootballFixtures } from "@/lib/football/api-football-provider";
import { getTheSportsDbFixtures } from "@/lib/football/thesportsdb-provider";
import { selectNextFixtures } from "@/lib/football/fixture-selection";
import { fixtureFor, footballEntities } from "@/lib/demo-data";

const schema = z.object({ teamId: z.string().min(1), playerName: z.string().max(100).optional() });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({ teamId: url.searchParams.get("teamId"), playerName: url.searchParams.get("playerName") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "A valid club is required." }, { status: 400 });
  try {
    const provider = process.env.FOOTBALL_API_PROVIDER?.toLowerCase();
    if (provider === "thesportsdb") return NextResponse.json({ provider, fixtures: selectNextFixtures(await getTheSportsDbFixtures(parsed.data.teamId, parsed.data.playerName)) });
    const live = Boolean(process.env.FOOTBALL_API_KEY) && provider !== "demo";
    if (live) return NextResponse.json({ provider: "api-football", fixtures: selectNextFixtures(await getApiFootballFixtures(parsed.data.teamId, parsed.data.playerName)) });
    const entity = footballEntities.find((item) => item.id === parsed.data.teamId || item.id.endsWith(parsed.data.teamId));
    const seed = entity ? fixtureFor(entity) : undefined;
    const fixtures = seed ? [0, 7, 14].map((offset, index) => ({
      ...seed,
      id: `${seed.id}-${index + 1}`,
      externalFixtureId: `${seed.id}-${index + 1}`,
      startsAt: addDays(new Date(seed.startsAt), offset).toISOString(),
      selectedPlayer: parsed.data.playerName,
    })) : [];
    return NextResponse.json({ provider: "demo", fixtures: selectNextFixtures(fixtures) });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("rate limit") ? "Daily football API limit reached. Try again later." : "Upcoming fixtures could not be loaded.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
