import { describe, expect, it } from "vitest";
import { runWithProfiling, SANDBOX_CPU_BUDGET_MICROS } from "./index.js";

const SLEEP_MS = 10;
const SUBREQUESTS = 3;
const BUDGET_BREACH_SLEEP_MS = 60;

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

describe("runWithProfiling", () => {
  it("reports elapsed CPU micros and subrequest count for a passing handler", async () => {
    const result = await runWithProfiling(async (ctx) => {
      await sleep(SLEEP_MS);
      await ctx.fetch("https://example.test/one");
      await ctx.fetch("https://example.test/two");
      await ctx.fetch("https://example.test/three");
    });

    expect(result.ok).toBe(true);
    expect(result.subrequestCount).toBe(SUBREQUESTS);
    expect(result.cpuMicros).toBeGreaterThanOrEqual(SLEEP_MS * 1_000);
  });

  it("reports a budget breach when a handler exceeds 50ms CPU", async () => {
    const result = await runWithProfiling(async () => {
      await sleep(BUDGET_BREACH_SLEEP_MS);
    });

    expect(result.ok).toBe(false);
    expect(result.cpuMicros).toBeGreaterThan(SANDBOX_CPU_BUDGET_MICROS);
    expect(result.breaches).toContain("cpuMicros exceeded 50000");
  });
});
