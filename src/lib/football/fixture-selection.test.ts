import { describe, expect, it } from "vitest";
import type { AgendaItem } from "@/lib/types";
import { selectFixturesWithinDays } from "./fixture-selection";

const fixture = (id: string, startsAt: string, externalFixtureId?: string): AgendaItem => ({
  id,
  externalFixtureId,
  kind: "fixture",
  title: id,
  startsAt,
  status: "Unassigned",
  priority: "Medium",
});

describe("selectFixturesWithinDays", () => {
  it("returns every unique fixture in the next ten days in chronological order", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    const fixtures = [
      fixture("outside-window", "2026-09-20T18:00:00.000Z"),
      fixture("past", "2026-08-25T18:00:00.000Z"),
      fixture("second", "2026-09-02T18:00:00.000Z", "event-2"),
      fixture("first", "2026-08-29T18:00:00.000Z"),
      fixture("duplicate", "2026-09-02T18:00:00.000Z", "event-2"),
      fixture("third", "2026-09-04T18:00:00.000Z"),
    ];

    expect(selectFixturesWithinDays(fixtures, 10, now).map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
