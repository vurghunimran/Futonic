import { describe, expect, it } from "vitest";
import { parseAgendaSyncItems } from "./agenda-sync";

describe("agenda synchronization compatibility", () => {
  it("fills defaults for a legacy match", () => {
    const result = parseAgendaSyncItems({ items: [{ id: "old-1", title: "Home vs Away", startsAt: "2026-08-20T15:00:00Z", home: "Home", away: "Away" }] });
    expect(result.items[0]).toMatchObject({ kind: "manual", status: "Unassigned", priority: "Medium", client: "No client" });
  });

  it("accepts nullable provider fields", () => {
    const result = parseAgendaSyncItems({ items: [{ id: "fixture-1", kind: "fixture", title: "A vs B", startsAt: "2026-08-20 15:00:00", selectedPlayer: null, venue: null }] });
    expect(result.items).toHaveLength(1);
  });

  it("keeps valid cards when a legacy card is malformed", () => {
    const result = parseAgendaSyncItems({ items: [{ id: "bad" }, { id: "good", title: "A vs B", startsAt: "2026-08-20T15:00:00Z", home: "A", away: "B" }] });
    expect(result).toMatchObject({ invalid: 1, error: null });
    expect(result.items).toHaveLength(1);
  });
});
