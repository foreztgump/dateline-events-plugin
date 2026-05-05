import { ATTENDEES_COLLECTION, EVENTS_COLLECTION, JSON_HEADERS, TOMBSTONED_EMAIL } from "./constants.js";
import { boundaryError, DatelineCoreError } from "./errors.js";
import type { CoreContext, RouteInput } from "./types.js";

export async function privacyExport(input: RouteInput): Promise<Response> {
  const email = readEmail(input.request);
  const attendees = await listByEmail(input.ctx, ATTENDEES_COLLECTION, email);
  const events = await listByEmail(input.ctx, EVENTS_COLLECTION, email);
  return jsonResponse({ ok: true, email, attendees, events });
}

export async function privacyErase(input: RouteInput): Promise<Response> {
  const email = readEmail(input.request);
  const attendees = await listByEmail(input.ctx, ATTENDEES_COLLECTION, email);
  const events = await listByEmail(input.ctx, EVENTS_COLLECTION, email);
  await Promise.all(attendees.map((attendee) => deleteAttendee(input.ctx, readId(attendee))));
  await Promise.all(events.map((event) => tombstoneEventEmail(input.ctx, event)));
  return jsonResponse({ ok: true, email, erasedAttendees: attendees.length, tombstonedEvents: events.length });
}

function readEmail(request?: Request): string {
  const email = request ? new URL(request.url).searchParams.get("email") : null;
  if (!email) throw new DatelineCoreError("EMAIL_REQUIRED", "Privacy routes require an email query parameter.");
  return email;
}

async function listByEmail(ctx: CoreContext, collection: string, email: string): Promise<Record<string, unknown>[]> {
  try {
    const response = await ctx.content?.list(collection, { filter: { email } });
    return (response?.items ?? response?.entries ?? []) as Record<string, unknown>[];
  } catch (error) {
    throw boundaryError(`ctx.content.list(${collection})`, error);
  }
}

async function deleteAttendee(ctx: CoreContext, id: string): Promise<void> {
  try {
    await ctx.content?.delete?.(ATTENDEES_COLLECTION, id);
  } catch (error) {
    throw boundaryError("ctx.content.delete(dateline_attendees)", error);
  }
}

async function tombstoneEventEmail(ctx: CoreContext, event: Record<string, unknown>): Promise<void> {
  try {
    await ctx.content?.update?.(EVENTS_COLLECTION, readId(event), { ...event, contactEmail: TOMBSTONED_EMAIL });
  } catch (error) {
    throw boundaryError("ctx.content.update(dateline_events)", error);
  }
}

function readId(record: Record<string, unknown>): string {
  return String(record.id);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}
