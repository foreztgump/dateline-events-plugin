import {
  CAPACITY_FULL_MESSAGE,
  CLAIM_STATUS_CANCELLED,
  CLAIM_STATUS_CONFIRMED,
  CLAIM_STATUS_PENDING,
  CLAIM_STATUS_RELEASED,
  DUPLICATE_RSVP_MESSAGE,
} from "./constants.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import { withAsyncLock } from "./lock.js";
import { rsvpStorage } from "./storage.js";
import type { CapacityRecord, RsvpClaimRecord, RsvpContext, StorageCollection, StoragePage } from "./types.js";

const capacityLocks = new Map<string, Promise<void>>();
const CAPACITY_ID_PREFIX = "capacity:";
const CLAIM_ID_PREFIX = "claim:";
let claimSequence = 0;

/**
 * Test-only capacity lock introspection. Do not call from product code.
 *
 * @internal
 */
export function __capacityLocksSize(): number {
  return capacityLocks.size;
}

export async function reserveCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<void> {
  await withCapacityLock(eventId, () => reserveStorageCapacity(ctx, eventId, email));
}

export async function releaseCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<boolean> {
  try {
    return await withCapacityLock(eventId, () => releaseStorageCapacity(ctx, eventId, email));
  } catch (error) {
    throw boundaryError("ctx.storage.rsvps.put(capacity-release)", error);
  }
}

export function capacityKey(eventId: string): string {
  return `${CAPACITY_ID_PREFIX}${eventId}`;
}

function claimKey(eventId: string, email: string): string {
  return `${CLAIM_ID_PREFIX}${eventId}:${encodeURIComponent(email.toLowerCase())}`;
}

async function reserveStorageCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<void> {
  const collection = rsvpStorage(ctx);
  let insertedClaim: RsvpClaimRecord | null = null;
  let insertedClaimKey = "";
  try {
    await assertClaimAvailable(collection, eventId, email);
    if (!email) throw new DatelineRsvpError("INVALID_RSVP", "email is required for capacity claims");
    insertedClaimKey = claimKey(eventId, email);
    insertedClaim = claimRecord(eventId, email, CLAIM_STATUS_PENDING);
    await collection.put(insertedClaimKey, insertedClaim);
    const capacityRecord = await readCapacity(collection, eventId);
    const claims = await listClaims(collection, eventId);
    const admittedClaimIds = admittedClaimKeys(claims, capacityLimit(capacityRecord));
    if (!admittedClaimIds.has(insertedClaimKey)) {
      await collection.put(insertedClaimKey, { ...insertedClaim, status: CLAIM_STATUS_RELEASED });
      await writeRemaining(collection, capacityRecord, confirmedClaimsCount(claims));
      throw new DatelineRsvpError("CAPACITY_FULL", CAPACITY_FULL_MESSAGE);
    }
    await collection.put(insertedClaimKey, { ...insertedClaim, status: CLAIM_STATUS_CONFIRMED });
    await writeRemaining(collection, capacityRecord, confirmedClaimsCount(claims) + 1);
  } catch (error) {
    if (error instanceof DatelineRsvpError) throw error;
    if (insertedClaim) await collection.put(insertedClaimKey, { ...insertedClaim, status: CLAIM_STATUS_RELEASED }).catch(() => undefined);
    throw boundaryError("ctx.storage.rsvps.put(capacity-reserve)", error);
  }
}

async function releaseStorageCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<boolean> {
  try {
    if (!email) return false;
    const collection = rsvpStorage(ctx);
    const claim = await collection.get(claimKey(eventId, email));
    if (!isConfirmedClaim(claim)) return false;
    const capacityRecord = await readCapacity(collection, eventId);
    await collection.put(claimKey(eventId, email), { ...claim, status: CLAIM_STATUS_CANCELLED });
    await refreshRemaining(collection, eventId, capacityRecord);
    return true;
  } catch (error) {
    if (error instanceof DatelineRsvpError) throw error;
    throw boundaryError("ctx.storage.rsvps.put(capacity-release)", error);
  }
}

async function assertClaimAvailable(collection: StorageCollection, eventId: string, email?: string): Promise<void> {
  if (!email) return;
  const existingClaim = await collection.get(claimKey(eventId, email));
  if (isActiveClaim(existingClaim)) throw new DatelineRsvpError("DUPLICATE_RSVP", DUPLICATE_RSVP_MESSAGE);
}

async function readCapacity(collection: StorageCollection, eventId: string): Promise<CapacityRecord> {
  const value = await collection.get(capacityKey(eventId));
  if (isCapacityRecord(value)) return { ...value, capacity: capacityLimit(value) };
  return { kind: "capacity", eventId, remaining: 0 };
}

function claimRecord(eventId: string, email: string, status: RsvpClaimRecord["status"]): RsvpClaimRecord {
  claimSequence += 1;
  return { kind: "claim", eventId, email: email.toLowerCase(), status, createdAt: new Date().toISOString(), sequence: claimSequence };
}

function admittedClaimKeys(claims: Array<{ id: string; data: RsvpClaimRecord }>, capacity: number): Set<string> {
  if (capacity <= 0) return new Set();
  return new Set(claims.filter((claim) => isSeatClaim(claim.data)).sort(compareClaims).slice(0, capacity).map((claim) => claim.id));
}

async function refreshRemaining(collection: StorageCollection, eventId: string, capacityRecord: CapacityRecord): Promise<void> {
  const confirmedCount = (await listClaims(collection, eventId)).filter((claim) => isConfirmedClaim(claim.data)).length;
  await writeRemaining(collection, capacityRecord, confirmedCount);
}

async function writeRemaining(
  collection: StorageCollection,
  capacityRecord: CapacityRecord,
  confirmedCount: number,
): Promise<void> {
  const capacity = capacityLimit(capacityRecord);
  await collection.put(capacityKey(capacityRecord.eventId), { ...capacityRecord, capacity, remaining: Math.max(0, capacity - confirmedCount) });
}

function confirmedClaimsCount(claims: Array<{ id: string; data: RsvpClaimRecord }>): number {
  return claims.filter((claim) => isConfirmedClaim(claim.data)).length;
}

async function listClaims(collection: StorageCollection, eventId: string): Promise<Array<{ id: string; data: RsvpClaimRecord }>> {
  const page = await collection.query({ where: { kind: "claim", eventId } });
  return pageEntries(page).filter((entry): entry is { id: string; data: RsvpClaimRecord } => isEventClaim(entry.data, eventId));
}

function pageEntries(page: StoragePage): Array<{ id: string; data: unknown }> {
  return page.items ?? page.entries ?? [];
}

function compareClaims(left: { id: string; data: RsvpClaimRecord }, right: { id: string; data: RsvpClaimRecord }): number {
  return (left.data.createdAt ?? "").localeCompare(right.data.createdAt ?? "")
    || (left.data.sequence ?? 0) - (right.data.sequence ?? 0)
    || left.id.localeCompare(right.id);
}

function capacityLimit(record: CapacityRecord): number {
  return record.capacity ?? record.remaining;
}

function isActiveClaim(value: unknown): value is RsvpClaimRecord {
  return isEventClaim(value) && value.status !== CLAIM_STATUS_CANCELLED && value.status !== CLAIM_STATUS_RELEASED;
}

function isConfirmedClaim(value: unknown): value is RsvpClaimRecord {
  return isEventClaim(value) && value.status === CLAIM_STATUS_CONFIRMED;
}

function isSeatClaim(value: unknown): value is RsvpClaimRecord {
  return isEventClaim(value) && (value.status === CLAIM_STATUS_PENDING || value.status === CLAIM_STATUS_CONFIRMED);
}

function isEventClaim(value: unknown, eventId?: string): value is RsvpClaimRecord {
  if (!isRecord(value) || value.kind !== "claim" || typeof value.email !== "string") return false;
  if (eventId && value.eventId !== eventId) return false;
  return typeof value.status === "string";
}

function isCapacityRecord(value: unknown): value is CapacityRecord {
  return isRecord(value) && value.kind === "capacity" && typeof value.remaining === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}


async function withCapacityLock<T>(eventId: string, operation: () => Promise<T>): Promise<T> {
  return withAsyncLock(capacityLocks, capacityKey(eventId), operation);
}
