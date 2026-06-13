import { ContentRepository } from "emdash";
import { getDb } from "emdash/runtime";

const PUBLISHED_STATUS = "published";

/** A Dateline importer event draft (camelCase) as produced by `@dateline/importer`. */
interface ImporterEventDraft {
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  allDay: boolean;
  locationType: string;
  organizers: string[];
  categories: string[];
  tags: string[];
  description?: unknown[];
  recurrenceRule?: string;
  recurrenceExceptions?: string[];
  venue?: string;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build the `ctx.content` surface the importer expects, backed by the live
 * EmDash content store. The importer route only calls `list` (dedup by
 * sourceId) and `create`, so we expose exactly those, translating the
 * importer's camelCase event draft into the snake_case shape the reference
 * site reads via `getEmDashCollection("dateline_events")`.
 */
export async function createImporterContentContext() {
  const db = await getDb();
  const content = new ContentRepository(db);
  return {
    content: {
      // The importer dedupes by sourceId via `list({ filter: { sourceId } })`. The
      // events collection has no `source_id` column, so we dedup on the deterministic
      // slug the importer derives from that same sourceId.
      list: (collection: string, options?: { filter?: { sourceId?: string } }) => listBySourceSlug(content, collection, options?.filter?.sourceId),
      create: (collection: string, draft: ImporterEventDraft) => content.create({ type: collection, slug: slugFor(draft), status: PUBLISHED_STATUS, data: toEventData(draft) }),
    },
    log: {
      warn: (message: string, metadata?: unknown) => console.warn(message, metadata),
    },
  };
}

async function listBySourceSlug(content: ContentRepository, collection: string, sourceId?: string): Promise<{ items: Array<{ id: string }> }> {
  if (!sourceId) return { items: [] };
  const existing = await content.findBySlug(collection, slugFromSourceId(sourceId));
  return { items: existing ? [{ id: existing.id }] : [] };
}

/**
 * Map the importer's camelCase draft onto the seed's snake_case event field
 * names. Only fields registered on the `dateline_events` collection are
 * written — unregistered draft fields (sourceId, recurrenceExceptions) have no
 * backing column and would fail the insert.
 */
function toEventData(draft: ImporterEventDraft): Record<string, unknown> {
  return {
    title: draft.title,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
    timezone: draft.timezone,
    all_day: draft.allDay,
    location_type: draft.locationType,
    organizers: draft.organizers,
    categories: draft.categories,
    tags: draft.tags,
    description: draft.description ?? [],
    recurrence_rule: draft.recurrenceRule,
    venue: draft.venue,
  };
}

function slugFor(draft: ImporterEventDraft): string {
  return slugFromSourceId(draft.sourceId);
}

function slugFromSourceId(sourceId: string): string {
  return sourceId.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
