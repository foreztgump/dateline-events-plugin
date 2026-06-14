# PRO-890 Deterministic sandbox-profiler unit tests

## Why

The `@dateline/sandbox-profiler` unit suite (`tools/sandbox-profiler`) fails intermittently on GitHub-hosted shared runners while passing 7/7 locally. `runWithProfiling()` measures real wall-clock time with `performance.now()` around `await handler(ctx)`. Because the test handlers yield via `setTimeout` (`sleep`), the measured `cpuMicros` includes OS scheduling latency. On a loaded runner that latency is unbounded, so:

- a "fast" 1ms handler can measure **above** the 50ms budget and flip `result.ok` to false (`src/index.test.ts:23`), and
- the CLI gate can return exit code 1 instead of 0 for a handler that should pass (`bin/sandbox-profiler.test.ts:65`).

Both failures share one root cause: **absolute single-sample timing assertions are non-deterministic on shared CI**. This blocks unrelated PRs (PR #47 was docs-only and still got blocked twice, then admin-merged), which erodes trust in the required `ci` check.

## What changes

- **Inject a deterministic clock into `runWithProfiling`.** Add an optional `now: () => number` to `ProfilingOptions`, defaulting to `performance.now`. Unit tests pass a fake clock so elapsed-time math is fully reproducible — no dependence on runner load. The production CLI path keeps the real `performance.now` default, so the genuine budget gate is unchanged.
- **Rewrite the two timing-sensitive unit tests to use the injected clock** instead of real `sleep`. The "passing handler" test drives the clock a few ms forward; the "budget breach" test drives it past 50ms. Assertions become exact, not range-based.
- **Add a retry safety net to the one CLI test that exercises the real-timing breach path** (`bin/sandbox-profiler.test.ts` "returns non-zero and reports the handler that breaches budget"). This test legitimately needs real time (it imports and profiles a real module), so it gets `{ retry: 2 }` to self-heal transient under-measurement.

## Scope decisions (recorded)

- **The CLI's real-timing budget gate is intentionally preserved.** The injected clock defaults to `performance.now`; `pnpm sandbox:profile` in CI still measures real time. This change makes *tests* deterministic without weakening the production gate.
- **No tolerance-band assertions in unit tests.** Per the acceptance criteria, the unit tests assert exact values against the fake clock rather than loosening thresholds.
- **No new dependencies.** Vitest 4.1.5 (already pinned) supports per-test `retry`; the clock is plain dependency injection.

## Impact

- Affected: `tools/sandbox-profiler/src/index.ts` (add `now` option), `tools/sandbox-profiler/src/index.test.ts` (deterministic clock), `tools/sandbox-profiler/bin/sandbox-profiler.test.ts` (retry on the real-timing breach test).
- The `runWithProfiling` public signature gains one optional field; all existing callers (the CLI) are unaffected.
- Acceptance: the suite passes deterministically across repeated runs; no absolute single-sample timing assertion remains unguarded in the unit tests.
