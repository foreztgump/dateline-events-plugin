import { describe, expect, it } from "vitest";
import { runWithProfiling, SANDBOX_CPU_BUDGET_MICROS } from "./index.js";

const MICROS_PER_MILLISECOND = 1_000;
const PASSING_ELAPSED_MS = 5;
const BUDGET_BREACH_ELAPSED_MS = 80;
const SUBREQUESTS = 3;

// Makes elapsed-time measurement independent of host load — the source of the
// CI flakiness this fixes. Returns successive readings on each call, holding the
// final reading once exhausted, and is injected via the `now` option.
const fakeClock = (...readings: [number, ...number[]]): (() => number) => {
  let index = 0;
  return () => readings[Math.min(index++, readings.length - 1)] ?? readings[0];
};

describe("runWithProfiling", () => {
  it("reports elapsed CPU micros and subrequest count for a passing handler", async () => {
    const result = await runWithProfiling(
      async (ctx) => {
        await ctx.fetch("https://example.test/one");
        await ctx.fetch("https://example.test/two");
        await ctx.fetch("https://example.test/three");
      },
      { now: fakeClock(0, PASSING_ELAPSED_MS) },
    );

    expect(result.ok).toBe(true);
    expect(result.subrequestCount).toBe(SUBREQUESTS);
    expect(result.cpuMicros).toBe(PASSING_ELAPSED_MS * MICROS_PER_MILLISECOND);
  });

  it("reports a budget breach when a handler exceeds 50ms CPU", async () => {
    const result = await runWithProfiling(
      () => undefined,
      { now: fakeClock(0, BUDGET_BREACH_ELAPSED_MS) },
    );

    expect(result.ok).toBe(false);
    expect(result.cpuMicros).toBe(BUDGET_BREACH_ELAPSED_MS * MICROS_PER_MILLISECOND);
    expect(result.cpuMicros).toBeGreaterThan(SANDBOX_CPU_BUDGET_MICROS);
    expect(result.breaches).toContain("cpuMicros exceeded 50000");
  });

  it("keeps storage writes visible across repeated collection access", async () => {
    const result = await runWithProfiling(async (ctx) => {
      const collection = ctx.storage.profile_records;
      if (!collection) throw new Error("missing storage collection");
      await collection.put("written", { ok: true });
      const saved = await ctx.storage.profile_records?.get("written");
      if (!saved) throw new Error("missing storage write");
    });

    expect(result.ok).toBe(true);
    expect(result.subrequestCount).toBe(2);
  });
});
