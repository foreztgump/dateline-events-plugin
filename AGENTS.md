# Project Guidelines

## Code Quality
Mandatory: SRP, no magic values, descriptive names, error handling on boundaries,
max 40 lines / 3 params / 3 nesting, no duplication, YAGNI, Law of Demeter, AAA tests.
Prefer: KISS (simplest solution wins), deep modules, composition over inheritance,
strategic programming. See CODE_PRINCIPLES.md for full details.

## Behavioral Rules
- Never guess versions, APIs, or config syntax from training knowledge — always research first (see Tool Workflow below).
- When a task feels too complex or requires touching many files, stop and ask before proceeding. Over-engineering is the most common failure mode.
- When encountering an unfamiliar pattern in the codebase, use LSP (`goToDefinition`, `findReferences`) to understand it before modifying it. Don't assume based on naming alone.
- Before creating any abstraction (interface, base class, wrapper, utility), ask: does the current task require this? If not, don't build it.
- When stuck or confused for more than 2 attempts at the same problem, say so explicitly rather than trying more variations. The codebase may need fixing, not the approach.
- Prefer modifying existing patterns over introducing new ones. If the codebase does auth one way, do auth the same way unless explicitly told otherwise.
- Always request local code review before committing. Fix Critical and Important issues before proceeding. Never push unreviewed code.

<!-- Project-specific gotchas (Dateline + EmDash + Cloudflare Workers) -->
- EmDash plugins on Cloudflare Workers MUST use `ctx.waitUntil(promise)` or the `after()` helper for any async work that continues past the response. Bare promises silently cancel — Issue #710. This breaks fire-and-forget patterns.
- Sandboxed plugins are capped at **50ms CPU + 10 subrequests per invocation**. Heavy work belongs in native plugins or deferred via `ctx.waitUntil`. Validate every sandboxed handler against the budget in CI.
- Capability naming is **action-first**: `read:content`, `write:content`, `network:fetch` (per docs.emdashcms.com and the Cloudflare blog). The legacy SKILL.md `content:read` style is wrong — do not use it.
- Block Kit gotchas: Stats block uses `items` not `stats`; Buttons use `label` not `text`; Section text has no markdown parser (use `children` with marks). Plugin routes return `{ blocks, toast? }` — no redirects, no raw `Response`. Use `@dateline/blocks` typed builders + `validateBlocks()` in CI.
- Native-format plugins (`admin.entry` set) cannot ship through marketplace auto-install — distribution is npm + CLI installer (`npx dateline-<name> install`). They run as TRUSTED code, not sandboxed.
- Cloudflare Free plan disables Dynamic Workers; plugins run as trusted there. Sandbox isolation pitch only valid on Paid plan. Document at install time.
- Cloudflare WAF / Bot Fight Mode is known to block Stripe webhook deliveries. Add a documented carve-out in the install guide; use Cloudflare GraphQL `firewallEventsAdaptive` to debug.
- Stripe webhooks: at-least-once delivery — never fire-and-forget. Always verify with `stripe.webhooks.constructEvent(rawBody, signature, secret)` and dedupe by Stripe event id in KV (TTL 7 days). Promotion/email work goes through `ctx.waitUntil`.
- Stripe Node SDK is incompatible with `void` (fire-and-forget) handlers on Workers — execution context terminates after response. Use `ctx.waitUntil` everywhere.
- Inventory race-correctness: atomically decrement `inventory:{tierId}` per line; on rejection restore prior decrements; write `hold:{cartId}` with TTL 600s; promote to attendees inside `ctx.waitUntil` from webhook handler. Never trust client-side counts.
- All datetime fields stored UTC; display per IANA timezone. RRULE recurrences MUST set `tzid` for correct DST handling — `rrule.js` Issue #501 documents the trap of stripping the zone.
- Recurring event materialization is LAZY: compute occurrences on read with a 2-year forward cap; cache per-range hash in KV (TTL 1 hr). Never eagerly materialize past 2 years.
- `ctx.kv` is automatically plugin-scoped — do not declare a capability for it. Cross-plugin KV access is structurally impossible.
- `ctx.content` is the only data access layer. No raw SQL. No D1 access. EmDash routes content through Kysely internally — plugins never see this.
- EmDash 0.8.x exposes `cron` hook + `ctx.cron.schedule()` — use it for time-based status transitions and hold-expiry sweeps. Prior PRD assumed this didn't exist.
- Custom MCP tool registration API in 0.8.x is UNVERIFIED. Until confirmed, ship REST routes + a standalone `@dateline/mcp` wrapper as the interim path.
- Source PRD was authored from clean-room analysis of 14 GPL WordPress plugins. Architecture is not copyrightable; specific code is. NEVER copy PHP source into TypeScript. The PHP→TypeScript language change is a deliberate guardrail.
- This is a multi-package family with 11 plugins. When adding behavior that touches multiple packages, declare dependency direction explicitly in the change proposal — `@dateline/core` is the root; everything else depends on it.

## Tool Workflow
- **Research**: Context7 (`resolve-library-id` → `query-docs`) → Tavily (`tavily_search`, `tavily_extract`, `tavily_research`, `tavily_crawl`, `tavily_map`) → OpenMemory (`openmemory query`). Never use built-in WebSearch or WebFetch.
- **Spec**: `/opsx:new` → `/opsx:ff` → review → implement → `/opsx:verify` → `/opsx:archive`
- **Plan & Execute**: `/superpowers:brainstorming` → `/superpowers:writing-plans` → `/superpowers:executing-plans`
- **Review**: Local review droid before every commit. `coderabbit:code-review` for PR-level review. `npx ecc-agentshield scan` for `.claude/` and `.factory/` config security.
- **Navigate**: LSP (`goToDefinition`, `findReferences`, `documentSymbol`, `workspaceSymbol`) — prefer over grep. Requires `ENABLE_LSP_TOOL=1`.
- **Test**: Playwright for E2E and visual validation. Use `@cloudflare/vitest-pool-workers` for tests that need real KV bindings.

## OpenMemory Checkpoints
Mandatory at every workflow phase boundary. Run `openmemory query` before starting, `openmemory store` after completing.
See `skills/openmemory_checkpoints` for the full checkpoint schedule.

## Workflows
- `/work-local '<description>'` — full pipeline from spec to PR
- `/resume` — pick up where you left off
- `/fix '<bug>'` — debug and fix workflow

## Session Strategy
- **New session** for: new features, unrelated bugs, fresh context needed
- **Resume** (`/resume`) for: continuing in-progress work, returning after a break
- Run `/compact` proactively at natural phase boundaries (after research, after planning, after implementation)
- If a session exceeds ~200k tokens, start fresh and use OpenMemory + WRAP_UP.md to restore context

## Documentation Updates
After every implementation, check and update: README.md, CHANGELOG.md, API docs, AGENTS.md, OpenSpec specs.

## Git
Branch: `feature/short-desc` | Commit: `type(scope): desc` | PR against `develop`. Linear is not connected for Dateline; defer Linear-style ticket prefixes until/if a workspace is set up.
