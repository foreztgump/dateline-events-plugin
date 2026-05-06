import { CACHE_TTL_SECONDS, EVENTS_COLLECTION } from "./constants.js";
import { boundaryError } from "./errors.js";
import type { CoreContext } from "./types.js";

const ICAL_CACHE_PREFIX = "ical-feed";
const INDEX_PREFIX = "event-cache-index";
// PRO-480: KV value bound. 1000 entries × ~100 chars stays well within KV's 25 MB limit
// and prevents unbounded growth of the inverted index list.
const MAX_INDEX_ENTRIES = 1000;

export type CacheKind = "calendar" | "ical";

export async function invalidateEventCaches(ctx: CoreContext, eventId: string): Promise<void> {
  await Promise.all([
    invalidateByIndex(ctx, "calendar", eventId),
    invalidateByIndex(ctx, "ical", eventId),
  ]);
}

export async function readCachedResponse(ctx: CoreContext, key: string): Promise<string | null> {
  if (!ctx.kv?.get) return null;
  try {
    return await ctx.kv.get(key);
  } catch (error) {
    throw boundaryError("ctx.kv.get", error);
  }
}

export async function writeCachedResponse(ctx: CoreContext, key: string, value: string): Promise<void> {
  if (!ctx.kv?.put) return;
  try {
    await ctx.kv.put(key, value, { expirationTtl: CACHE_TTL_SECONDS });
  } catch (error) {
    throw boundaryError("ctx.kv.put", error);
  }
}

export function calendarCacheKey(range: string): string {
  return `${EVENTS_COLLECTION}:calendar:${range}`;
}

export function iCalCacheKey(range: string): string {
  return `${ICAL_CACHE_PREFIX}:${range}`;
}

export interface IndexCacheKeyForEventsInput {
  kind: CacheKind;
  eventIds: string[];
  cacheKey: string;
}

export async function indexCacheKeyForEvents(ctx: CoreContext, input: IndexCacheKeyForEventsInput): Promise<void> {
  // PRO-480: maintain an inverted index per event so invalidation can find every
  // range cache entry that contains this event. Range-keyed cache entries would
  // otherwise leak past mutation of any contained event.
  await Promise.all(
    input.eventIds.map((eventId) => appendToIndex(ctx, indexKey(input.kind, eventId), input.cacheKey)),
  );
}

async function invalidateByIndex(ctx: CoreContext, kind: CacheKind, eventId: string): Promise<void> {
  const key = indexKey(kind, eventId);
  const cacheKeys = await readIndex(ctx, key);
  await Promise.all(cacheKeys.map((cacheKey) => deleteCacheKey(ctx, cacheKey)));
  await deleteCacheKey(ctx, key);
}

async function appendToIndex(ctx: CoreContext, indexKeyName: string, cacheKey: string): Promise<void> {
  const existing = await readIndex(ctx, indexKeyName);
  if (existing.includes(cacheKey)) return;
  const updated = [...existing, cacheKey].slice(-MAX_INDEX_ENTRIES);
  await writeCachedResponse(ctx, indexKeyName, JSON.stringify(updated));
}

async function readIndex(ctx: CoreContext, indexKeyName: string): Promise<string[]> {
  const raw = await readCachedResponse(ctx, indexKeyName);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function indexKey(kind: CacheKind, eventId: string): string {
  return `${INDEX_PREFIX}:${kind}:${eventId}`;
}

async function deleteCacheKey(ctx: CoreContext, key: string): Promise<void> {
  if (!ctx.kv?.delete) return;
  try {
    await ctx.kv.delete(key);
  } catch (error) {
    throw boundaryError("ctx.kv.delete", error);
  }
}
