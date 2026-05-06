import { materializeOccurrences } from "@dateline/recurring";
import { calendarCacheKey, iCalCacheKey, indexCacheKeyForEvents, readCachedResponse, writeCachedResponse } from "./cache.js";
import { EVENTS_COLLECTION, ICAL_HEADERS, JSON_HEADERS } from "./constants.js";
import { boundaryError, DatelineCoreError } from "./errors.js";
import { renderICal } from "./ical.js";
import type { CoreContext, DatelineEvent, RouteInput } from "./types.js";

const DEFAULT_RANGE = "1970-01-01..2999-12-31";

export async function calendarFeed(input: RouteInput): Promise<Response> {
  const range = readRange(input.request);
  const cacheKey = calendarCacheKey(range);
  const cached = await readCachedResponse(input.ctx, cacheKey);
  if (cached) return jsonResponse(JSON.parse(cached));
  const events = await listEvents(input.ctx);
  const rangedEvents = await eventsInRange(events, parseRange(range));
  const body = JSON.stringify({ events: rangedEvents });
  await writeCachedResponse(input.ctx, cacheKey, body);
  await indexCacheKeyForEvents(input.ctx, { kind: "calendar", eventIds: rangedEvents.map(eventId), cacheKey });
  return new Response(body, { headers: JSON_HEADERS });
}

export async function iCalFeed(input: RouteInput): Promise<Response> {
  const range = readRange(input.request);
  const cacheKey = iCalCacheKey(range);
  const cached = await readCachedResponse(input.ctx, cacheKey);
  if (cached) return new Response(cached, { headers: ICAL_HEADERS });
  const events = await listEvents(input.ctx);
  const rangedEvents = await eventsInRange(events, parseRange(range));
  const body = renderICal(rangedEvents);
  await writeCachedResponse(input.ctx, cacheKey, body);
  await indexCacheKeyForEvents(input.ctx, { kind: "ical", eventIds: rangedEvents.map(eventId), cacheKey });
  return new Response(body, { headers: ICAL_HEADERS });
}

export async function listEvents(ctx: CoreContext): Promise<DatelineEvent[]> {
  try {
    const response = await ctx.content?.list(EVENTS_COLLECTION, { filter: { status: "published" } });
    return (response?.items ?? response?.entries ?? []) as DatelineEvent[];
  } catch (error) {
    throw boundaryError("ctx.content.list(dateline_events)", error);
  }
}

function readRange(request?: Request): string {
  if (!request) return DEFAULT_RANGE;
  return new URL(request.url).searchParams.get("range") ?? DEFAULT_RANGE;
}

function parseRange(range: string): { start: string; end: string } {
  const [start, end] = range.split("..");
  if (!start || !end) throw new DatelineCoreError("INVALID_RANGE", "Range must use YYYY-MM-DD..YYYY-MM-DD.");
  return { start: startOfDay(start), end: endOfDay(end) };
}

async function eventsInRange(events: DatelineEvent[], range: { start: string; end: string }): Promise<DatelineEvent[]> {
  const matches = await Promise.all(events.map(async (event) => ({ event, matches: await eventMatchesRange(event, range) })));
  return matches.filter((entry) => entry.matches).map((entry) => entry.event);
}

async function eventMatchesRange(event: DatelineEvent, range: { start: string; end: string }): Promise<boolean> {
  if (!event.recurrenceRule) return overlapsRange(event.startsAt, event.endsAt, range);
  const occurrences = await materializeOccurrences({ rule: event.recurrenceRule, dtstart: event.startsAt, tzid: event.timezone, range });
  // PRO-481: derive each occurrence's end from the event's duration. Using event.endsAt
  // for every occurrence anchors range filtering to the original series end.
  const durationMs = Math.max(0, (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) || 0);
  return occurrences.some((occurrence) => overlapsRange(occurrence.startsAt, addMillisIso(occurrence.startsAt, durationMs), range));
}

function overlapsRange(startsAt: string, endsAt: string, range: { start: string; end: string }): boolean {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return start <= new Date(range.end).getTime() && end >= new Date(range.start).getTime();
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}

function startOfDay(date: string): string {
  return date.includes("T") ? date : `${date}T00:00:00.000Z`;
}

function endOfDay(date: string): string {
  return date.includes("T") ? date : `${date}T23:59:59.999Z`;
}

function addMillisIso(isoStart: string, durationMs: number): string {
  return new Date(new Date(isoStart).getTime() + durationMs).toISOString();
}

function eventId(event: DatelineEvent): string {
  return event.id;
}
