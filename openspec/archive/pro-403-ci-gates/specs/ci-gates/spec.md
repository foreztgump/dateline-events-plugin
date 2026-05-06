# ci-gates

## ADDED Requirements

### Requirement: Bare async hook work is linted

The repository MUST load `dateline/no-bare-promises-in-hooks` as an ESLint error. The rule MUST reject bare async work in EmDash hook handlers unless it is awaited, passed to `ctx.waitUntil()`, or annotated with a justified `dateline-allow-bare-promise` escape hatch.

#### Scenario: Bare async call in hook

- **WHEN** a hook handler calls `someAsyncFn()` as a standalone expression
- **THEN** ESLint reports `dateline/no-bare-promises-in-hooks`

#### Scenario: Deferred async call in hook

- **WHEN** a hook handler calls `ctx.waitUntil(someAsyncFn())`
- **THEN** ESLint passes

### Requirement: Sandbox budgets are profiled

The repository MUST expose `pnpm sandbox:profile`, backed by a CLI and Vitest helper, that reports `cpuMicros` and `subrequestCount` and exits non-zero when CPU exceeds 50,000 microseconds or subrequests exceed 10.

#### Scenario: No sandbox manifests exist

- **WHEN** the CLI finds no `sandboxed.json` manifests
- **THEN** it exits 0 and prints a clear skip message

### Requirement: CI runs quality gates

GitHub Actions MUST run install, typecheck, lint, build, test, and sandbox profiling in that order.
