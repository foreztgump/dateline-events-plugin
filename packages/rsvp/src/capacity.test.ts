import { describe, expect, it } from "vitest";
import { releaseCapacity, reserveCapacity } from "./capacity.js";
import type { RsvpContext } from "./types.js";

describe("capacity fallback (non-atomic KV)", () => {
  it("preserves the counter under interleaved reserve/release without atomic KV", async () => {
    const initial = 10;
    const { ctx, store } = fallbackContext({ "capacity:evt_1": initial });

    const operations = [
      ...Array.from({ length: 10 }, () => reserveCapacity(ctx, "evt_1")),
      ...Array.from({ length: 10 }, () => releaseCapacity(ctx, "evt_1")),
    ];

    await Promise.all(operations);

    expect(Number(store.get("capacity:evt_1"))).toBe(initial);
  });
});

function fallbackContext(initialKv: Record<string, number>): { ctx: RsvpContext; store: Map<string, string> } {
  const store = new Map<string, string>(
    Object.entries(initialKv).map(([key, value]) => [key, String(value)] as const),
  );
  const ctx: RsvpContext = {
    kv: {
      get: (key) => yieldThen(() => store.get(key) ?? null),
      put: (key, value) => yieldThen(() => { store.set(key, value); }),
    },
  };
  return { ctx, store };
}

function yieldThen<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(() => Promise.resolve().then(operation));
}
