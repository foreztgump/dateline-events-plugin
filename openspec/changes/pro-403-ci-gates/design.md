# PRO-403 design

## ESLint rule

The custom rule lives under `tools/eslint-plugin-dateline`. It detects EmDash hook handler properties whose names are `content:*`, `media:*`, `email:*`, or `cron`, then reports expression-statement async calls that are neither awaited nor wrapped in `ctx.waitUntil()`. A justified `// dateline-allow-bare-promise ...` comment is the explicit escape hatch.

## Sandbox profiler

The profiler helper wraps handler execution, instruments a synthetic `ctx.fetch`, records elapsed microseconds with `performance.now()`, and counts subrequests. The CLI discovers `sandboxed.json` manifests and skips with a clear message until later milestone packages declare sandboxed handlers.

## CI integration

GitHub Actions installs dependencies, then runs `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, `pnpm -r test`, and `pnpm sandbox:profile`.
