import { describe, expect, it } from "vitest";
import { __capacityLocksSize, releaseCapacity, reserveCapacity } from "./capacity.js";
import type { RsvpContext } from "./types.js";

describe("storage-backed capacity", () => {
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

function yieldThen<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(() => Promise.resolve().then(operation));
}
