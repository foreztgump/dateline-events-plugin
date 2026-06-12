import { DEFERRED_STATUS_COMPLETED, DEFERRED_STATUS_FAILED, DEFERRED_STATUS_PENDING, MAX_REMOTE_SUBREQUESTS } from "./constants.js";
import { parseCsv } from "./csv.js";
import { csvMapping } from "./csv-mapping.js";
import { fetchRemoteFeed } from "./fetch.js";
import { parseICal } from "./ical.js";
import { importRows } from "./importer.js";
import { parseJsonEvents } from "./json.js";
import { migrateTecExport } from "./tec.js";
import type { DeferredRemoteFeedRecord, ImportError, ImportFormat, ImportParseResult, ImporterContext, StorageCollection, StoragePage } from "./types.js";

const DEFERRED_ID_PREFIX = "deferred:";
/** EmDash storage key size limits are undocumented; cap the URL-derived suffix so very long feed URLs cannot exceed backend key limits. Uniqueness is guaranteed by the UUID component, not the URL. */
const MAX_DEFERRED_KEY_URL_CHARS = 200;
/** Listing the pending queue costs one `storage.query` per tick; reserve it so drains never exceed Cloudflare's hard limit. */
const SUBREQUESTS_PER_QUEUE_LISTING = 1;
/** Per-tick subrequest budget left for feed work after the queue listing. */
const SUBREQUEST_BUDGET_PER_TICK = MAX_REMOTE_SUBREQUESTS - SUBREQUESTS_PER_QUEUE_LISTING;
/** A row import costs at most a dedup `content.list` plus a `content.create`; budget conservatively so a chunk never overruns. */
const SUBREQUESTS_PER_ROW = 2;
/** Re-fetching a deferred feed each tick costs one subrequest. */
const SUBREQUESTS_PER_FEED_FETCH = 1;
/** Persisting drain progress (status / importedRows offset) costs one `storage.put`. */
const SUBREQUESTS_PER_FEED_PERSIST = 1;
/** Cheapest meaningful unit of work on a new feed: fetch it, import one row, persist progress. */
const MIN_FEED_SUBREQUESTS = SUBREQUESTS_PER_FEED_FETCH + SUBREQUESTS_PER_ROW + SUBREQUESTS_PER_FEED_PERSIST;

interface DeferredFeedInput {
  ctx: ImporterContext;
  format: ImportFormat;
  urls: string[];
  payload: unknown;
}

interface DeferredImportInput {
  ctx: ImporterContext;
  collection: StorageCollection;
  entry: { id: string; data: DeferredRemoteFeedRecord };
  text: string;
  rowBudget: number;
}

export async function enqueueDeferredRemoteFeeds(input: DeferredFeedInput): Promise<void> {
  const { ctx, format, urls, payload } = input;
  if (urls.length === 0) return;
  const collection = requireImportsStorage(ctx);
  await Promise.all(urls.map((url, index) => collection.put(deferredKey(format, url, index), deferredRecord(format, url, payload))));
}

export async function drainDeferredRemoteFeeds(ctx: ImporterContext): Promise<void> {
  const collection = requireImportsStorage(ctx);
  const pendingFeeds = await listPendingFeeds(collection);
  let remainingBudget = SUBREQUEST_BUDGET_PER_TICK;
  for (const entry of pendingFeeds) {
    if (remainingBudget < MIN_FEED_SUBREQUESTS) break;
    remainingBudget -= await drainDeferredFeed({ ctx, collection, entry, budget: remainingBudget });
  }
}

interface DrainFeedInput {
  ctx: ImporterContext;
  collection: StorageCollection;
  entry: { id: string; data: DeferredRemoteFeedRecord };
  budget: number;
}

/** Drain one feed within `budget` subrequests, resuming from its `importedRows` offset. Returns the subrequests actually consumed. */
async function drainDeferredFeed(input: DrainFeedInput): Promise<number> {
  const { ctx, collection, entry, budget } = input;
  const fetchedFeed = await fetchPendingFeed(ctx, entry.data.url);
  if (fetchedFeed.error) {
    await collection.put(entry.id, { ...entry.data, status: DEFERRED_STATUS_FAILED, lastError: fetchedFeed.error });
    return SUBREQUESTS_PER_FEED_FETCH + SUBREQUESTS_PER_FEED_PERSIST;
  }
  const rowsConsumed = await finishDeferredImport({ ctx, collection, entry, text: fetchedFeed.text ?? "", rowBudget: feedRowBudget(budget) });
  return SUBREQUESTS_PER_FEED_FETCH + rowsConsumed * SUBREQUESTS_PER_ROW + SUBREQUESTS_PER_FEED_PERSIST;
}

/** Rows importable this tick after reserving the fetch + persist subrequests; always ≥1 because the caller guards on MIN_FEED_SUBREQUESTS. */
function feedRowBudget(budget: number): number {
  return Math.max(1, Math.floor((budget - SUBREQUESTS_PER_FEED_FETCH - SUBREQUESTS_PER_FEED_PERSIST) / SUBREQUESTS_PER_ROW));
}

/** Import up to `rowBudget` rows starting at the record's offset; persists progress and returns the number of rows imported this tick. */
async function finishDeferredImport(input: DeferredImportInput): Promise<number> {
  const { ctx, collection, entry, text, rowBudget } = input;
  try {
    const parsedFeed = parseDeferredFeed(entry.data, text);
    const alreadyImported = entry.data.importedRows ?? 0;
    const rowChunk = parsedFeed.rows.slice(alreadyImported, alreadyImported + rowBudget);
    const summary = await importRows(rowChunk, ctx);
    const importedRows = alreadyImported + rowChunk.length;
    const completed = importedRows >= parsedFeed.rows.length;
    const errors = [...parsedFeed.errors, ...summary.errors];
    await collection.put(entry.id, {
      ...entry.data,
      importedRows,
      status: completed ? DEFERRED_STATUS_COMPLETED : DEFERRED_STATUS_PENDING,
      lastError: completed ? errorSummary(errors) : undefined,
    });
    return rowChunk.length;
  } catch (error) {
    await collection.put(entry.id, { ...entry.data, status: DEFERRED_STATUS_FAILED, lastError: String(error) });
    return 0;
  }
}

async function fetchPendingFeed(ctx: ImporterContext, url: string): Promise<{ text?: string; error?: string }> {
  if (!ctx.http) return { error: "Error: Remote feed request failed: Importer requires ctx.http for remote feed URLs." };
  return fetchRemoteFeed(url, ctx.http.fetch);
}

async function listPendingFeeds(collection: StorageCollection): Promise<Array<{ id: string; data: DeferredRemoteFeedRecord }>> {
  const page = await collection.query({ where: { kind: "deferredRemoteFeed", status: "pending" } });
  return pageEntries(page)
    .filter((entry): entry is { id: string; data: DeferredRemoteFeedRecord } => isPendingDeferredRecord(entry.data))
    .sort((left, right) => left.data.createdAt.localeCompare(right.data.createdAt) || left.id.localeCompare(right.id));
}

function parseDeferredFeed(record: DeferredRemoteFeedRecord, text: string): ImportParseResult {
  if (record.format === "ical") return parseICal(text);
  if (record.format === "csv") return parseCsv(text, csvMapping(record.payload));
  if (record.format === "tec") return parseTecDeferredFeed(record, text);
  return parseJsonEvents(text);
}

function parseTecDeferredFeed(record: DeferredRemoteFeedRecord, text: string): ImportParseResult {
  try {
    return migrateTecExport(JSON.parse(text));
  } catch (error) {
    return { rows: [], errors: [{ row: 1, sourceId: `remote:${record.url}`, message: String(error) }] };
  }
}

function requireImportsStorage(ctx: ImporterContext): StorageCollection {
  if (!ctx.storage?.imports) throw new Error("ctx.storage.imports is required for deferred importer feeds.");
  return ctx.storage.imports;
}

function pageEntries(page: StoragePage): Array<{ id: string; data: unknown }> {
  return page.items ?? page.entries ?? [];
}

function deferredRecord(format: ImportFormat, url: string, payload: unknown): DeferredRemoteFeedRecord {
  return { kind: "deferredRemoteFeed", status: DEFERRED_STATUS_PENDING, format, url, payload, createdAt: new Date().toISOString() };
}

function deferredKey(format: ImportFormat, url: string, index: number): string {
  const urlSuffix = encodeURIComponent(url).slice(0, MAX_DEFERRED_KEY_URL_CHARS);
  return `${DEFERRED_ID_PREFIX}${format}:${Date.now()}:${index}:${crypto.randomUUID()}:${urlSuffix}`;
}

function errorSummary(errors: ImportError[]): string | undefined {
  if (errors.length === 0) return undefined;
  return errors.map((error) => `${error.sourceId}: ${error.message}`).join("; ");
}

function isPendingDeferredRecord(value: unknown): value is DeferredRemoteFeedRecord {
  return isRecord(value) && value.kind === "deferredRemoteFeed" && value.status === DEFERRED_STATUS_PENDING && typeof value.url === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
