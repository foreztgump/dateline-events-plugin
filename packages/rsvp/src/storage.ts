import { DatelineRsvpError } from "./errors.js";
import type { RsvpContext, StorageCollection } from "./types.js";

export function rsvpStorage(ctx: RsvpContext): StorageCollection {
  const collection = ctx.storage?.rsvps;
  if (!collection) throw new DatelineRsvpError("STORAGE_UNAVAILABLE", "ctx.storage.rsvps is required for RSVP storage.");
  return collection;
}

export function attendeeKey(eventId: string, email: string): string {
  return `attendee:${eventId}:${encodeURIComponent(email.toLowerCase())}`;
}
