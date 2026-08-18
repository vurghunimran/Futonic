import type { AgendaItem, FootballEntity } from "@/lib/types";

type ApiEnvelope<T> = { response: T[]; errors?: Record<string, string>; results: number };
type ApiTeam = { team: { id: number; name: string; code?: string; country?: string; logo?: string } };
type ApiPlayer = { player: { id: number; name: string; nationality?: string; photo?: string }; statistics?: Array<{ team?: { id: number; name: string; logo?: string }; games?: { position?: string } }> };
type ApiFixture = { fixture: { id: number; date: string; timezone: string; venue?: { name?: string; city?: string }; status: { long: string; short: string } }; league: { name: string; logo?: string; round?: string }; teams: { home: { id: number; name: string; logo?: string }; away: { id: number; name: string; logo?: string } } };

function season() {
  if (process.env.FOOTBALL_API_SEASON) return Number(process.env.FOOTBALL_API_SEASON);
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

async function request<T>(path: string, params: Record<string, string | number>) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY is not configured");
  const base = process.env.FOOTBALL_API_BASE_URL || "https://v3.football.api-sports.io";
  const url = new URL(path, `${base.replace(/\/$/, "")}/`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, String(value)));
  const response = await fetch(url, { headers: { "x-apisports-key": key }, next: { revalidate: 3600 } });
  if (response.status === 429) throw new Error("Football API rate limit reached");
  if (!response.ok) throw new Error(`Football API returned ${response.status}`);
  const data = await response.json() as ApiEnvelope<T>;
  if (data.errors && Object.keys(data.errors).length) throw new Error("Football API rejected the request");
  return data.response;
}

export async function searchApiFootball(query: string, type: "club" | "player"): Promise<FootballEntity[]> {
  if (type === "club") {
    const teams = await request<ApiTeam>("teams", { search: query });
    return teams.slice(0, 12).map(({ team }) => ({ id: `api-team-${team.id}`, externalId: String(team.id), teamId: String(team.id), provider: "api-football", type: "club", name: team.name, subtitle: team.country || "Football club", crest: team.code || team.name.slice(0, 3).toUpperCase(), image: team.logo }));
  }
  const players = await request<ApiPlayer>("players", { search: query, season: season() });
  return players.slice(0, 12).map(({ player, statistics }) => {
    const current = statistics?.find((entry) => entry.team?.id)?.team;
    const position = statistics?.find((entry) => entry.games?.position)?.games?.position;
    return { id: `api-player-${player.id}`, externalId: String(player.id), teamId: current?.id ? String(current.id) : undefined, provider: "api-football", type: "player", name: player.name, subtitle: [player.nationality, position].filter(Boolean).join(" · ") || "Football player", club: current?.name, crest: player.name.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase(), image: player.photo };
  });
}

export async function getApiFootballFixtures(teamId: string, selectedPlayer?: string): Promise<AgendaItem[]> {
  const fixtures = await request<ApiFixture>("fixtures", { team: teamId, next: 20, timezone: "Asia/Baku" });
  return fixtures.map((entry) => ({ id: `api-fixture-${entry.fixture.id}${selectedPlayer ? `-${selectedPlayer}` : ""}`, externalFixtureId: String(entry.fixture.id), kind: "fixture", title: `${entry.teams.home.name} vs ${entry.teams.away.name}`, startsAt: entry.fixture.date, home: entry.teams.home.name, away: entry.teams.away.name, homeCode: entry.teams.home.name.slice(0, 3).toUpperCase(), awayCode: entry.teams.away.name.slice(0, 3).toUpperCase(), homeLogo: entry.teams.home.logo, awayLogo: entry.teams.away.logo, competition: entry.league.name, competitionLogo: entry.league.logo, venue: [entry.fixture.venue?.name, entry.fixture.venue?.city].filter(Boolean).join(" · "), round: entry.league.round, fixtureStatus: entry.fixture.status.long, selectedPlayer, status: "Unassigned", priority: "Medium" }));
}
