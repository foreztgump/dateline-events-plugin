import { CACHE_TTL_SECONDS, EVENTS_COLLECTION } from "./constants.js";
import { boundaryError } from "./errors.js";
import type { CoreContext } from "./types.js";

const CALENDAR_CACHE_PREFIX = "calendar-feed";
const ICAL_CACHE_PREFIX = "ical-feed";

export async function invalidateEventCaches(ctx: CoreContext, eventId: string): Promise<void> {
  await deleteCacheKey(ctx, `${CALENDAR_CACHE_PREFIX}:${eventId}`);
  await deleteCacheKey(ctx, `${ICAL_CACHE_PREFIX}:${eventId}`);
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

async function deleteCacheKey(ctx: CoreContext, key: string): Promise<void> {
  if (!ctx.kv?.delete) return;
  try {
    await ctx.kv.delete(key);
  } catch (error) {
    throw boundaryError("ctx.kv.delete", error);
  }
}
