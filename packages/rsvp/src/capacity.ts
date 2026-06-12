import { CAPACITY_FULL_MESSAGE, DUPLICATE_RSVP_MESSAGE } from "./constants.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
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
  try {
    const collection = rsvpStorage(ctx);
    await assertClaimAvailable(collection, eventId, email);
    if (!email) throw new DatelineRsvpError("INVALID_RSVP", "email is required for capacity claims");
    const insertedClaim = claimRecord(eventId, email, "pending");
    await collection.put(claimKey(eventId, email), insertedClaim);
    const capacityRecord = await readCapacity(collection, eventId);
    const admittedClaimIds = await admittedClaimKeys(collection, eventId, capacityLimit(capacityRecord));
    if (!admittedClaimIds.has(claimKey(eventId, email))) {
      await collection.put(claimKey(eventId, email), { ...insertedClaim, status: "released" });
      await refreshRemaining(collection, eventId, capacityRecord);
      throw new DatelineRsvpError("CAPACITY_FULL", CAPACITY_FULL_MESSAGE);
    }
    await collection.put(claimKey(eventId, email), { ...insertedClaim, status: "confirmed" });
    await refreshRemaining(collection, eventId, capacityRecord);
  } catch (error) {
    if (error instanceof DatelineRsvpError) throw error;
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
    await collection.put(claimKey(eventId, email), { ...claim, status: "cancelled" });
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

async function admittedClaimKeys(collection: StorageCollection, eventId: string, capacity: number): Promise<Set<string>> {
  if (capacity <= 0) return new Set();
  const claims = await listClaims(collection, eventId);
  return new Set(claims.filter((claim) => isSeatClaim(claim.data)).sort(compareClaims).slice(0, capacity).map((claim) => claim.id));
}

async function refreshRemaining(collection: StorageCollection, eventId: string, capacityRecord: CapacityRecord): Promise<void> {
  const confirmedCount = (await listClaims(collection, eventId)).filter((claim) => isConfirmedClaim(claim.data)).length;
  const capacity = capacityLimit(capacityRecord);
  await collection.put(capacityKey(eventId), { ...capacityRecord, capacity, remaining: Math.max(0, capacity - confirmedCount) });
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
  return isEventClaim(value) && value.status !== "cancelled" && value.status !== "released";
}

function isConfirmedClaim(value: unknown): value is RsvpClaimRecord {
  return isEventClaim(value) && value.status === "confirmed";
}

function isSeatClaim(value: unknown): value is RsvpClaimRecord {
  return isEventClaim(value) && (value.status === "pending" || value.status === "confirmed");
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
  const lockKey = capacityKey(eventId);
  const previous = capacityLocks.get(lockKey) ?? Promise.resolve();
  let releaseCurrentLock: () => void = () => undefined;
  const current = new Promise<void>((resolve) => { releaseCurrentLock = resolve; });
  const chained = previous.then(() => current);
  capacityLocks.set(lockKey, chained);
  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrentLock();
    cleanupLock(lockKey, chained);
  }
}

function cleanupLock(lockKey: string, chained: Promise<void>): void {
  if (capacityLocks.get(lockKey) === chained) capacityLocks.delete(lockKey);
}
