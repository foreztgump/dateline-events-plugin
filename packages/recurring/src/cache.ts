import { BASIC_DATE_PAD, CACHE_KEY_PREFIX, CACHE_TTL_SECONDS, HEX_RADIX } from "./constants.js";
import { errorMessage, extractRRuleLine } from "./rrule-utils.js";
import type { MaterializeOccurrencesInput, Occurrence, OccurrenceCache } from "./types.js";

declare const crypto: { subtle: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> } };
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

export async function readCachedOccurrences(cache: OccurrenceCache, cacheKey: string): Promise<Occurrence[] | null> {
  try {
    const cachedValue = await cache.get(cacheKey);
    return cachedValue ? parseCachedOccurrences(cachedValue) : null;
  } catch (error) {
    throw new Error(`Failed to read occurrence cache: ${errorMessage(error)}`);
  }
}

export async function writeCachedOccurrences(
  cache: OccurrenceCache,
  cacheKey: string,
  occurrences: Occurrence[],
): Promise<void> {
  try {
    await cache.put(cacheKey, JSON.stringify(occurrences), { expirationTtl: CACHE_TTL_SECONDS });
  } catch (error) {
    throw new Error(`Failed to write occurrence cache: ${errorMessage(error)}`);
  }
}

export async function createCacheKey(input: MaterializeOccurrencesInput): Promise<string> {
  const keyPayload = JSON.stringify({
    rule: input.rule,
    normalizedRule: extractRRuleLine(input.rule),
    dtstart: input.dtstart,
    tzid: input.tzid,
    range: input.range,
    exdates: input.exdates ?? [],
    rdates: input.rdates ?? [],
  });
  return `${CACHE_KEY_PREFIX}:${await sha256(keyPayload)}`;
}

async function sha256(value: string): Promise<string> {
  const encodedValue = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encodedValue);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(HEX_RADIX).padStart(BASIC_DATE_PAD, "0")).join("");
}

function parseCachedOccurrences(cachedValue: string): Occurrence[] | null {
  const parsedValue: unknown = JSON.parse(cachedValue);
  if (!Array.isArray(parsedValue)) return null;
  if (!parsedValue.every(isCachedOccurrence)) return null;
  return parsedValue;
}

function isCachedOccurrence(value: unknown): value is Occurrence {
  return typeof value === "object" && value !== null && "startsAt" in value && typeof value.startsAt === "string";
}
