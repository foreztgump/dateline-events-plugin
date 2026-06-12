import { z } from "zod";
import {
  ATTENDEES_COLLECTION,
  CAPACITY_FULL_MESSAGE,
  DUPLICATE_RSVP_MESSAGE,
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
import type { Attendee, RateLimitRecord, RouteInput, RsvpContext } from "./types.js";

const RsvpBodySchema = z.object({ eventId: z.string().min(1), email: z.string().email(), name: z.string().min(1) });
const RATE_LIMIT_ID_PREFIX = "rate-limit:";
const MILLISECONDS_PER_SECOND = 1000;

export async function rsvpSubmit(input: RouteInput): Promise<Response> {
  try {
    const attendee = await parseAttendee(input.request, "confirmed");
    await enforceRateLimit(input.ctx, attendee.event, clientIp(input.request));
    await reserveCapacity(input.ctx, attendee.event, attendee.email);
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
  if (!ctx.content?.create) throw new Error("ctx.content.create is required for RSVP submissions.");
  try {
    return await ctx.content.create(ATTENDEES_COLLECTION, { ...attendee });
  } catch (error) {
    if (shouldReleaseCapacity) await releaseCapacity(ctx, attendee.event, attendee.email);
    throw boundaryError("ctx.content.create(dateline_attendees)", error);
  }
}

async function parseAttendee(request: Request | undefined, rsvpStatus: Attendee["rsvpStatus"]): Promise<Attendee> {
  if (!request) throw new DatelineRsvpError("REQUEST_MISSING", "Request is required.");
  try {
    const body = RsvpBodySchema.parse(await request.json());
    return { event: body.eventId, email: body.email, name: body.name, rsvpStatus, ticketTierId: null };
  } catch (error) {
    throw new DatelineRsvpError("INVALID_RSVP", String(error));
  }
}

async function enforceRateLimit(ctx: RsvpContext, eventId: string, ipAddress: string): Promise<void> {
  try {
    const collection = ctx.storage?.rsvps;
    if (!collection) throw new DatelineRsvpError("STORAGE_UNAVAILABLE", "ctx.storage.rsvps is required for RSVP rate limits.");
    const existingRecord = await collection.get(rateLimitKey(eventId, ipAddress));
    if (isActiveRateLimit(existingRecord)) throw new DatelineRsvpError("RATE_LIMITED", "too many RSVP attempts");
    await collection.put(rateLimitKey(eventId, ipAddress), rateLimitRecord(eventId, ipAddress));
  } catch (error) {
    if (error instanceof DatelineRsvpError) throw error;
    throw boundaryError("ctx.storage.rsvps.put(rate-limit)", error);
  }
}

function routeErrorResponse(error: unknown): Response {
  if (error instanceof DatelineRsvpError && error.code === "CAPACITY_FULL") return jsonResponse(HTTP_CAPACITY_FULL, { error: CAPACITY_FULL_MESSAGE });
  if (error instanceof DatelineRsvpError && error.code === "DUPLICATE_RSVP") return jsonResponse(HTTP_CAPACITY_FULL, { error: DUPLICATE_RSVP_MESSAGE });
  if (error instanceof DatelineRsvpError && error.code === "RATE_LIMITED") return jsonResponse(HTTP_TOO_MANY_REQUESTS, { error: error.message });
  return jsonResponse(HTTP_BAD_REQUEST, { error: String(error) });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clientIp(request: Request | undefined): string {
  return request?.headers.get("cf-connecting-ip") ?? "unknown";
}

function rateLimitKey(eventId: string, ipAddress: string): string {
  return `${RATE_LIMIT_ID_PREFIX}${eventId}:${encodeURIComponent(ipAddress)}`;
}

function rateLimitRecord(eventId: string, ipAddress: string): RateLimitRecord {
  const expiresAt = new Date(Date.now() + RATE_LIMIT_TTL_SECONDS * MILLISECONDS_PER_SECOND).toISOString();
  return { kind: "rateLimit", eventId, ipAddress, expiresAt };
}

function isActiveRateLimit(value: unknown): value is RateLimitRecord {
  return isRateLimitRecord(value) && Date.parse(value.expiresAt) > Date.now();
}

function isRateLimitRecord(value: unknown): value is RateLimitRecord {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "rateLimit";
}

function readCreatedId(createdAttendee: unknown): string | undefined {
  return typeof createdAttendee === "object" && createdAttendee !== null && "id" in createdAttendee
    ? String(createdAttendee.id)
    : undefined;
}
