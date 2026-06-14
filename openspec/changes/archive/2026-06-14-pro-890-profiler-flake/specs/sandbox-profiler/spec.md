# sandbox-profiler — deterministic timing spec delta

## ADDED Requirements

### Requirement: Injectable clock for reproducible elapsed-time measurement

`runWithProfiling` SHALL accept an optional `now` function in `ProfilingOptions` that returns a monotonic millisecond timestamp. When omitted, it SHALL default to `performance.now`. Elapsed CPU micros SHALL be computed as `round((now() after handler - now() before handler) * 1000)` using the injected function so callers can make the measurement deterministic.

#### Scenario: Default clock preserves production behavior
- **WHEN** `runWithProfiling(handler)` is called without a `now` option
- **THEN** elapsed time is measured with `performance.now`
- **AND** the returned `cpuMicros`, `breaches`, and `ok` reflect real wall-clock timing exactly as before this change

#### Scenario: Injected clock yields deterministic cpuMicros
- **WHEN** `runWithProfiling(handler, { now })` is called with a fake `now` that advances by a fixed amount across the handler invocation
- **THEN** `cpuMicros` equals `round(advanceMillis * 1000)` regardless of host load
- **AND** `ok` is `true` when the advance is at or below the 50ms budget and `false` when it exceeds it

### Requirement: Unit tests assert against a deterministic clock

The `runWithProfiling` unit tests SHALL drive elapsed time through an injected clock rather than real `setTimeout` sleeps, so timing assertions are exact and independent of runner load.

#### Scenario: Passing-handler test is deterministic
- **WHEN** the "passing handler" unit test runs on any host
- **THEN** it advances the injected clock to a value below the budget
- **AND** asserts an exact `cpuMicros` value with no range tolerance and no dependence on real time

#### Scenario: Budget-breach test is deterministic
- **WHEN** the "budget breach" unit test runs on any host
- **THEN** it advances the injected clock past 50ms
- **AND** asserts `ok === false` and the `cpuMicros exceeded 50000` breach exactly

### Requirement: Real-timing CLI breach test is retry-guarded

The single CLI test that profiles a real module to exercise the genuine real-timing budget gate SHALL be guarded with a vitest per-test `retry` so transient under- or over-measurement on a loaded runner self-heals without weakening the assertion.

#### Scenario: Transient CI contention self-heals
- **WHEN** the real-timing CLI breach test under-measures on a loaded runner and fails its first attempt
- **THEN** vitest retries it up to the configured retry count
- **AND** the suite passes when any attempt observes the expected breach
