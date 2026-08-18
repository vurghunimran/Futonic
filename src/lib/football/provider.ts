import type { FootballEntity, AgendaItem } from "../types";

export interface FootballProvider {
  searchClubs(query: string): Promise<FootballEntity[]>;
  searchPlayers(query: string): Promise<FootballEntity[]>;
  getClubFixtures(clubId: string, dateFrom: Date, dateTo: Date): Promise<AgendaItem[]>;
  getPlayerFixtures(playerId: string, dateFrom: Date, dateTo: Date): Promise<AgendaItem[]>;
  getFixtureDetails(fixtureId: string): Promise<AgendaItem | null>;
  syncSavedFixtures(): Promise<{ updated: number }>;
}
