import { footballEntities, fixtureFor } from "../demo-data";
import type { FootballProvider } from "./provider";

export const demoFootballProvider: FootballProvider = {
  async searchClubs(query) { return footballEntities.filter((item) => item.type === "club" && item.name.toLowerCase().includes(query.toLowerCase())); },
  async searchPlayers(query) { return footballEntities.filter((item) => item.type === "player" && item.name.toLowerCase().includes(query.toLowerCase())); },
  async getClubFixtures(clubId) { const entity = footballEntities.find((item) => item.id === clubId); return entity ? [fixtureFor(entity)] : []; },
  async getPlayerFixtures(playerId) { const entity = footballEntities.find((item) => item.id === playerId); return entity ? [fixtureFor(entity)] : []; },
  async getFixtureDetails() { return null; },
  async syncSavedFixtures() { return { updated: 0 }; },
};
