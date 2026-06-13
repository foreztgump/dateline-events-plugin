import { describe, expect, it, vi } from "vitest";
import { __capacityLocksSize, releaseCapacity, reserveCapacity } from "./capacity.js";
import type { RsvpContext } from "./types.js";

describe("storage-backed capacity", () => {
  it("admits exactly configured capacity across two isolated capacity modules", async () => {
    const firstIsolate = await import("./capacity.js");
    vi.resetModules();
    const secondIsolate = await import("./capacity.js");
    const { ctx, records } = storageContext({ "capacity:evt_1": { kind: "capacity", eventId: "evt_1", remaining: 3 } });

    const attempts = Array.from({ length: 12 }, (_value, index) => {
      const isolate = index % 2 === 0 ? firstIsolate : secondIsolate;
      return isolate.reserveCapacity(ctx, "evt_1", `guest-${index}@example.com`)
        .then(() => "admitted" as const, () => "rejected" as const);
    });

    const outcomes = await Promise.all(attempts);

    expect(outcomes.filter((outcome) => outcome === "admitted")).toHaveLength(3);
    expect(readClaims(records, "confirmed")).toHaveLength(3);
    expect(readClaims(records, "released")).toHaveLength(9);
  });

  it("preserves the counter under interleaved reserve and release operations", async () => {
    const initial = 10;
    const { ctx, records } = storageContext({ "capacity:evt_1": { kind: "capacity", eventId: "evt_1", remaining: initial } });

    const operations = [
      ...Array.from({ length: 10 }, (_, index) => reserveCapacity(ctx, "evt_1", `guest-${index}@example.com`)),
      ...Array.from({ length: 10 }, (_, index) => releaseCapacity(ctx, "evt_1", `guest-${index}@example.com`)),
    ];

    await Promise.all(operations);

    expect(readRemaining(records, "capacity:evt_1")).toBe(initial);
  });

  it("releases a confirmed claim only once", async () => {
    const { ctx, records } = storageContext({
      "capacity:evt_1": { kind: "capacity", eventId: "evt_1", capacity: 1, remaining: 0 },
      "claim:evt_1:guest%40example.com": { kind: "claim", eventId: "evt_1", email: "guest@example.com", status: "confirmed" },
    });

    const firstRelease = await releaseCapacity(ctx, "evt_1", "guest@example.com");
    const secondRelease = await releaseCapacity(ctx, "evt_1", "guest@example.com");

    expect(firstRelease).toBe(true);
    expect(secondRelease).toBe(false);
    expect(readRemaining(records, "capacity:evt_1")).toBe(1);
    expect(readClaims(records, "cancelled")).toHaveLength(1);
  });

  it("does not release capacity for a waitlisted claim", async () => {
    const { ctx, records } = storageContext({
      "capacity:evt_1": { kind: "capacity", eventId: "evt_1", capacity: 1, remaining: 0 },
      "claim:evt_1:wait%40example.com": { kind: "claim", eventId: "evt_1", email: "wait@example.com", status: "waitlisted" },
    });

    const released = await releaseCapacity(ctx, "evt_1", "wait@example.com");

    expect(released).toBe(false);
    expect(readRemaining(records, "capacity:evt_1")).toBe(0);
  });

  it("cleans up locks after concurrent reserve/release cycles across events", async () => {
    const initial = 100;
    const eventIds = ["evt_1", "evt_2", "evt_3", "evt_4"];
    const { ctx } = storageContext(
      Object.fromEntries(eventIds.map((eventId) => [`capacity:${eventId}`, { kind: "capacity", eventId, remaining: initial }])),
    );

    const operations = eventIds.flatMap((eventId) =>
      Array.from({ length: 100 }, (_, index) => [
        reserveCapacity(ctx, eventId, `${eventId}-${index}@example.com`),
        releaseCapacity(ctx, eventId, `${eventId}-${index}@example.com`),
      ]).flat(),
    );

    await Promise.all(operations);

    expect(__capacityLocksSize()).toBe(0);
  });
});

function storageContext(initialRecords: Record<string, Record<string, unknown>>): { ctx: RsvpContext; records: Map<string, { id: string; data: unknown }> } {
  const records = new Map<string, { id: string; data: unknown }>(
    Object.entries(initialRecords).map(([id, data]) => [id, { id, data }] as const),
  );
  const ctx: RsvpContext = {
    storage: {
      rsvps: {
        get: (id) => yieldThen(() => records.get(id)?.data ?? null),
        put: (id, data) => yieldThen(() => { records.set(id, { id, data }); }),
        delete: (id) => yieldThen(() => records.delete(id)),
        query: () => yieldThen(() => ({ items: Array.from(records.values()) })),
        count: () => yieldThen(() => records.size),
      },
    },
  };
  return { ctx, records };
}

function readRemaining(records: Map<string, { id: string; data: unknown }>, id: string): unknown {
  const value = records.get(id)?.data;
  return typeof value === "object" && value !== null && "remaining" in value ? value.remaining : undefined;
}

function readClaims(records: Map<string, { id: string; data: unknown }>, status: string): unknown[] {
  return Array.from(records.values())
    .map((entry) => entry.data)
    .filter((value) => typeof value === "object" && value !== null && "kind" in value && value.kind === "claim" && "status" in value && value.status === status);
}

function yieldThen<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(() => Promise.resolve().then(operation));
}
