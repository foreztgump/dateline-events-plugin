import { CAPACITY_FULL_MESSAGE, DUPLICATE_RSVP_MESSAGE } from "./constants.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import { rsvpStorage } from "./storage.js";
import type { CapacityRecord, RsvpClaimRecord, RsvpContext, StorageCollection } from "./types.js";

const capacityLocks = new Map<string, Promise<void>>();
const CAPACITY_ID_PREFIX = "capacity:";
const CLAIM_ID_PREFIX = "claim:";

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

export async function releaseCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<void> {
  try {
    await withCapacityLock(eventId, () => releaseStorageCapacity(ctx, eventId, email));
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
    const capacityRecord = await readCapacity(collection, eventId);
    if (capacityRecord.remaining <= 0) throw new DatelineRsvpError("CAPACITY_FULL", CAPACITY_FULL_MESSAGE);
    await collection.put(capacityKey(eventId), { ...capacityRecord, remaining: capacityRecord.remaining - 1 });
    if (email) await collection.put(claimKey(eventId, email), claimRecord(eventId, email, "confirmed"));
  } catch (error) {
    if (error instanceof DatelineRsvpError) throw error;
    throw boundaryError("ctx.storage.rsvps.put(capacity-reserve)", error);
  }
}

async function releaseStorageCapacity(ctx: RsvpContext, eventId: string, email?: string): Promise<void> {
  try {
    const collection = rsvpStorage(ctx);
    const capacityRecord = await readCapacity(collection, eventId);
    await collection.put(capacityKey(eventId), { ...capacityRecord, remaining: capacityRecord.remaining + 1 });
    if (email) await collection.put(claimKey(eventId, email), claimRecord(eventId, email, "cancelled"));
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
  if (isCapacityRecord(value)) return value;
  return { kind: "capacity", eventId, remaining: 0 };
}

function claimRecord(eventId: string, email: string, status: RsvpClaimRecord["status"]): RsvpClaimRecord {
  return { kind: "claim", eventId, email: email.toLowerCase(), status };
}

function isActiveClaim(value: unknown): value is RsvpClaimRecord {
  return isRecord(value) && value.kind === "claim" && value.status !== "cancelled";
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
