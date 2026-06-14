# Design — PRO-890 deterministic sandbox-profiler tests

## Problem restated

`runWithProfiling` wraps a handler with two `performance.now()` reads and derives `cpuMicros` from the delta. The test handlers `await sleep(ms)` (real `setTimeout`). The delta therefore captures *wall* time including OS scheduling latency, which is unbounded on shared CI. Absolute assertions (`>= SLEEP_MS*1000`, `> 50000`, CLI exit code) flake in both directions:

- **Under-measure / over-measure flip:** a 1ms intended sleep can be scheduled late and measure >50ms → `ok` flips false (`src/index.test.ts:23`).
- **Gate flip:** the CLI handler intended to pass trips the 50ms gate → exit 1 not 0 (`bin/sandbox-profiler.test.ts:65`).

## Chosen approach (issue-preferred #2 + #3)

Two independent fixes, each scoped to where the timing actually originates:

1. **Dependency-inject the clock** into `runWithProfiling` for the pure unit path. This removes real time from the unit tests entirely — they become deterministic functions of the injected clock.
2. **Retry-guard** the one CLI test that *must* use real time (it dynamically imports a real `.mjs` module and profiles it; the whole point is to exercise the real gate). Retry is the right tool because we cannot inject a clock through the module boundary without contaminating the production import path.

### Why not the alternatives

- **Tolerance bands (#1):** the acceptance criteria explicitly disallow leaving absolute single-sample timing assertions; widening `>=` to a band still measures real time and can still flip under extreme contention. Rejected for unit tests.
- **Separate integration job (#4):** heavier process/CI restructuring for a 3-file test-determinism bug. YAGNI — the retry on a single test achieves the same self-heal without a new job.

## API change

`ProfilingOptions` gains one optional field:

```ts
export interface ProfilingOptions {
  storageSeedRecords?: StorageSeedRecords;
  /** Monotonic ms clock; defaults to performance.now. Injected in unit tests for determinism. */
  now?: () => number;
}
```

`runWithProfiling` reads it once at the top:

```ts
export async function runWithProfiling(handler, options = {}) {
  const now = options.now ?? performance.now;
  const counter = createSubrequestCounter();
  const startedAt = now();
  await handler(createProfilingContext(counter, options.storageSeedRecords ?? {}));
  const elapsedMicros = Math.round((now() - startedAt) * MICROS_PER_MILLISECOND);
  ...
}
```

Notes:
- `performance.now` must be referenced as a bound value or wrapped so `this` is not lost. Using `options.now ?? performance.now.bind(performance)` (or a small arrow default) avoids an "Illegal invocation" in environments that enforce the receiver. Confirm at implementation time which form passes; prefer the minimal wrapper that the test proves correct.
- No behavior change when `now` is omitted — the CLI never passes it.

## Test changes

### `src/index.test.ts`
- "passing handler" → build a `now` that returns a controlled sequence (e.g. `0` then `5`), pass `{ now }`, drop the real `sleep`, assert `cpuMicros === 5000` exactly and `ok === true`. Keep the subrequest-count assertions (those are already deterministic — `ctx.fetch` increments a counter synchronously).
- "budget breach" → `now` returns `0` then `80`, assert `ok === false`, `cpuMicros === 80000`, breach string present. No real sleep.
- "storage writes visible" test is already deterministic (no timing assertion) — leave it unchanged.

A tiny helper makes the clock intent obvious:

```ts
const fakeClock = (...readings: number[]) => {
  let i = 0;
  return () => readings[Math.min(i++, readings.length - 1)];
};
```

### `bin/sandbox-profiler.test.ts`
- Add `{ retry: 2 }` to the "returns non-zero and reports the handler that breaches budget" test only. It imports a real module that sleeps 60ms; on a fast clean runner that reliably breaches, but to be safe against an under-measured first attempt, retry up to twice.
- The other CLI tests assert structural/string outcomes (manifest discovery, subrequest counts), not absolute timing — leave them unchanged.

## Risk & blast radius

- Public signature is additive and optional; the only caller (the CLI `profileHandler`) passes `{ storageSeedRecords }` and is untouched.
- The CI gate (`pnpm sandbox:profile`) still measures real time — production behavior is byte-for-byte unchanged.
- Failure mode if `performance.now` binding is wrong: a thrown TypeError surfaces immediately in the default-path test, so it cannot ship silently.

## Acceptance mapping

- "passes deterministically across ≥10 runs" → unit tests no longer touch real time; verified locally by running the suite repeatedly.
- "no absolute single-sample timing assertion remains in the unit tests (or it is retry-guarded)" → unit tests assert against the fake clock; the one real-timing CLI test is retry-guarded.
