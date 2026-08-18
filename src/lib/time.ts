import { addDays, addWeeks, differenceInMinutes, endOfWeek, format, startOfWeek } from "date-fns";
import type { AgendaItem } from "./types";

export const DEFAULT_TIMEZONE = "Asia/Baku";

export function weekBounds(anchor: Date) {
  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  };
}

export function moveWeek(anchor: Date, direction: -1 | 1) {
  return addWeeks(anchor, direction);
}

export function getTimingState(item: AgendaItem, now = new Date()) {
  if (item.status === "Completed" || item.status === "Cancelled") return { kind: "safe" as const, label: "" };
  const minutes = differenceInMinutes(new Date(item.startsAt), now);
  if (minutes < 0) return { kind: "overdue" as const, label: "Overdue" };
  if (minutes <= 48 * 60) {
    if (minutes < 60) return { kind: "warning" as const, label: `${Math.max(1, minutes)}m remaining` };
    return { kind: "warning" as const, label: `${Math.ceil(minutes / 60)}h remaining` };
  }
  return { kind: "safe" as const, label: "" };
}

export function getWeekDays(anchor: Date) {
  const { start } = weekBounds(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function weekLabel(anchor: Date) {
  const { start, end } = weekBounds(anchor);
  return `${format(start, "MMM d")} — ${format(end, "MMM d, yyyy")}`;
}
