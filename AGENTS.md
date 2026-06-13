# Project Guidelines

> Stack, structure, versions, and security posture live in `openspec/config.yaml`'s `context:` block — do not duplicate them here.
> Code quality rules (hard + soft) live in `CODE_PRINCIPLES.md` — this file references them.

## Code Quality
Hard rules block merge; soft guidelines inform design. See `CODE_PRINCIPLES.md` for the full set with examples. Summary: SRP, no magic values, intent-revealing names, error handling on every external boundary, max 40-line / 3-param functions, max 3 nesting levels, no duplicated logic, YAGNI, Law of Demeter, AAA tests, no speculative abstractions. Soft: KISS, deep modules, composition over inheritance, strategic programming, comments explain WHY.

## Behavioral Rules
- Never guess versions, APIs, or config syntax from training knowledge — research first (see Tool Workflow). Pinned versions in `openspec/config.yaml` are verified 2026-05-03.
- When a task feels too complex or touches many files, stop and ask before proceeding. Over-engineering is the most common failure mode.
- When encountering an unfamiliar pattern, use LSP (`goToDefinition`, `findReferences`) before modifying. Don't assume from naming.
- Before introducing any abstraction, ask: does the current task require this? If not, don't build it (rule of three).
- After 2 failed attempts at the same problem, say so explicitly. The codebase or premise may be wrong, not your approach.
- Prefer extending existing patterns over introducing new ones. Match the local style unless explicitly told otherwise.
- Always run local code review before committing. Fix Critical and Important findings first. Never push unreviewed code.

<!-- Project-specific gotchas (Dateline + EmDash 0.18.0 + Cloudflare Workers, M0 probe verified 2026-06-12) -->
- **EmDash 0.18.0 is current for this modernization.** `VERIFIED-PLATFORM-0.18.md` supersedes the older 0.9.x notes where they conflict.
- Sandboxed plugins use one `src/plugin.ts` plus `emdash-plugin.jsonc`; import `SandboxedPlugin` type-only from `emdash/plugin`. Default exports must use `const plugin: SandboxedPlugin = {...}; export default plugin;` because the CLI d.ts generator fails on `export default {...} satisfies SandboxedPlugin` with TS2883/TS2742-style portability errors.
- `ctx.waitUntil(promise)` (or host-level `after()`) remains a Cloudflare Workers host concern. The sandboxed plugin `ctx` surface in 0.18 does not expose `waitUntil`.
- Cloudflare sandbox limits remain **50ms CPU + 10 subrequests + 30s wall + about 128MB memory per invocation**, but `@emdash-cms/sandbox-workerd@0.1.6` only enforces wall time locally. The M0 probe measured no CPU failure through 2000ms, no subrequest failure through 15 public fetches, and no memory failure through 192MB; keep CI profiler budgets pinned to Cloudflare limits.
- Capability naming is **resource:verb** in 0.18 manifests: `content:read`, `content:write`, `network:request`, `network:request:unrestricted`, `media:read`, `media:write`, `users:read`, `email:send`. Deprecated aliases such as `read:content` and `network:fetch:any` are normalized or rejected by the CLI; do not use them in manifests.
- Block Kit gotchas: Stats block uses `items` (not `stats`); Buttons use `label` (not `text`); Section text has no markdown parser (use `children` with marks). Plugin routes return `{ blocks, toast? }` only — no redirects, no raw `Response`. Use `@dateline/blocks` typed builders + `validateBlocks()` in CI.
- Sandboxed plugins that declare `adminPages` in `emdash-plugin.jsonc` MUST also export a top-level `admin` route handler (dispatch by `?page` param). `emdash-plugin validate` and `emdash-plugin build` pass without it, but `emdash-plugin bundle --validate-only` (the same validation pass as full `bundle` and marketplace publish) FAILS with `Plugin declares adminPages but the sandbox entry has no "admin" route`. The M2 CI gate runs `bundle --validate-only` ×3 to catch this at PR time. Add the admin route at conversion time. (Verified against `@emdash-cms/plugin-cli@0.5.1`, 2026-06-13.)
- Native-format plugins (`admin.entry` set) cannot ship through the marketplace — distribution is npm + CLI installer (`npx dateline-<name> install`). They run as TRUSTED code, not sandboxed.
- Cloudflare Free plan disables Dynamic Workers; plugins run as trusted there. Sandbox isolation pitch only valid on Paid. Document at install time.
- Cloudflare WAF / Bot Fight Mode is known to block Stripe webhook deliveries. Document a carve-out in the install guide; debug via Cloudflare GraphQL `firewallEventsAdaptive`.
- Stripe webhooks: at-least-once delivery — never fire-and-forget. Always verify with `stripe.webhooks.constructEvent(rawBody, signature, secret)` and dedupe by Stripe event id in KV (TTL 7 days). Promotion / email work goes through `ctx.waitUntil`. Stripe Node SDK is incompatible with `void` handlers on Workers — execution context terminates after response.
- **Stripe API version pinned at `2026-04-22.dahlia`** (NOT `2026-01-28.clover`). Breaking: transaction categories restructured, `return` flow split into reversal-typed events, new `stripe_fee_tax` category. Stripe Node SDK ~22.x.
- Inventory race-correctness: atomically decrement `inventory:{tierId}` per line; on rejection restore prior decrements; write `hold:{cartId}` with TTL 600s; promote to attendees inside `ctx.waitUntil` from the webhook handler. Never trust client-side counts.
- All datetime fields stored UTC; display per IANA timezone. RRULE recurrences MUST set `tzid` for correct DST handling — `rrule.js` Issue #501.
- Recurring event materialization is LAZY: compute occurrences on read with a 2-year forward cap; cache per-range hash in KV (TTL 1 hr). Never eagerly materialize past 2 years.
- `ctx.kv` is automatically plugin-scoped and has only `get`, `set`, `delete`, `list` — do not declare a capability for it. Cross-plugin KV access is structurally impossible.
- `ctx.content` is the only data access layer. No raw SQL. No D1 access. EmDash routes content through Kysely internally — plugins never see it.
- **EmDash cron hook + lifecycle hooks are real in 0.18.** `plugin:install`, `plugin:activate`, and `cron` are valid hook ids. The d.ts shape for `ctx.cron.schedule` is `schedule(name, { schedule, data? })`; the local workerd probe invoked lifecycle hooks but did not expose `ctx.cron` in the route/hook ctx, so M2 should verify schedule persistence in the integrated site before depending on it for hold-expiry sweeps.
- **Custom MCP tool registration in EmDash 0.9.x: still UNVERIFIED.** Continue with REST routes + a standalone `@dateline/mcp` wrapper as the interim path. File upstream feature request before v0.4.
- **Zod is v4 (4.4.2 latest)**, NOT v6. Imports: `zod` (v4 root), `zod/mini` (tree-shakeable), `zod/v3` (legacy compat). Zod 4 has stricter string validators, `z.fromJSONSchema()`, `z.xor()`, `.exactOptional()`, and prototype-pollution hardening. `.pick()` / `.omit()` are disallowed on schemas with refinements.
- **React MUST be ≥19.2.3** (CVE-2025-55182 React2Shell RCE patched there; affects 19.0.0–19.2.2). React Compiler v1.0 is stable. Run `npx fix-react2shell-next` if Next.js is in scope.
- **Wrangler ≥4.87 requires Node.js 22+** (drops Node 20, EOL 2026-04-30). Prefer upgrading Node; only pin Wrangler <4.87 if CI is genuinely stuck.
- **Astro 6 + `@astrojs/cloudflare` 13.3.0** runs `workerd` at all stages — use the `cloudflare:workers` module directly for bindings. No more `Astro.locals.runtime` workarounds.
- Source PRD was authored from clean-room analysis of 14 GPL WordPress plugins. Architecture is not copyrightable; specific code is. NEVER copy PHP source into TypeScript — the PHP→TypeScript language change is a deliberate guardrail.
- This is an 11-package monorepo. `@dateline/core` is the root; everything depends on it. When a change touches multiple packages, declare the dependency direction explicitly in the change proposal.

## Linear Integration
Linear IS connected for Dateline (workspace prefix `PRO`). Commits and PR titles use `[PRO-XXX]` tags (e.g. `research(synthesis): prd-inputs.md definition-of-done doc [PRO-340]`). OpenSpec change directories follow `pro-<id>-<slug>` (e.g. `pro-332-p1-static-analysis`). Reference the Linear issue id in the commit footer when fixing or closing work.

## Tool Workflow
- **Research**: Context7 (`resolve-library-id` → `query-docs`) → Tavily (`tavily_search`, `tavily_extract`, `tavily_research`, `tavily_crawl`, `tavily_map`) → OpenMemory (`openmemory query`). Never use built-in WebSearch / WebFetch.
- **Spec**: `/opsx:new` → `/opsx:ff` → review → implement → `/opsx:verify` → `/opsx:archive`.
- **Plan & Execute**: `/superpowers:brainstorming` → `/superpowers:writing-plans` → `/superpowers:executing-plans`.
- **Review**: Local review droid before every commit. `pr-agent-runner` skill for PR-level review (replaces CodeRabbit). `npx ecc-agentshield scan` for `.claude/` and `.factory/` config security.
- **Navigate**: LSP (`goToDefinition`, `findReferences`, `documentSymbol`, `workspaceSymbol`) — prefer over grep. Requires `ENABLE_LSP_TOOL=1`.
- **Test**: Playwright for E2E and visual validation. `@cloudflare/vitest-pool-workers` for tests that need real KV bindings.

## OpenMemory Checkpoints
Mandatory at every workflow phase boundary. Run `openmemory query` before starting, `openmemory store` after completing. See `skills/openmemory_checkpoints` for the full schedule.

## Workflows
- `/work-local '<description>'` — full pipeline from spec to PR.
- `/resume` — pick up where you left off.
- `/fix '<bug>'` — debug and fix workflow.

## Session Strategy
- **New session** for: new features, unrelated bugs, fresh context needed.
- **Resume** (`/resume`) for: continuing in-progress work, returning after a break.
- Run `/compact` proactively at natural phase boundaries (after research, after planning, after implementation).
- If a session exceeds ~200k tokens, start fresh and use OpenMemory + `WRAP_UP.md` to restore context.

## Documentation Updates
After every implementation, check and update: `README.md`, `CHANGELOG.md`, API docs, `AGENTS.md`, OpenSpec specs.

## Git
Default branch: `main`. Feature branches: `feature/short-desc`. Commits: `type(scope): desc [PRO-XXX]`. PRs target `main`.
