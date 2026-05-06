import { z } from "zod";
import {
  ATTENDEES_COLLECTION,
  CAPACITY_FULL_MESSAGE,
  HTTP_BAD_REQUEST,
  HTTP_CAPACITY_FULL,
  HTTP_OK,
  HTTP_TOO_MANY_REQUESTS,
  JSON_HEADERS,
  RATE_LIMIT_TTL_SECONDS,
} from "./constants.js";
import { reserveCapacity, releaseCapacity } from "./capacity.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import { enqueueWaitlist } from "./waitlist.js";
import type { Attendee, RouteInput, RsvpContext } from "./types.js";

const RsvpBodySchema = z.object({ eventId: z.string().min(1), email: z.string().email(), name: z.string().min(1) });

export async function rsvpSubmit(input: RouteInput): Promise<Response> {
  try {
    const attendee = await parseAttendee(input.request, "confirmed");
    await enforceRateLimit(input.ctx, attendee.event, clientIp(input.request));
    await reserveCapacity(input.ctx, attendee.event);
    const createdAttendee = await createAttendee(input.ctx, attendee, true);
    return jsonResponse(HTTP_OK, { ok: true, attendee: createdAttendee });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function waitlistJoin(input: RouteInput): Promise<Response> {
  try {
    const attendee = await parseAttendee(input.request, "waitlisted");
    const createdAttendee = await createAttendee(input.ctx, attendee, false);
    await enqueueWaitlist(input.ctx, { ...attendee, id: readCreatedId(createdAttendee) });
    return jsonResponse(HTTP_OK, { ok: true, attendee: createdAttendee });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

async function createAttendee(ctx: RsvpContext, attendee: Attendee, shouldReleaseCapacity: boolean): Promise<unknown> {
  try {
    return await ctx.content?.create?.(ATTENDEES_COLLECTION, attendee);
  } catch (error) {
    if (shouldReleaseCapacity) await releaseCapacity(ctx, attendee.event);
    throw boundaryError("ctx.content.create(dateline_attendees)", error);
  }
}

async function parseAttendee(request: Request | undefined, rsvpStatus: Attendee["rsvpStatus"]): Promise<Attendee> {
  if (!request) throw new DatelineRsvpError("REQUEST_MISSING", "Request is required.");
  const body = RsvpBodySchema.parse(await request.json());
  return { event: body.eventId, email: body.email, name: body.name, rsvpStatus, ticketTierId: null };
}

async function enforceRateLimit(ctx: RsvpContext, eventId: string, ipAddress: string): Promise<void> {
  const key = `rate-limit:rsvp:${ipAddress}:${eventId}`;
  const currentValue = await ctx.kv?.get?.(key);
  if (currentValue) throw new DatelineRsvpError("RATE_LIMITED", "too many RSVP attempts");
  await ctx.kv?.put?.(key, "1", { expirationTtl: RATE_LIMIT_TTL_SECONDS });
}

function routeErrorResponse(error: unknown): Response {
  if (error instanceof DatelineRsvpError && error.code === "CAPACITY_FULL") return jsonResponse(HTTP_CAPACITY_FULL, { error: CAPACITY_FULL_MESSAGE });
  if (error instanceof DatelineRsvpError && error.code === "RATE_LIMITED") return jsonResponse(HTTP_TOO_MANY_REQUESTS, { error: error.message });
  return jsonResponse(HTTP_BAD_REQUEST, { error: String(error) });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clientIp(request: Request | undefined): string {
  return request?.headers.get("cf-connecting-ip") ?? "unknown";
}

function readCreatedId(createdAttendee: unknown): string | undefined {
  return typeof createdAttendee === "object" && createdAttendee !== null && "id" in createdAttendee
    ? String(createdAttendee.id)
    : undefined;
}
