# PRO-403 CI gates

## Why

Cloudflare Workers can cancel async work that is started after a hook response without `ctx.waitUntil()`, and sandboxed EmDash handlers must stay inside the 50ms CPU / 10 subrequest budget. Both failures are expensive to find after integration.

## What changes

- Add `dateline/no-bare-promises-in-hooks` to the root ESLint flat config.
- Add a sandbox-budget profiler CLI and Vitest helper.
- Run typecheck, lint, build, test, and sandbox profiling in CI.

## Impact

Future plugin workers get local and CI feedback before runtime hooks or sandboxed handlers can ship unsafe async work or over-budget handlers.
