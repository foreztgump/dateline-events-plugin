import { z } from "zod";
import {
  CAPACITY_FULL_MESSAGE,
  DUPLICATE_RSVP_MESSAGE,
  HTTP_BAD_REQUEST,
  HTTP_CAPACITY_FULL,
  HTTP_OK,
  HTTP_TOO_MANY_REQUESTS,
  JSON_HEADERS,
  RATE_LIMIT_TTL_SECONDS,
  RSVP_STATUS_CANCELLED,
  RSVP_STATUS_CONFIRMED,
  RSVP_STATUS_WAITLISTED,
} from "./constants.js";
import { reserveCapacity, releaseCapacity } from "./capacity.js";
import { sendConfirmationEmail } from "./email.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import { attendeeKey, rsvpStorage } from "./storage.js";
import { enqueueWaitlist } from "./waitlist.js";
import type { Attendee, RateLimitRecord, RouteInput, RsvpContext } from "./types.js";

const RsvpBodySchema = z.object({
  eventId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  eventTitle: z.string().min(1).optional(),
});
const RATE_LIMIT_ID_PREFIX = "rate-limit:";
const MILLISECONDS_PER_SECOND = 1000;

export async function rsvpSubmit(input: RouteInput): Promise<Response> {
  try {
    const attendee = await parseAttendee(input.request, RSVP_STATUS_CONFIRMED);
    await enforceRateLimit(input.ctx, attendee.event, clientIp(input.request));
    await reserveCapacity(input.ctx, attendee.event, attendee.email);
    const createdAttendee = await createAttendee(input.ctx, attendee, true);
    await sendRouteConfirmationEmail(input.ctx, attendee);
    return jsonResponse(HTTP_OK, { ok: true, attendee: createdAttendee });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function waitlistJoin(input: RouteInput): Promise<Response> {
  try {
    const attendee = await parseAttendee(input.request, RSVP_STATUS_WAITLISTED);
    const createdAttendee = await createAttendee(input.ctx, attendee, false);
    try {
      await enqueueWaitlist(input.ctx, { ...attendee, id: readCreatedId(createdAttendee) });
    } catch (error) {
      await rollbackWaitlistAttendee(input.ctx, attendee);
      throw error;
    }
    return jsonResponse(HTTP_OK, { ok: true, attendee: createdAttendee });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

async function rollbackWaitlistAttendee(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  const key = attendeeKey(attendee.event, attendee.email);
  try {
    const record = await rsvpStorage(ctx).get(key);
    if (typeof record === "object" && record !== null) {
      await rsvpStorage(ctx).put(key, { ...record, rsvpStatus: RSVP_STATUS_CANCELLED });
    }
  } catch (error) {
    ctx.log?.warn("RSVP waitlist rollback failed", { eventId: attendee.event, email: attendee.email, error: String(error) });
  }
}

async function createAttendee(ctx: RsvpContext, attendee: Attendee, shouldReleaseCapacity: boolean): Promise<unknown> {
  try {
    return await storeAttendee(ctx, attendee);
  } catch (error) {
    if (shouldReleaseCapacity) await releaseCapacity(ctx, attendee.event, attendee.email);
    throw boundaryError("rsvp.createAttendee", error);
  }
}

async function sendRouteConfirmationEmail(ctx: RsvpContext, attendee: Attendee): Promise<void> {
  try {
    await sendConfirmationEmail(ctx, attendee);
  } catch (error) {
    ctx.log?.warn("RSVP route confirmation email failed", { eventId: attendee.event, email: attendee.email, error: String(error) });
  }
}

async function storeAttendee(ctx: RsvpContext, attendee: Attendee): Promise<unknown> {
  const id = attendeeKey(attendee.event, attendee.email);
  const createdAt = new Date().toISOString();
  await rsvpStorage(ctx).put(id, { ...attendee, id, kind: "attendee", createdAt });
  return { id, ...attendee };
}

async function parseAttendee(request: Request | undefined, rsvpStatus: Attendee["rsvpStatus"]): Promise<Attendee> {
  if (!request) throw new DatelineRsvpError("REQUEST_MISSING", "Request is required.");
  try {
    const body = RsvpBodySchema.parse(await request.json());
    return { event: body.eventId, email: body.email, name: body.name, eventTitle: body.eventTitle, rsvpStatus, ticketTierId: null };
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
