import { validateRRule } from "@dateline/recurring";
import { ATTENDEES_COLLECTION, EVENTS_COLLECTION } from "./constants.js";
import { boundaryError, DatelineCoreError } from "./errors.js";
import { invalidateEventCaches } from "./cache.js";
import type { CoreContext, HookEvent } from "./types.js";

export function beforeSave(event: HookEvent): void {
  if (event.collection !== EVENTS_COLLECTION || !event.content) return;
  const normalized = normalizeEventTimes(event.content);
  validateEventRecurrence(event.content);
  event.content.startsAt = normalized.startsAt;
  event.content.endsAt = normalized.endsAt;
}

export function afterSave(event: HookEvent, ctx: CoreContext): void {
  if (event.collection !== EVENTS_COLLECTION || !event.content?.id) return;
  if (!ctx.waitUntil) throw new DatelineCoreError("WAIT_UNTIL_MISSING", "ctx.waitUntil is required for cache invalidation.");
  ctx.waitUntil(invalidateEventCaches(ctx, readString(event.content.id)));
}

export async function beforeDelete(event: HookEvent, ctx: CoreContext): Promise<void> {
  if (event.collection !== EVENTS_COLLECTION) return;
  const attendees = await listAttendeesForEvent(ctx, readString(event.id ?? event.content?.id ?? ""));
  if (attendees.length > 0) throw new DatelineCoreError("ATTENDEES_EXIST", "Cannot delete an event that still has attendees.");
}

function normalizeEventTimes(content: Record<string, unknown>): { startsAt: string; endsAt: string } {
  const timezone = readString(content.timezone ?? "");
  if (!isValidTimeZone(timezone)) throw new DatelineCoreError("INVALID_TIMEZONE", `Unknown IANA timezone: ${timezone}`);
  const startsAt = parseDate(content.startsAt, "startsAt");
  const endsAt = parseDate(content.endsAt, "endsAt");
  if (endsAt.getTime() <= startsAt.getTime()) throw new DatelineCoreError("END_BEFORE_START", "Event end must be after start.");
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

function validateEventRecurrence(content: Record<string, unknown>): void {
  if (typeof content.recurrenceRule !== "string" || content.recurrenceRule.length === 0) return;
  const validation = validateRRule(content.recurrenceRule, String(content.timezone));
  if (!validation.ok) throw new DatelineCoreError("INVALID_RRULE", validation.message);
}

function parseDate(value: unknown, fieldName: string): Date {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new DatelineCoreError("INVALID_DATETIME", `${fieldName} must be ISO-8601.`);
  return parsed;
}

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function listAttendeesForEvent(ctx: CoreContext, eventId: string): Promise<unknown[]> {
  try {
    const response = await ctx.content?.list(ATTENDEES_COLLECTION, { filter: { event: eventId } });
    return response?.items ?? response?.entries ?? [];
  } catch (error) {
    throw boundaryError("ctx.content.list(dateline_attendees)", error);
  }
}
