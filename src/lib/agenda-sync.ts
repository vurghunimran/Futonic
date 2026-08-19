import { z } from "zod";

const optionalText = (max: number) => z.preprocess((value) => value == null || value === "" ? undefined : value, z.string().max(max).optional());

export const agendaSyncItemSchema = z.object({
  id: z.preprocess((value) => typeof value === "number" ? String(value) : value, z.string().min(1).max(240)),
  kind: z.enum(["fixture", "manual"]).catch("manual"),
  title: z.string().trim().min(1).max(240),
  startsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid start time").transform((value) => new Date(value).toISOString()),
  status: z.enum(["Unassigned", "Assigned", "In Progress", "Ready for Review", "Completed", "Cancelled"]).catch("Unassigned"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).catch("Medium"),
  client: z.string().max(160).optional().default("No client"),
  competition: optionalText(160),
  home: optionalText(160),
  away: optionalText(160),
  selectedPlayer: optionalText(160),
  venue: optionalText(240),
});

export function parseAgendaSyncItems(body: unknown) {
  const envelope = z.object({ items: z.array(z.unknown()).max(1000) }).safeParse(body);
  if (!envelope.success) return { items: [], invalid: 0, error: "Agenda payload must contain an items list." };
  const results = envelope.data.items.map((item) => agendaSyncItemSchema.safeParse(item));
  const items = results.flatMap((result) => result.success ? [result.data] : []);
  const invalid = results.length - items.length;
  const firstInvalid = results.find((result) => !result.success);
  const detail = firstInvalid && !firstInvalid.success ? firstInvalid.error.issues[0]?.path.join(".") || "item" : null;
  return { items, invalid, error: invalid && !items.length ? `No valid agenda items were found. Check ${detail}.` : null };
}
