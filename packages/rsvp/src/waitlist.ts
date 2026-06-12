import { z } from "zod";
import { boundaryError } from "./errors.js";
import { rsvpStorage } from "./storage.js";
import type { Attendee, RsvpContext, WaitlistRecord } from "./types.js";

const WaitlistEntrySchema = z.object({
  attendeeId: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  joinedAt: z.string().datetime(),
});

export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;

export async function enqueueWaitlist(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  const queue = await readWaitlist(ctx, attendee.event);
  const entry = waitlistEntry(attendee);
  await writeWaitlist(ctx, attendee.event, [...queue, entry]);
}

export async function popNextWaitlistEntry(ctx: RsvpContext, eventId: string): Promise<WaitlistEntry | null> {
  const [nextEntry, ...remainingEntries] = await readWaitlist(ctx, eventId);
  if (!nextEntry) return null;
  await writeWaitlist(ctx, eventId, remainingEntries);
  return nextEntry;
}

export async function readWaitlist(ctx: RsvpContext, eventId: string): Promise<WaitlistEntry[]> {
  try {
    const storedValue = await rsvpStorage(ctx).get(waitlistKey(eventId));
    if (!isWaitlistRecord(storedValue)) return [];
    return z.array(WaitlistEntrySchema).parse(storedValue.entries);
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.get(waitlist)", error);
  }
}

export function waitlistKey(eventId: string): string {
  return `waitlist:${eventId}`;
}

async function writeWaitlist(ctx: RsvpContext, eventId: string, entries: WaitlistEntry[]): Promise<void> {
  try {
    await rsvpStorage(ctx).put(waitlistKey(eventId), { kind: "waitlist", eventId, entries });
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.put(waitlist)", error);
  }
}

function isWaitlistRecord(value: unknown): value is WaitlistRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "waitlist";
}

function waitlistEntry(attendee: Attendee): WaitlistEntry {
  return {
    attendeeId: attendee.id ?? attendee.email,
    email: attendee.email,
    name: attendee.name,
    joinedAt: new Date().toISOString(),
  };
}
