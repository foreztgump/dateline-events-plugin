import { z } from "zod";
import { createEventDraft } from "./normalize.js";
import type { TecMigrationResult } from "./types.js";

const TecEventSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  timezone: z.string().min(1),
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
  venueId: z.string().optional(),
  organizerIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const TecExportSchema = z.object({
  events: z.array(z.unknown()),
  venues: z.array(z.record(z.string(), z.unknown())).optional(),
  organizers: z.array(z.record(z.string(), z.unknown())).optional(),
});

export function migrateTecExport(rawExport: unknown): TecMigrationResult {
  const tecExport = TecExportSchema.parse(rawExport);
  const parsedEvents = tecExport.events.map((eventCandidate, index) => parseTecEvent(eventCandidate, index + 1));
  return {
    rows: parsedEvents.flatMap((parsedEvent) => parsedEvent.row ? [parsedEvent.row] : []),
    errors: parsedEvents.flatMap((parsedEvent) => parsedEvent.error ? [parsedEvent.error] : []),
    venues: tecExport.venues ?? [],
    organizers: tecExport.organizers ?? [],
  };
}

function parseTecEvent(eventCandidate: unknown, rowNumber: number) {
  const parsedEvent = TecEventSchema.safeParse(eventCandidate);
  const sourceId = sourceIdFromCandidate(eventCandidate, rowNumber);
  if (!parsedEvent.success) return { error: { row: rowNumber, sourceId, message: parsedEvent.error.message } };
  return {
    row: {
      sourceId: parsedEvent.data.sourceId,
      event: createEventDraft({
        sourceId: parsedEvent.data.sourceId,
        title: parsedEvent.data.title,
        startsAt: parsedEvent.data.start,
        endsAt: parsedEvent.data.end,
        timezone: parsedEvent.data.timezone,
        allDay: parsedEvent.data.allDay,
        description: parsedEvent.data.description,
        recurrenceRule: parsedEvent.data.recurrence,
        venue: parsedEvent.data.venueId,
        organizers: parsedEvent.data.organizerIds,
        categories: parsedEvent.data.categories,
        tags: parsedEvent.data.tags,
        customFields: parsedEvent.data.customFields,
      }),
    },
  };
}

function sourceIdFromCandidate(eventCandidate: unknown, rowNumber: number): string {
  if (typeof eventCandidate !== "object" || eventCandidate === null) return `tec:${rowNumber}`;
  const sourceId = (eventCandidate as { sourceId?: unknown }).sourceId;
  return typeof sourceId === "string" ? sourceId : `tec:${rowNumber}`;
}
