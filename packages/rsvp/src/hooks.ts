import { ATTENDEES_COLLECTION, MAX_CRON_PROMOTIONS, RSVP_SWEEP_CRON, RSVP_SWEEP_NAME } from "./constants.js";
import { releaseCapacity, reserveCapacity } from "./capacity.js";
import { queueConfirmationEmail } from "./email.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import { popNextWaitlistEntry } from "./waitlist.js";
import type { Attendee, HookEvent, RsvpContext } from "./types.js";

export async function activate(_event: unknown, ctx: RsvpContext): Promise<void> {
  if (!ctx.cron?.schedule) throw new DatelineRsvpError("CRON_UNAVAILABLE", "ctx.cron.schedule is unavailable in this EmDash runtime.");
  try {
    await ctx.cron.schedule(RSVP_SWEEP_NAME, { schedule: RSVP_SWEEP_CRON });
  } catch (error) {
    throw boundaryError("ctx.cron.schedule(rsvp-sweep)", error);
  }
}

export async function afterSave(event: HookEvent, ctx: RsvpContext): Promise<void> {
  if (event.collection !== ATTENDEES_COLLECTION || !event.content) return;
  const attendee = attendeeFromContent(event.content);
  if (!attendee) return;
  if (attendee.rsvpStatus === "confirmed") queueConfirmationEmail(ctx, attendee);
  if (attendee.rsvpStatus === "cancelled") await handleCancellation(ctx, attendee);
}

export async function cron(event: { name?: string }, ctx: RsvpContext): Promise<void> {
  if (event.name !== RSVP_SWEEP_NAME) return;
  await promoteFromListedWaitlist(ctx);
}

async function handleCancellation(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  await releaseCapacity(ctx, attendee.event);
  const promotedAttendee = await safePromoteNextWaitlistedAttendee(ctx, attendee.event);
  if (promotedAttendee) queueConfirmationEmail(ctx, promotedAttendee);
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
  const nextEntry = await popNextWaitlistEntry(ctx, eventId);
  if (!nextEntry) return null;
  try {
    await reserveCapacity(ctx, eventId);
    await ctx.content?.update?.(ATTENDEES_COLLECTION, nextEntry.attendeeId, { rsvpStatus: "confirmed" });
    return { id: nextEntry.attendeeId, event: eventId, email: nextEntry.email ?? "", name: nextEntry.name ?? "Guest", rsvpStatus: "confirmed" };
  } catch (error) {
    throw boundaryError("ctx.content.update(dateline_attendees)", error);
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
  const response = await ctx.content?.list?.(ATTENDEES_COLLECTION, { filter: { rsvpStatus: "waitlisted" } });
  return (response?.items ?? response?.entries ?? []).map((entry) => attendeeFromContent(entry as Record<string, unknown>)).filter((entry) => entry !== null);
}

async function promoteListedAttendee(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  if (!attendee.id) return;
  await reserveCapacity(ctx, attendee.event);
  await ctx.content?.update?.(ATTENDEES_COLLECTION, attendee.id, { rsvpStatus: "confirmed" });
  queueConfirmationEmail(ctx, { ...attendee, rsvpStatus: "confirmed" });
}

function attendeeFromContent(content: Record<string, unknown>): Attendee | null {
  const event = readString(content.event);
  const email = readString(content.email);
  const name = readString(content.name);
  const rsvpStatus = readRsvpStatus(content.rsvpStatus);
  if (!event || !rsvpStatus) return null;
  return { id: readString(content.id), event, email, name: name || "Guest", rsvpStatus };
}

function readRsvpStatus(value: unknown): Attendee["rsvpStatus"] | null {
  if (value === "confirmed" || value === "waitlisted" || value === "cancelled") return value;
  return null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
