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
  await Promise.all(pendingFeeds.slice(0, MAX_REMOTE_SUBREQUESTS).map((entry) => drainDeferredFeed(ctx, collection, entry)));
}

async function drainDeferredFeed(ctx: ImporterContext, collection: StorageCollection, entry: { id: string; data: DeferredRemoteFeedRecord }): Promise<void> {
  const fetchedFeed = await fetchPendingFeed(ctx, entry.data.url);
  if (fetchedFeed.error) {
    await collection.put(entry.id, { ...entry.data, status: DEFERRED_STATUS_FAILED, lastError: fetchedFeed.error });
    return;
  }
  await finishDeferredImport({ ctx, collection, entry, text: fetchedFeed.text ?? "" });
}

async function finishDeferredImport(input: DeferredImportInput): Promise<void> {
  const { ctx, collection, entry, text } = input;
  try {
    const parsedFeed = parseDeferredFeed(entry.data, text);
    const summary = await importRows(parsedFeed.rows, ctx);
    const errors = [...parsedFeed.errors, ...summary.errors];
    await collection.put(entry.id, { ...entry.data, status: DEFERRED_STATUS_COMPLETED, lastError: errorSummary(errors) });
  } catch (error) {
    await collection.put(entry.id, { ...entry.data, status: DEFERRED_STATUS_FAILED, lastError: String(error) });
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
  return `${DEFERRED_ID_PREFIX}${format}:${Date.now()}:${index}:${crypto.randomUUID()}:${encodeURIComponent(url)}`;
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
