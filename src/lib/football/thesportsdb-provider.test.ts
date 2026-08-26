import { afterEach, describe, expect, it, vi } from "vitest";
import { getTheSportsDbFixtures, searchTheSportsDb } from "./thesportsdb-provider";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TheSportsDB provider", () => {
  it("maps club search responses and puts the public key in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ teams: [{ idTeam: "133604", strTeam: "Arsenal", strTeamShort: "ARS", strCountry: "England", strLeague: "English Premier League", strBadge: "badge.png" }] })));
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchTheSportsDb("Arsenal", "club");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/123/searchteams.php?t=Arsenal");
    expect(results[0]).toMatchObject({ provider: "thesportsdb", teamId: "133604", name: "Arsenal", crest: "ARS", image: "badge.png" });
  });

  it("maps a player's team so their fixtures can populate the agenda", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ player: [{ idPlayer: "34146220", idTeam: "133664", strPlayer: "Harry Kane", strTeam: "Bayern Munich", strNationality: "England", strPosition: "Centre-Forward" }] }))));

    const results = await searchTheSportsDb("Harry Kane", "player");

    expect(results[0]).toMatchObject({ externalId: "34146220", teamId: "133664", club: "Bayern Munich" });
  });

  it("maps upcoming events into agenda fixtures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ teams: [{ idTeam: "133604", idLeague: "4328", strTeam: "Arsenal" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ events: [{ idEvent: "2494000", strSeason: "2099-2100", strTimestamp: "2099-08-21T19:00:00", strEvent: "Arsenal vs Coventry City", idHomeTeam: "133604", strHomeTeam: "Arsenal", strAwayTeam: "Coventry City", strLeague: "English Premier League", strVenue: "Emirates Stadium", intRound: "1", strStatus: "NS" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ events: [
        { idEvent: "2494000", strTimestamp: "2099-08-21T19:00:00", idHomeTeam: "133604", strHomeTeam: "Arsenal", strAwayTeam: "Coventry City" },
        { idEvent: "2494001", strTimestamp: "2099-08-24T19:00:00", idAwayTeam: "133604", strHomeTeam: "Liverpool", strAwayTeam: "Arsenal" },
      ] })))
      .mockResolvedValue(new Response(JSON.stringify({ events: [
        { idEvent: "2494002", strTimestamp: "2099-08-31T19:00:00", idHomeTeam: "133604", strHomeTeam: "Arsenal", strAwayTeam: "Chelsea" },
      ] })));
    vi.stubGlobal("fetch", fetchMock);

    const fixtures = await getTheSportsDbFixtures("133604", "Test Player");

    expect(fixtures).toHaveLength(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain("eventsseason.php?id=4328&s=2099-2100");
    expect(fixtures[0]).toMatchObject({ externalFixtureId: "2494000", selectedPlayer: "Test Player", startsAt: "2099-08-21T19:00:00Z", round: "Round 1" });
    expect(fixtures[1]).toMatchObject({ externalFixtureId: "2494001", title: "Liverpool vs Arsenal" });
    expect(fixtures[2]).toMatchObject({ externalFixtureId: "2494002", title: "Arsenal vs Chelsea" });
  });
});
