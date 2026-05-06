import { z } from "zod";
import { HOLD_TTL_SECONDS } from "./constants.js";
import { boundaryError } from "./errors.js";
import type { Attendee, RsvpContext } from "./types.js";

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
    const storedValue = await ctx.kv?.get?.(waitlistKey(eventId));
    if (!storedValue) return [];
    return z.array(WaitlistEntrySchema).parse(JSON.parse(storedValue));
  } catch (error) {
    throw boundaryError("ctx.kv.get(waitlist)", error);
  }
}

export function waitlistKey(eventId: string): string {
  return `waitlist:${eventId}`;
}

async function writeWaitlist(ctx: RsvpContext, eventId: string, entries: WaitlistEntry[]): Promise<void> {
  try {
    await ctx.kv?.put?.(waitlistKey(eventId), JSON.stringify(entries), { expirationTtl: HOLD_TTL_SECONDS });
  } catch (error) {
    throw boundaryError("ctx.kv.put(waitlist)", error);
  }
}

function waitlistEntry(attendee: Attendee): WaitlistEntry {
  return {
    attendeeId: attendee.id ?? attendee.email,
    email: attendee.email,
    name: attendee.name,
    joinedAt: new Date().toISOString(),
  };
}
