import {
  ATTENDEES_COLLECTION,
  HOLD_STATUS_ACTIVE,
  HOLD_STATUS_EXPIRED,
  MAX_CRON_PROMOTIONS,
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
import { rsvpStorage } from "./storage.js";
import { enqueueWaitlist, popNextWaitlistEntry } from "./waitlist.js";
import type { Attendee, HoldRecord, HookEvent, RsvpContext } from "./types.js";

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
  if (attendee.rsvpStatus === "confirmed") await sendConfirmationEmail(ctx, attendee);
  if (attendee.rsvpStatus === "cancelled") await handleCancellation(ctx, attendee);
}

export async function cron(event: { name?: string }, ctx: RsvpContext): Promise<void> {
  if (event.name === RSVP_SWEEP_NAME) await promoteFromListedWaitlist(ctx);
  if (event.name === RSVP_HOLD_EXPIRY_NAME) await expireCapacityHolds(ctx);
}

async function handleCancellation(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  await releaseCapacity(ctx, attendee.event, attendee.email);
  const promotedAttendee = await safePromoteNextWaitlistedAttendee(ctx, attendee.event);
  if (promotedAttendee) await sendConfirmationEmail(ctx, promotedAttendee);
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
    await updateAttendeeStatus(ctx, nextEntry.attendeeId, "confirmed");
    return { id: nextEntry.attendeeId, event: eventId, email: nextEntry.email ?? "", name: nextEntry.name ?? DEFAULT_GUEST_NAME, rsvpStatus: "confirmed" };
  } catch (error) {
    if (capacityReserved) await releaseCapacity(ctx, eventId, nextEntry?.email);
    if (nextEntry) await enqueueWaitlist(ctx, waitlistAttendee(eventId, nextEntry));
    throw boundaryError("ctx.content.update(dateline_attendees)", error);
  }
}

async function expireCapacityHolds(ctx: RsvpContext): Promise<void> {
  try {
    const collection = rsvpStorage(ctx);
    const page = await collection.query({ where: { kind: "hold", status: HOLD_STATUS_ACTIVE } });
    for (const entry of page.items ?? page.entries ?? []) await expireHold(ctx, entry.id, entry.data);
  } catch (error) {
    throw boundaryError("cron(expire_capacity_holds)", error);
  }
}

async function promoteFromListedWaitlist(ctx: RsvpContext): Promise<void> {
  try {
    const waitlistedAttendees = await listWaitlistedAttendees(ctx);
    for (const attendee of waitlistedAttendees.slice(0, MAX_CRON_PROMOTIONS)) await promoteListedAttendee(ctx, attendee);
  } catch (error) {
    throw boundaryError("cron(waitlisted_attendees)", error);
  }
}

async function listWaitlistedAttendees(ctx: RsvpContext): Promise<Attendee[]> {
  if (!ctx.content?.list) throw new Error("ctx.content.list is required for RSVP waitlist promotion.");
  try {
    const response = await ctx.content.list(ATTENDEES_COLLECTION, { filter: { rsvpStatus: RSVP_STATUS_WAITLISTED } });
    return (response?.items ?? response?.entries ?? []).map(readAttendeeEntry).filter((entry) => entry !== null);
  } catch (error) {
    throw boundaryError("ctx.content.list(waitlisted_attendees)", error);
  }
}

async function promoteListedAttendee(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  if (!attendee.id) return;
  let capacityReserved = false;
  let attendeeConfirmed = false;
  try {
    await reserveCapacity(ctx, attendee.event, attendee.email);
    capacityReserved = true;
    await updateAttendeeStatus(ctx, attendee.id, "confirmed");
    attendeeConfirmed = true;
    await sendConfirmationEmail(ctx, { ...attendee, rsvpStatus: "confirmed" });
  } catch (error) {
    if (capacityReserved && !attendeeConfirmed) await releaseCapacity(ctx, attendee.event, attendee.email);
    throw boundaryError("cron(promote_listed_attendee)", error);
  }
}

function attendeeFromContent(content: unknown): Attendee | null {
  if (typeof content !== "object" || content === null) return null;
  const event = readPropertyString(content, "event");
  const email = readPropertyString(content, "email");
  const name = readPropertyString(content, "name");
  const rsvpStatus = readRsvpStatus(readProperty(content, "rsvpStatus"));
  if (!event || !rsvpStatus) return null;
  return { id: readPropertyString(content, "id"), event, email, name: name || DEFAULT_GUEST_NAME, rsvpStatus };
}

function readAttendeeEntry(value: unknown): Attendee | null {
  return attendeeFromContent(value);
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
    rsvpStatus: "waitlisted",
  };
}

async function updateAttendeeStatus(ctx: RsvpContext, attendeeId: string, rsvpStatus: Attendee["rsvpStatus"]): Promise<void> {
  if (!ctx.content?.update) throw new Error("ctx.content.update is required for RSVP promotion.");
  try {
    await ctx.content.update(ATTENDEES_COLLECTION, attendeeId, { rsvpStatus });
  } catch (error) {
    throw boundaryError("ctx.content.update(dateline_attendees)", error);
  }
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
