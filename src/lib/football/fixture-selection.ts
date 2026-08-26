import type { AgendaItem } from "@/lib/types";

export function selectNextFixtures(fixtures: AgendaItem[], limit = 3, now = new Date()) {
  const seen = new Set<string>();

  return fixtures
    .filter((fixture) => {
      const startsAt = new Date(fixture.startsAt);
      return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= now.getTime();
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .filter((fixture) => {
      const key = fixture.externalFixtureId || fixture.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
