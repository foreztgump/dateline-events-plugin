# Tasks — PRO-890 deterministic sandbox-profiler tests

## 1. Inject clock into runWithProfiling (S)
- [x] 1.1 Add optional `now?: () => number` to `ProfilingOptions` in `tools/sandbox-profiler/src/index.ts` with a doc comment.
- [x] 1.2 In `runWithProfiling`, resolve `const now = options.now ?? <bound performance.now>` and use it for both `startedAt` and the elapsed calc. Verify the default does not throw an "Illegal invocation" (bind or wrap as the test proves).
- [x] 1.3 Confirm no other call site needs updating (CLI passes only `storageSeedRecords`).

## 2. Make src unit tests deterministic (S)
- [x] 2.1 Add a small `fakeClock(...readings)` helper in `src/index.test.ts`.
- [x] 2.2 Rewrite "reports elapsed CPU micros and subrequest count for a passing handler" to inject the clock, drop real `sleep`, and assert an exact `cpuMicros` below budget with `ok === true` and the existing subrequest count.
- [x] 2.3 Rewrite "reports a budget breach when a handler exceeds 50ms CPU" to inject a clock that advances past 50ms; assert `ok === false`, exact `cpuMicros`, and the breach string.
- [x] 2.4 Remove the now-unused real-`sleep` constants/helper if nothing else references them.

## 3. Retry-guard the real-timing CLI test (S)
- [x] 3.1 Add `{ retry: 2 }` to the "returns non-zero and reports the handler that breaches budget" test in `bin/sandbox-profiler.test.ts`. Leave other CLI tests untouched.

## 4. Verify (S)
- [x] 4.1 `pnpm --filter @dateline/sandbox-profiler run typecheck` passes.
- [x] 4.2 `pnpm --filter @dateline/sandbox-profiler run lint` passes.
- [x] 4.3 `pnpm --filter @dateline/sandbox-profiler run test` passes; run it ~10× in a loop to confirm determinism.
- [x] 4.4 `pnpm sandbox:profile` still runs the real gate green (production path unchanged).
- [x] 4.5 `pnpm -r build` succeeds (no public-API breakage).
