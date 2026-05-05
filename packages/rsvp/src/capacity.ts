import { CAPACITY_FULL_MESSAGE } from "./constants.js";
import { boundaryError, DatelineRsvpError } from "./errors.js";
import type { RsvpContext } from "./types.js";

const capacityLocks = new Map<string, Promise<void>>();

export async function reserveCapacity(ctx: RsvpContext, eventId: string): Promise<void> {
  const key = capacityKey(eventId);
  const remaining = await decrementCapacity(ctx, key);
  if (remaining >= 0) return;
  await releaseCapacity(ctx, eventId);
  throw new DatelineRsvpError("CAPACITY_FULL", CAPACITY_FULL_MESSAGE);
}

export async function releaseCapacity(ctx: RsvpContext, eventId: string): Promise<void> {
  try {
    if (ctx.kv?.atomicIncrement) {
      await ctx.kv.atomicIncrement(capacityKey(eventId));
      return;
    }
    await withCapacityLock(eventId, () => addFallbackCapacity(ctx, eventId));
  } catch (error) {
    throw boundaryError("ctx.kv.atomicIncrement(capacity)", error);
  }
}

export function capacityKey(eventId: string): string {
  return `capacity:${eventId}`;
}

async function decrementCapacity(ctx: RsvpContext, key: string): Promise<number> {
  try {
    if (ctx.kv?.atomicDecrement) return await ctx.kv.atomicDecrement(key);
    return await withCapacityLock(key, () => subtractFallbackCapacity(ctx, key));
  } catch (error) {
    throw boundaryError("ctx.kv.atomicDecrement(capacity)", error);
  }
}

async function subtractFallbackCapacity(ctx: RsvpContext, key: string): Promise<number> {
  const currentValue = Number((await ctx.kv?.get?.(key)) ?? "0");
  const nextValue = currentValue - 1;
  await ctx.kv?.put?.(key, String(nextValue));
  return nextValue;
}

async function addFallbackCapacity(ctx: RsvpContext, eventId: string): Promise<void> {
  const key = capacityKey(eventId);
  const currentValue = Number((await ctx.kv?.get?.(key)) ?? "0");
  await ctx.kv?.put?.(key, String(currentValue + 1));
}

async function withCapacityLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = capacityLocks.get(key) ?? Promise.resolve();
  let releaseCurrentLock: () => void = () => undefined;
  const current = new Promise<void>((resolve) => { releaseCurrentLock = resolve; });
  capacityLocks.set(key, previous.then(() => current));
  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrentLock();
    if (capacityLocks.get(key) === current) capacityLocks.delete(key);
  }
}
