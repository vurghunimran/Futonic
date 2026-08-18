import { addHours, addDays, setHours, startOfDay, subHours } from "date-fns";
import type { AgendaItem, FootballEntity } from "./types";

const at = (day: Date, hour: number, minute = 0) => setHours(startOfDay(day), hour) .setMinutes(minute);
const iso = (value: number | Date) => new Date(value).toISOString();

export function demoAgenda(now = new Date()): AgendaItem[] {
  return [
    { id: "fx-1", kind: "fixture", title: "Champions League matchday", selectedPlayer: "Vinícius Júnior", startsAt: iso(addHours(now, 28)), deadlineAt: iso(addHours(now, 12)), home: "Real Madrid", away: "Manchester City", homeCode: "RMA", awayCode: "MCI", competition: "UEFA Champions League", venue: "Santiago Bernabéu · Madrid", round: "Quarter-final", worker: "Imran M.", status: "In Progress", priority: "Urgent", notified: true, notes: "Create main match poster plus starting XI story format." },
    { id: "fx-2", kind: "fixture", title: "Premier League matchday", selectedPlayer: "Bukayo Saka", startsAt: iso(at(addDays(now, 2), 19, 30)), home: "Arsenal", away: "Liverpool", homeCode: "ARS", awayCode: "LIV", competition: "Premier League", venue: "Emirates Stadium · London", round: "Matchweek 31", worker: "Aydin K.", status: "Assigned", priority: "High" },
    { id: "fx-3", kind: "fixture", title: "La Liga matchday", selectedPlayer: "Lamine Yamal", startsAt: iso(at(addDays(now, 4), 23)), home: "Barcelona", away: "Sevilla", homeCode: "BAR", awayCode: "SEV", competition: "La Liga", venue: "Spotify Camp Nou · Barcelona", status: "Ready for Review", priority: "Medium", worker: "Imran M." },
    { id: "fx-4", kind: "fixture", title: "Serie A matchday", selectedPlayer: "Rafael Leão", startsAt: iso(subHours(now, 5)), home: "AC Milan", away: "Inter", homeCode: "MIL", awayCode: "INT", competition: "Serie A", venue: "San Siro · Milan", status: "Assigned", priority: "High", worker: "Imran M." },
    { id: "manual-1", kind: "manual", title: "Futonic brand carousel", startsAt: iso(at(addDays(now, 1), 15)), deadlineAt: iso(at(addDays(now, 1), 12)), competition: "Social content", status: "In Progress", priority: "Medium", worker: "Aydin K.", notes: "Five-slide Instagram carousel." },
    { id: "fx-5", kind: "fixture", title: "Europa League matchday", selectedPlayer: "Youssef En-Nesyri", startsAt: iso(at(addDays(now, 5), 20, 45)), home: "Fenerbahçe", away: "Roma", homeCode: "FB", awayCode: "ROM", competition: "UEFA Europa League", venue: "Şükrü Saracoğlu · Istanbul", status: "Completed", priority: "Low", worker: "Imran M." },
  ];
}

export const footballEntities: FootballEntity[] = [
  { id: "club-real", type: "club", name: "Real Madrid", subtitle: "Spain · La Liga", crest: "RMA" },
  { id: "club-arsenal", type: "club", name: "Arsenal", subtitle: "England · Premier League", crest: "ARS" },
  { id: "club-barca", type: "club", name: "FC Barcelona", subtitle: "Spain · La Liga", crest: "BAR" },
  { id: "club-city", type: "club", name: "Manchester City", subtitle: "England · Premier League", crest: "MCI" },
  { id: "player-vini", type: "player", name: "Vinícius Júnior", subtitle: "Brazil · Forward", club: "Real Madrid", crest: "VJ" },
  { id: "player-saka", type: "player", name: "Bukayo Saka", subtitle: "England · Forward", club: "Arsenal", crest: "BS" },
  { id: "player-yamal", type: "player", name: "Lamine Yamal", subtitle: "Spain · Forward", club: "FC Barcelona", crest: "LY" },
];

export function fixtureFor(entity: FootballEntity): AgendaItem {
  const home = entity.type === "player" ? entity.club! : entity.name;
  return { id: `search-${entity.id}`, kind: "fixture", title: entity.type === "player" ? `${entity.name} · club fixture` : "Upcoming fixture", selectedPlayer: entity.type === "player" ? entity.name : "Featured player", startsAt: addDays(new Date(), 6).toISOString(), home, away: "Borussia Dortmund", homeCode: entity.crest, awayCode: "BVB", competition: "UEFA Champions League", venue: "National Stadium", round: "League phase", status: "Unassigned", priority: "Medium", notes: entity.type === "player" ? `Fixture is based on ${entity.name}'s current club, not guaranteed participation.` : undefined };
}
