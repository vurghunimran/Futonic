import type { AgendaItem } from "@/lib/types";

export function selectFixturesWithinDays(fixtures: AgendaItem[], days = 10, now = new Date()) {
  const seen = new Set<string>();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + days);

  return fixtures
    .filter((fixture) => {
      const startsAt = new Date(fixture.startsAt);
      return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= now.getTime() && startsAt.getTime() <= windowEnd.getTime();
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .filter((fixture) => {
      const key = fixture.externalFixtureId || fixture.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
