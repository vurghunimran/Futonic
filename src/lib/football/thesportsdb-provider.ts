import type { AgendaItem, FootballEntity } from "@/lib/types";

type SportsDbTeam = {
  idTeam: string;
  idLeague?: string | null;
  idLeague2?: string | null;
  idLeague3?: string | null;
  idLeague4?: string | null;
  idLeague5?: string | null;
  idLeague6?: string | null;
  idLeague7?: string | null;
  strTeam: string;
  strTeamShort?: string | null;
  strCountry?: string | null;
  strLeague?: string | null;
  strBadge?: string | null;
  strTeamBadge?: string | null;
  strCurrentSeason?: string | null;
};

type SportsDbPlayer = {
  idPlayer: string;
  idTeam?: string | null;
  strPlayer: string;
  strTeam?: string | null;
  strNationality?: string | null;
  strPosition?: string | null;
  strThumb?: string | null;
};

type SportsDbEvent = {
  idEvent: string;
  idHomeTeam?: string | null;
  idAwayTeam?: string | null;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strEvent?: string | null;
  strSeason?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  strLeague?: string | null;
  strLeagueBadge?: string | null;
  strVenue?: string | null;
  strCity?: string | null;
  intRound?: string | null;
  strStatus?: string | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

async function request<T>(endpoint: string, params: Record<string, string>) {
  const key = process.env.FOOTBALL_API_KEY || "123";
  const base = process.env.FOOTBALL_API_BASE_URL || "https://www.thesportsdb.com/api/v1/json";
  const url = new URL(`${base.replace(/\/$/, "")}/${encodeURIComponent(key)}/${endpoint}`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (response.status === 429) throw new Error("Football API rate limit reached");
  if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`);
  return (await response.json()) as T;
}

export async function searchTheSportsDb(query: string, type: "club" | "player"): Promise<FootballEntity[]> {
  if (type === "club") {
    const data = await request<{ teams: SportsDbTeam[] | null }>("searchteams.php", { t: query });
    return (data.teams || [])
      .filter((team) => team.strTeam && team.idTeam)
      .slice(0, 12)
      .map((team) => ({
        id: `thesportsdb-team-${team.idTeam}`,
        externalId: team.idTeam,
        teamId: team.idTeam,
        provider: "thesportsdb",
        type: "club" as const,
        name: team.strTeam,
        subtitle: [team.strCountry, team.strLeague].filter(Boolean).join(" · ") || "Football club",
        crest: team.strTeamShort || initials(team.strTeam),
        image: team.strBadge || team.strTeamBadge || undefined,
      }));
  }

  const data = await request<{ player: SportsDbPlayer[] | null }>("searchplayers.php", { p: query });
  return (data.player || [])
    .filter((player) => player.strPlayer && player.idPlayer)
    .slice(0, 12)
    .map((player) => ({
      id: `thesportsdb-player-${player.idPlayer}`,
      externalId: player.idPlayer,
      teamId: player.idTeam || undefined,
      provider: "thesportsdb",
      type: "player" as const,
      name: player.strPlayer,
      subtitle: [player.strNationality, player.strPosition].filter(Boolean).join(" · ") || "Football player",
      club: player.strTeam || undefined,
      crest: initials(player.strPlayer),
      image: player.strThumb || undefined,
    }));
}

function eventStart(event: SportsDbEvent) {
  if (event.strTimestamp) return event.strTimestamp.endsWith("Z") ? event.strTimestamp : `${event.strTimestamp}Z`;
  return `${event.dateEvent || new Date().toISOString().slice(0, 10)}T${event.strTime || "00:00:00"}Z`;
}

export async function getTheSportsDbFixtures(teamId: string, selectedPlayer?: string): Promise<AgendaItem[]> {
  const teamData = await request<{ teams: SportsDbTeam[] | null }>("lookupteam.php", { id: teamId }).catch(() => ({ teams: null }));
  const team = teamData.teams?.[0];
  const upcomingData = await request<{ events: SportsDbEvent[] | null }>("eventsnext.php", { id: teamId });
  const leagueIds = team ? [team.idLeague, team.idLeague2, team.idLeague3, team.idLeague4, team.idLeague5, team.idLeague6, team.idLeague7].filter((id): id is string => Boolean(id)) : [];
  const now = new Date();
  const fallbackSeason = now.getUTCMonth() >= 6 ? `${now.getUTCFullYear()}-${now.getUTCFullYear() + 1}` : `${now.getUTCFullYear() - 1}-${now.getUTCFullYear()}`;
  const currentSeason = upcomingData.events?.find((event) => event.strSeason)?.strSeason || team?.strCurrentSeason || fallbackSeason;
  const seasonData = await Promise.all(leagueIds.map((id) => request<{ events: SportsDbEvent[] | null }>("eventsseason.php", { id, s: currentSeason }).catch(() => ({ events: null }))));
  const teamName = team?.strTeam?.toLowerCase();
  const seasonEvents = seasonData.flatMap((data) => data.events || []).filter((event) =>
    event.idHomeTeam === teamId || event.idAwayTeam === teamId ||
    (teamName && (event.strHomeTeam?.toLowerCase() === teamName || event.strAwayTeam?.toLowerCase() === teamName))
  );
  const events = [...(upcomingData.events || []), ...seasonEvents]
    .filter((event, index, all) => all.findIndex((candidate) => candidate.idEvent === event.idEvent) === index)
    .filter((event) => new Date(eventStart(event)).getTime() >= Date.now())
    .sort((a, b) => eventStart(a).localeCompare(eventStart(b)));
  return events.map((event) => {
    const home = event.strHomeTeam || "Home team";
    const away = event.strAwayTeam || "Away team";
    return {
      id: `thesportsdb-fixture-${event.idEvent}${selectedPlayer ? `-${selectedPlayer}` : ""}`,
      externalFixtureId: event.idEvent,
      kind: "fixture" as const,
      title: event.strEvent || `${home} vs ${away}`,
      startsAt: eventStart(event),
      home,
      away,
      homeCode: initials(home),
      awayCode: initials(away),
      homeLogo: event.strHomeTeamBadge || undefined,
      awayLogo: event.strAwayTeamBadge || undefined,
      competition: event.strLeague || "Football",
      competitionLogo: event.strLeagueBadge || undefined,
      venue: [event.strVenue, event.strCity].filter(Boolean).join(" · "),
      round: event.intRound ? `Round ${event.intRound}` : undefined,
      fixtureStatus: event.strStatus || undefined,
      selectedPlayer,
      status: "Unassigned" as const,
      priority: "Medium" as const,
    };
  });
}
