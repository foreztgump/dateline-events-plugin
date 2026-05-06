import type { DatelineEventDraft } from "./types.js";

const DEFAULT_STATUS = "published";
const DEFAULT_LOCATION_TYPE = "physical";

export function createEventDraft(input: {
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay?: boolean;
  description?: string;
  venue?: string;
  organizers?: string[];
  categories?: string[];
  tags?: string[];
  recurrenceRule?: string;
  recurrenceExceptions?: string[];
  customFields?: Record<string, unknown>;
}): DatelineEventDraft {
  return {
    sourceId: input.sourceId,
    title: input.title,
    startsAt: normalizeIsoDate(input.startsAt),
    endsAt: normalizeIsoDate(input.endsAt),
    timezone: input.timezone,
    status: DEFAULT_STATUS,
    allDay: input.allDay ?? false,
    locationType: DEFAULT_LOCATION_TYPE,
    organizers: input.organizers ?? [],
    categories: input.categories ?? [],
    tags: input.tags ?? [],
    description: input.description ? portableText(input.description) : [],
    recurrenceRule: input.recurrenceRule,
    recurrenceExceptions: input.recurrenceExceptions,
    venue: input.venue,
    customFields: input.customFields,
  };
}

export function normalizeIsoDate(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) throw new Error(`Invalid date ${value}.`);
  return new Date(timestamp).toISOString();
}

function portableText(text: string): unknown[] {
  return [{ _type: "block", children: [{ _type: "span", text }] }];
}
