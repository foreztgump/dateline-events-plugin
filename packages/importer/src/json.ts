import { z } from "zod";
import { createEventDraft } from "./normalize.js";
import type { ImportParseResult } from "./types.js";

const JsonEventSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1),
  recurrenceRule: z.string().optional(),
});

export function parseJsonEvents(jsonText: string): ImportParseResult {
  try {
    const rawEvents = z.array(JsonEventSchema).parse(JSON.parse(jsonText));
    return { rows: rawEvents.map((rawEvent) => ({ sourceId: rawEvent.sourceId, event: createEventDraft(rawEvent) })), errors: [] };
  } catch (error) {
    return { rows: [], errors: [{ row: 1, sourceId: "json:document", message: String(error) }] };
  }
}
