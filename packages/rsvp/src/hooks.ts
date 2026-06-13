import {
  ATTENDEES_COLLECTION,
  HOLD_STATUS_ACTIVE,
  HOLD_STATUS_EXPIRED,
  MAX_CRON_HOLD_EXPIRATIONS,
  MAX_CRON_PROMOTIONS,
  MAX_CRON_RATE_LIMIT_PURGES,
  RSVP_HOLD_EXPIRY_NAME,
  RSVP_STATUS_CANCELLED,
  RSVP_STATUS_CONFIRMED,
  RSVP_STATUS_WAITLISTED,
  RSVP_SWEEP_CRON,
  RSVP_SWEEP_NAME,
} from "./constants.js";
import { releaseCapacity, reserveCapacity } from "./capacity.js";
import { sendConfirmationEmail } from "./email.js";
import { boundaryError } from "./errors.js";
import { attendeeKey, rsvpStorage } from "./storage.js";
import { enqueueWaitlist, popNextWaitlistEntry } from "./waitlist.js";
import type { Attendee, AttendeeRecord, HoldRecord, HookEvent, RateLimitRecord, RsvpContext, WaitlistRecord } from "./types.js";

const DEFAULT_GUEST_NAME = "Guest";

export async function install(_event: unknown, ctx: RsvpContext): Promise<void> {
  await scheduleRsvpJobs(ctx, "install");
}

export async function activate(_event: unknown, ctx: RsvpContext): Promise<void> {
  await scheduleRsvpJobs(ctx, "activate");
}

async function scheduleRsvpJobs(ctx: RsvpContext, lifecycleName: string): Promise<void> {
  const schedule = ctx.cron?.schedule.bind(ctx.cron);
  if (!schedule) return;
  try {
    await schedule(RSVP_SWEEP_NAME, { schedule: RSVP_SWEEP_CRON });
    await schedule(RSVP_HOLD_EXPIRY_NAME, { schedule: RSVP_SWEEP_CRON });
  } catch (error) {
    throw boundaryError(`cron.schedule(rsvp-${lifecycleName})`, error);
  }
}

export async function afterSave(event: HookEvent, ctx: RsvpContext): Promise<void> {
  if (event.collection !== ATTENDEES_COLLECTION || !event.content) return;
  const attendee = attendeeFromContent(event.content);
  if (!attendee) return;
  try {
    if (attendee.rsvpStatus === RSVP_STATUS_CONFIRMED) await sendConfirmationEmail(ctx, attendee);
    if (attendee.rsvpStatus === RSVP_STATUS_CANCELLED) await handleCancellation(ctx, attendee);
  } catch (error) {
    ctx.log?.warn("RSVP afterSave hook failed", { eventId: attendee.event, attendeeId: attendee.id, error: String(error) });
  }
}

export async function cron(event: { name?: string }, ctx: RsvpContext): Promise<void> {
  if (event.name === RSVP_SWEEP_NAME) await promoteFromListedWaitlist(ctx);
  if (event.name === RSVP_HOLD_EXPIRY_NAME) {
    await expireCapacityHolds(ctx);
    await purgeExpiredRateLimits(ctx);
  }
}

async function handleCancellation(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  const releasedSeat = await releaseCapacity(ctx, attendee.event, attendee.email);
  if (!releasedSeat) return;
  const promotedAttendee = await safePromoteNextWaitlistedAttendee(ctx, attendee.event);
  if (promotedAttendee) await safeSendConfirmationEmail(ctx, promotedAttendee);
}

async function safePromoteNextWaitlistedAttendee(ctx: RsvpContext, eventId: string): Promise<Attendee | null> {
  try {
    return await promoteNextWaitlistedAttendee(ctx, eventId);
  } catch (error) {
    ctx.log?.warn("RSVP waitlist promotion failed", { eventId, error: String(error) });
    return null;
  }
}

async function promoteNextWaitlistedAttendee(ctx: RsvpContext, eventId: string): Promise<Attendee | null> {
  let nextEntry: Awaited<ReturnType<typeof popNextWaitlistEntry>> = null;
  let capacityReserved = false;
  try {
    nextEntry = await popNextWaitlistEntry(ctx, eventId);
    if (!nextEntry) return null;
    await reserveCapacity(ctx, eventId, nextEntry.email);
    capacityReserved = true;
    const promoted: Attendee = {
      id: nextEntry.attendeeId,
      event: eventId,
      email: nextEntry.email ?? "",
      name: nextEntry.name ?? DEFAULT_GUEST_NAME,
      eventTitle: nextEntry.eventTitle,
      rsvpStatus: RSVP_STATUS_CONFIRMED,
    };
    return await updateStoredAttendeeStatus(ctx, promoted);
  } catch (error) {
    if (nextEntry) await safeRequeueWaitlist(ctx, eventId, nextEntry);
    if (capacityReserved) await safeReleasePromotionCapacity(ctx, eventId, nextEntry?.email);
    throw boundaryError("rsvp.promoteNextWaitlistedAttendee", error);
  }
}

async function expireCapacityHolds(ctx: RsvpContext): Promise<void> {
  try {
    const collection = rsvpStorage(ctx);
    const page = await collection.query({ where: { kind: "hold", status: HOLD_STATUS_ACTIVE } });
    const holds = (page.items ?? page.entries ?? []).slice(0, MAX_CRON_HOLD_EXPIRATIONS);
    for (const entry of holds) await expireHold(ctx, entry.id, entry.data);
  } catch (error) {
    throw boundaryError("cron(expire_capacity_holds)", error);
  }
}

// PRO-879: rate-limit records are written per (eventId, IP) and only ignored at
// read time once expired — they never self-delete. Purge a budget-capped batch
// of expired records each tick so storage growth stays bounded.
async function purgeExpiredRateLimits(ctx: RsvpContext): Promise<void> {
  try {
    const collection = rsvpStorage(ctx);
    const page = await collection.query({ where: { kind: "rateLimit" } });
    const expired = (page.items ?? page.entries ?? [])
      .filter((entry) => isExpiredRateLimit(entry.data))
      .slice(0, MAX_CRON_RATE_LIMIT_PURGES);
    for (const entry of expired) await collection.delete(entry.id);
  } catch (error) {
    throw boundaryError("cron(purge_expired_rate_limits)", error);
  }
}

async function promoteFromListedWaitlist(ctx: RsvpContext): Promise<void> {
  try {
    const waitlists = await listWaitlistEventIds(ctx);
    let promotions = 0;
    for (const eventId of waitlists) {
      if (promotions >= MAX_CRON_PROMOTIONS) return;
      const promoted = await safePromoteNextWaitlistedAttendee(ctx, eventId);
      if (promoted) {
        promotions += 1;
        await safeSendConfirmationEmail(ctx, promoted);
      }
    }
  } catch (error) {
    throw boundaryError("cron(waitlisted_attendees)", error);
  }
}

async function safeSendConfirmationEmail(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  try {
    await sendConfirmationEmail(ctx, attendee);
  } catch (error) {
    ctx.log?.warn("RSVP promotion confirmation email failed", { eventId: attendee.event, email: attendee.email, error: String(error) });
  }
}

async function listWaitlistEventIds(ctx: RsvpContext): Promise<string[]> {
  try {
    const page = await rsvpStorage(ctx).query({ where: { kind: "waitlist" } });
    return (page.items ?? page.entries ?? [])
      .map((entry) => entry.data)
      .filter(isWaitlistRecord)
      .filter((record) => record.entries.length > 0)
      .map((record) => record.eventId);
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.query(waitlists)", error);
  }
}

async function updateStoredAttendeeStatus(ctx: RsvpContext, attendee: Attendee): Promise<Attendee> {
  try {
    const key = attendeeKey(attendee.event, attendee.email);
    const record = await rsvpStorage(ctx).get(key);
    if (!isAttendeeRecord(record)) return attendee;
    const updatedRecord = { ...record, rsvpStatus: attendee.rsvpStatus };
    await rsvpStorage(ctx).put(key, updatedRecord);
    return updatedRecord;
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.put(attendee-status)", error);
  }
}

async function safeRequeueWaitlist(ctx: RsvpContext, eventId: string, entry: NonNullable<Awaited<ReturnType<typeof popNextWaitlistEntry>>>): Promise<void> {
  try {
    await enqueueWaitlist(ctx, waitlistAttendee(eventId, entry));
  } catch (error) {
    ctx.log?.warn("RSVP waitlist rollback requeue failed", { eventId, error: String(error) });
  }
}

async function safeReleasePromotionCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<void> {
  try {
    await releaseCapacity(ctx, eventId, email);
  } catch (error) {
    ctx.log?.warn("RSVP waitlist rollback capacity release failed", { eventId, error: String(error) });
  }
}

function attendeeFromContent(content: unknown): Attendee | null {
  if (typeof content !== "object" || content === null) return null;
  const event = readPropertyString(content, "event");
  const email = readPropertyString(content, "email");
  const name = readPropertyString(content, "name");
  const eventTitle = readPropertyString(content, "eventTitle");
  const rsvpStatus = readRsvpStatus(readProperty(content, "rsvpStatus"));
  if (!event || !rsvpStatus) return null;
  return { id: readPropertyString(content, "id"), event, email, name: name || DEFAULT_GUEST_NAME, eventTitle, rsvpStatus };
}

function readRsvpStatus(value: unknown): Attendee["rsvpStatus"] | null {
  if (value === RSVP_STATUS_CONFIRMED || value === RSVP_STATUS_WAITLISTED || value === RSVP_STATUS_CANCELLED) return value;
  return null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readProperty(value: object, key: string): unknown {
  return key in value ? value[key as keyof typeof value] : undefined;
}

function readPropertyString(value: object, key: string): string {
  return readString(readProperty(value, key));
}

function waitlistAttendee(eventId: string, entry: NonNullable<Awaited<ReturnType<typeof popNextWaitlistEntry>>>): Attendee {
  return {
    id: entry.attendeeId,
    event: eventId,
    email: entry.email ?? "",
    name: entry.name ?? DEFAULT_GUEST_NAME,
    eventTitle: entry.eventTitle,
    rsvpStatus: RSVP_STATUS_WAITLISTED,
  };
}

async function expireHold(ctx: RsvpContext, id: string, value: unknown): Promise<void> {
  if (!isExpiredActiveHold(value)) return;
  try {
    await releaseCapacity(ctx, value.eventId, value.email);
    await rsvpStorage(ctx).put(id, { ...value, status: HOLD_STATUS_EXPIRED });
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.put(expired_hold)", error);
  }
}

function isExpiredActiveHold(value: unknown): value is HoldRecord {
  if (!isHoldRecord(value) || value.status !== HOLD_STATUS_ACTIVE) return false;
  return Date.parse(value.expiresAt) <= Date.now();
}

function isHoldRecord(value: unknown): value is HoldRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "hold";
}

function isExpiredRateLimit(value: unknown): value is RateLimitRecord {
  return isRateLimitRecord(value) && Date.parse(value.expiresAt) <= Date.now();
}

function isRateLimitRecord(value: unknown): value is RateLimitRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "rateLimit" && "expiresAt" in value;
}

function isWaitlistRecord(value: unknown): value is WaitlistRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "waitlist" && "entries" in value && Array.isArray(value.entries);
}

function isAttendeeRecord(value: unknown): value is AttendeeRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "attendee";
}

