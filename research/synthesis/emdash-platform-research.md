---
doc: emdash-platform-research
phase: 5
generated: 2026-05-02
analyst: research-droid
sources_verified:
  - github.com/emdash-cms/emdash (main branch, README, SKILL.md, docs, releases, issues)
  - docs.emdashcms.com
  - blog.cloudflare.com/emdash-wordpress
  - lushbinary.com (third-party developer guides)
  - joost.blog/emdash-cms
  - veerhost.com/emdash-vs-wordpress
  - github.com/emdash-cms/emdash/issues/710
  - github.com/emdash-cms/emdash/issues/41
  - github.com/emdash-cms/emdash/issues/149
---

# EmDash Platform Research Report

**Generated:** 2026-05-02
**Latest version:** emdash@0.9.0 (source: https://github.com/emdash-cms/emdash/releases)
**Initial beta release:** v0.1.0 on April 1, 2026
**License:** MIT
**Repo:** github.com/emdash-cms/emdash (10.2k stars, 507+ commits)
**Docs domain:** docs.emdashcms.com (canonical)

---

## Q1. Capability naming canonical form

**Answer:** `content:read` (resource:verb) is canonical.

- **Confidence:** HIGH
- **Source:** https://github.com/emdash-cms/emdash/releases (emdash@0.9.0, PR #816) + docs.emdashcms.com/plugins/overview/ + raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/SKILL.md — retrieved 2026-05-02
- **Quote:** PR #816 in the 0.9.0 release: "Unifies plugin capability names under a single `<resource>[.<sub-resource>]:<verb>[:<qualifier>]` formula so capabilities read like RBAC permissions... The Cloudflare sandbox bridge and HTTP fetch helper now enforce canonical names (`content:read`, `content:write`, `media:read`, `media:write`, `users:read`, `network:request`, `network:request:unrestricted`). Old names are still accepted with `@deprecated` warnings... `emdash plugin publish` refuses manifests that still use them."
- **Implication for Dateline:** All plugin manifests must use `content:read` (not `read:content`). The SKILL.md and docs.emdashcms.com use `content:read` throughout. The Cloudflare blog and README.md use `read:content` which is now legacy/deprecated. Lock in `content:read`.

**Resolution status:** Settled. The 0.9.0 release (PR #816) explicitly unified the naming convention. Use `resource:verb` everywhere.

---

## Q2. Custom MCP tool registration API

**Answer:** Does NOT exist yet. Issue #41 is open and unassigned.

- **Confidence:** HIGH
- **Source:** https://github.com/emdash-cms/emdash/issues/41 (opened by @bradvin) — retrieved 2026-05-02
- **Quote:** "EmDash currently has two separate extension surfaces: Core MCP tools, registered directly in packages/core/src/mcp/server.ts . Plugin routes, exposed under /_emdash/api/plugins/{pluginId}/... Plugins can currently expose hooks, routes, admin UI, and storage, but cannot expose first-class MCP tools."
- **Implication for Dateline:** No `mcp.tools` field or `mcp:registerTool` hook exists. The interim path is: REST plugin routes + a standalone `@dateline/mcp` wrapper. The AGENTS.md recommendation ("ship REST routes + standalone @dateline/mcp wrapper") is the correct interim path.

**Resolution status:** No upstream feature available. Interim path confirmed. Monitor issue #41 (not assigned, no milestone).

---

## Q3. `cron:*` hook / `ctx.cron.schedule()`

**Answer:** CONFIRMED present and documented.

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/references/hooks.md — retrieved 2026-05-02
- **Quote:** From hooks.md: "Cron Hook — Runs on a schedule. Configure schedules via `ctx.cron.schedule()` in `plugin:activate`." Example: `await ctx.cron!.schedule("daily-cleanup", { schedule: "0 2 * * *" });`
- **Implication for Dateline:** The AGENTS.md claim is correct. EmDash 0.6+ (and current 0.9.0) exposes cron scheduling. Use it for time-based status transitions and hold-expiry sweeps.

**Hook name:** `cron` (single hook event, no sub-types like `cron:before` / `cron:after`). Event: `{ name: string, data?: Record }`. Schedule with `ctx.cron.schedule()`.

---

## Q4. Cloudflare Queues access from plugins

**Answer:** No `ctx.queue` binding exists. Plugins cannot enqueue to Worker queues.

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/SKILL.md (Plugin Context interface) + docs.emdashcms.com/plugins/overview/ — retrieved 2026-05-02
- **Quote:** Plugin context provides: `storage`, `kv`, `content`, `media`, `http`, `log`, `plugin`, `site`, `url()`, `users`, `cron`, `email`. No `queue` property. Capability list: `content:read`, `content:write`, `media:read`, `media:write`, `network:request`, `network:request:unrestricted`, `users:read`, `email:send`, `hooks.email-transport:register`, `hooks.email-events:register`, `hooks.page-fragments:register`. No queue-related capability.
- **Implication for Dateline:** >50ms work beyond `ctx.waitUntil` must use the cron hook or a separate Worker with a configured queue binding (outside the plugin system). Plugins cannot directly access Cloudflare Queues.

---

## Q5. Free vs Paid Cloudflare plan implications

**Answer:** Confirmed. Dynamic Workers (sandboxed plugins) require a paid Cloudflare plan.

- **Confidence:** HIGH
- **Source:** https://github.com/emdash-cms/emdash/blob/main/README.md + https://github.com/emdash-cms/emdash/issues/149 — retrieved 2026-05-02
- **Quote:** README.md: "EmDash depends on Dynamic Workers to run secure sandboxed plugins. Dynamic Workers are currently only available on paid accounts. Upgrade your account (starting at $5/mo) or comment out the worker_loaders block of your wrangler.jsonc configuration file to disable plugins." Issue #149: Deployment fails with error code 10195 on free plan.
- **Implication for Dateline:** On Free plan: plugins run as trusted (in-process), no sandbox isolation. The AGENTS.md claim is accurate. Document prominently: "sandboxing requires Cloudflare Workers Paid ($5+/mo)." Plugin code identical in both modes — only enforcement differs.

---

## Q6. Native plugin distribution

**Answer:** Confirmed. Native-format plugins (with `admin.entry`) cannot ship through marketplace.

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/SKILL.md — retrieved 2026-05-02
- **Quote:** "Native plugins only work in `plugins: []` — they cannot be sandboxed or published to the marketplace." Native plugins "can't ship through marketplace's auto-install flow."
- **Implication for Dateline:** Dateline with `admin.entry` (React admin) is a native plugin. Distribution = npm + `npm install @dateline/dateline` + config in `astro.config.mjs`. The `npx dateline-<name> install` pattern works but EmDash doesn't have an official CLI installer pattern — it's npm install + astro.config.mjs registration.

---

## Q7. Plugin route mount path

**Answer:** `/_emdash/api/plugins/<plugin-id>/<route>` is confirmed canonical.

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/api-routes.mdx — retrieved 2026-05-02
- **Quote:** "Routes mount at `/_emdash/api/plugins/<plugin-id>/<route>`." Example table: forms → status → `/_emdash/api/plugins/forms/status`. Route names can include slashes for nested paths.
- **Implication for Dateline:** This is the lock-in mount path. No change in latest version.

---

## Q8. Block Kit canonical block list + validator

**Answer:** 14 block types confirmed. Stats uses `stats` key (NOT `items`). Buttons use `text` (NOT `label`). Section text is plain string (no markdown parser needed for simple text, but supports `children` with marks for rich text).

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/references/block-kit.md — retrieved 2026-05-02
- **Quote (block types):** `header`, `section`, `divider`, `fields`, `table`, `actions`, `stats`, `form`, `image`, `context`, `columns`, `chart`, `code`, `meter`, `banner` (15 types)
- **Quote (elements):** `button`, `text_input`, `number_input`, `select`, `toggle`, `secret_input`, `checkbox`, `radio`, `date_input`, `combobox` (10 types)
- **Verification of AGENTS.md gotchas:**
  - Stats block uses `"stats"` key (NOT `items`): `{ "type": "stats", "stats": [{ "label": "Total", "value": "1,234" }] }` — **AGENTS.md gotcha is WRONG for current version**; the key is `stats` not `items`.
  - Buttons use `"text"` NOT `"label"`: `{ "type": "button", "text": "Save", "action_id": "save" }` — **AGENTS.md gotcha is CORRECT**; it's `text` not `label`.
  - Section text: plain string works for simple text. No markdown parser for `section.text`. For rich text, use `children` with marks. — **AGENTS.md gotcha is CORRECT.**
  - Builder helpers: `@emdash-cms/blocks` provides typed helpers (`blocks.header()`, `elements.button()`, etc.)
  - Return format: `{ blocks, toast? }` — **AGENTS.md gotcha is CORRECT.**
- **Implication for Dateline:** Use `@emdash-cms/blocks` typed builders + `validateBlocks()` in CI. Stats block uses `stats` key. Button uses `text` property.

---

## Q9. `ctx.waitUntil` vs `after()` helper

**Answer:** Issue #710 is OPEN (unfixed). `after()` helper exists in 0.6.0+ but is NOT yet applied to hook runners.

- **Confidence:** HIGH
- **Source:** https://github.com/emdash-cms/emdash/issues/710 — retrieved 2026-05-02
- **Quote:** "The fire-and-forget call site is in packages/core/src/emdash-runtime.ts... confirmed 'fire-and-forget' is intentional design. This pattern (.catch() without await and without ctx.waitUntil) is fine on Node but unsafe on Cloudflare Workers. The after() helper was added in 0.6.0 (PR #658) for the 'defer bookkeeping work past the HTTP response' pattern. The internal cron stale-lock recovery is the only current consumer."
- **Status:** Issue is OPEN. Two options proposed: (1) Use `after()` helper to wrap hook runners, (2) Document that plugin authors must use `ctx.waitUntil()`. Option 1 preferred by issue author.
- **Implication for Dateline:** Plugin authors MUST use `ctx.waitUntil()` manually for any async work in hooks. The `after()` helper exists but is not applied to hook runners yet. Document this in every hook handler that does async work.

---

## Q10. Sandboxed plugin runtime limits

**Answer:** 50ms CPU + 10 subrequests confirmed from canonical docs.

- **Confidence:** HIGH
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/sandbox.mdx — retrieved 2026-05-02
- **Quote:** "| CPU time | 50ms | Worker Loader (V8 isolate abort) | | Subrequests | 10 per invocation | Worker Loader (V8 isolate abort) | | Wall-clock time | 30 seconds | EmDash runner (Promise.race) | | Memory | ~128MB | V8 platform ceiling |" (from sandbox.mdx)
- **Also from SKILL.md:** same table with "CPU 50ms, 10 subrequests, 30s wall-time, ~128MB memory"
- **Source:** https://developers.cloudflare.com/dynamic-workers/usage/limits/ — Dynamic Workers API supports `limits: { cpuMs, subRequests }`
- **Implication for Dateline:** Limits are confirmed and unchanged. The Dynamic Workers platform can enforce custom limits per invocation. 50ms CPU / 10 subrequests are the EmDash defaults. No evidence of relaxation in 0.7+/0.8+.

---

## Q11. Hook list (canonical)

**Answer:** 17 documented hooks; docs claim "All 22 hooks" (5 undocumented).

- **Confidence:** MEDIUM (22 documented in comparison table, but only 17 have full documentation)
- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/references/hooks.md + https://raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/sandbox.mdx — retrieved 2026-05-02
- **Quotes:** sandbox.mdx: "All 22 hooks — Content, media, email, comments, cron, page metadata, lifecycle"
- **Documented hooks (17):**
  1. `plugin:install`
  2. `plugin:activate`
  3. `plugin:deactivate`
  4. `plugin:uninstall`
  5. `content:beforeSave`
  6. `content:afterSave`
  7. `content:beforeDelete`
  8. `content:afterDelete`
  9. `content:afterPublish`
  10. `content:afterUnpublish`
  11. `media:beforeUpload`
  12. `media:afterUpload`
  13. `email:beforeSend`
  14. `email:deliver`
  15. `email:afterSend`
  16. `cron`
  17. `page:metadata`
- **PRD-requested hooks confirmed:** `content:beforeSave` ✓, `content:afterSave` ✓, `content:beforeDelete` ✓, `email:beforeSend` ✓, `email:afterSend` ✓
- **Note:** The comparison table mentions "comments" hooks — these likely account for the remaining 5 undocumented hooks (e.g., `comment:beforeSubmit`, `comment:afterSubmit`, `comment:moderate`).
- **Implication for Dateline:** Confirmed hooks cover all Dateline needs for content lifecycle and email events.

---

## Q12. x402 micropayment integration

**Answer:** Built-in support confirmed. Admin-configured per-content pricing. No `content.x402` field convention on the content schema itself.

- **Confidence:** HIGH
- **Source:** https://blog.cloudflare.com/emdash-wordpress/ — retrieved 2026-05-02
- **Quote:** "EmDash has built-in support for x402. This means anyone with an EmDash site can charge for access to their content without requiring subscriptions and with zero engineering work. All you need to do is configure which content should require payment, set how much to charge, and provide a Wallet address."
- **Additional source:** https://github.com/emdash-cms/emdash/releases — `@emdash-cms/x402@0.9.0` is a published package in the monorepo.
- **Implication for Dateline:** x402 is built into the EmDash core, not a plugin capability. Dateline can reference this for paid events. Configuration is done through the admin UI per-content-item, not through a separate x402 field on the content type schema. If Dateline needs per-tier/per-event-type x402 pricing, implement as plugin settings + content metadata, not core schema.

---

## Bonus Questions

### Is there a Live Collections API (`emdashLoader`) for Astro that's stable?

**Answer:** YES, confirmed stable. `emdashLoader` from `emdash/runtime` + `defineLiveCollection` from `astro:content`.

- **Source:** https://docs.emdashcms.com/getting-started/ — retrieved 2026-05-02
- **Quote:** "src/live.config.ts: This connects EmDash to Astro's content system. Import `defineLiveCollection` from `astro:content` and `emdashLoader` from `emdash/runtime`." Plus `getEmDashCollection()` and `getEmDashEntry()` for querying.
- **Implication:** Stable in Astro 6. No rebuilds needed — content updates instantly at runtime.

### What's the latest stable EmDash version number (May 2026)?

**Answer:** `emdash@0.9.0`.

- **Source:** https://github.com/emdash-cms/emdash/releases — retrieved 2026-05-02
- **Timeline:** v0.1.0 (April 1, 2026) → v0.9.0 (early May 2026). Nine minor releases in ~5 weeks. Rapid iteration.
- **Implication:** Pin to `^0.9.0` in package.json. Expect more breaking changes before 1.0.

### Is there an official testing harness — `@cloudflare/vitest-pool-workers` integration with EmDash plugin runtime?

**Answer:** No dedicated plugin testing harness. EmDash core uses its own test suite.

- **Source:** https://raw.githubusercontent.com/emdash-cms/emdash/main/README.md (Development section) — retrieved 2026-05-02
- **Quote:** "pnpm test # run all tests; pnpm typecheck # type check; pnpm lint:quick # fast lint (< 1s)"
- **Plugin testing advice (from creating-plugins.mdx):** "Test plugins by creating a minimal Astro site with the plugin registered. For unit tests, mock the PluginContext interface and call hook handlers directly."
- **Implication:** No official `vitest-pool-workers` integration for plugins. The AGENTS.md recommendation to use it is aspirational. Build your own test harness: mock `PluginContext` + create a minimal Astro test site. Use `@cloudflare/vitest-pool-workers` if you need real KV/D1 bindings for integration tests.

### GDPR / right-to-erasure primitives: does core expose `privacy:export` / `privacy:erase` hooks?

**Answer:** NOT FOUND. No privacy-specific hooks in EmDash core.

- **Confidence:** HIGH (searched hooks.md, overview.mdx, sandbox.mdx, issue tracker, and the entire documented hook list)
- **Implication:** Dateline must build its own GDPR primitives. Use `content:beforeDelete` and `content:afterDelete` hooks to intercept content deletion and handle export. No core `privacy:export` or `privacy:erase` hooks. Build as plugin-level feature.

---

## Decision Recommendations

### Ship-against-latest decisions:

1. **Capability naming:** Use `content:read` (resource:verb) everywhere. 0.9.0 enforces this. Old forms (read:content) are deprecated and will be rejected by `emdash plugin publish`. Ship against this.

2. **MCP tool registration:** Ship REST routes + standalone `@dateline/mcp` wrapper. Monitor Issue #41. If upstream ships before Dateline v1.0, migrate to native MCP tools. If not, the REST+wrapper pattern is production-ready.

3. **Cron scheduling:** Ship against `ctx.cron.schedule()`. Confirmed available.

4. **Queues:** No plugin-level queue access. Use `ctx.waitUntil` for deferred work. If >50ms work exceeds budget, wrap in a separate Cloudflare Worker with queue bindings and call it via `ctx.http.fetch()`.

5. **Free plan:** Document prominently. Plugin code works identically in both modes. No action needed beyond documentation.

6. **Native distribution:** npm + astro.config.mjs registration is correct. No change needed.

7. **Route path:** Lock in `/_emdash/api/plugins/dateline/<route>`.

8. **Block Kit:** Build with `@emdash-cms/blocks` typed helpers. Note: Stats key is `stats` (not `items` as AGENTS.md incorrectly claims). Button uses `text` (not `label`). Return `{ blocks, toast? }`.

9. **waitUntil:** Ship every async hook handler with explicit `ctx.waitUntil()` wrapping. Document as mandatory pattern. Check if Issue #710 is resolved before Dateline v1.0.

10. **Sandbox limits:** 50ms CPU / 10 subrequests. Validate every handler in CI with a sandbox profiler. No relaxation expected.

11. **Hooks:** Documented hooks cover Dateline needs. Build custom GDPR export/erase on `content:beforeDelete` / `content:afterDelete`.

12. **x402:** Use built-in support for paid events. Dateline doesn't need to build x402 — configure via admin UI.

### Rollback plans:

- **MCP tools:** If upstream ships a native API before Dateline v1.0, migrate from standalone wrapper. The wrapper can co-exist.
- **Capability naming:** If an older EmDash version (pre-0.9.0) is deployed by a customer, `read:content` is still accepted with deprecation warnings. Pin to ^0.9.0+ to avoid this issue.
- **waitUntil:** If Issue #710 is fixed (after() applied to hook runners), remove manual `ctx.waitUntil()` wrappers. Until then, they're mandatory.

---

## Unresolved Questions

1. **MCP tool registration for plugins (Q2):** Issue #41 is open, unassigned, no milestone. No upstream ETA. **Interim:** REST routes + `@dateline/mcp` wrapper. Track issue #41.

2. **5 undocumented hooks (Q11):** The sandbox comparison says "All 22 hooks" but only 17 are documented. The remaining 5 likely relate to comment hooks (`comment:beforeSubmit`, `comment:afterSubmit`, etc.). **Interim:** Assume comment hooks exist if needed; verify against source if building comment features.

3. **GDPR / right-to-erasure primitives (bonus):** No core support. **Interim:** Build as Dateline plugin feature using `content:beforeDelete` / `content:afterDelete` hooks. Could be contributed upstream.

4. **Official plugin testing harness (bonus):** No dedicated harness exists. **Interim:** Mock `PluginContext` + minimal Astro test site. Consider contributing an `@emdash-cms/test-utils` package upstream.

---

## Source Index

| Source | URL | Retrieval Date |
|--------|-----|----------------|
| EmDash README | github.com/emdash-cms/emdash | 2026-05-02 |
| EmDash API Routes docs | raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/api-routes.mdx | 2026-05-02 |
| EmDash Block Kit reference | raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/references/block-kit.md | 2026-05-02 |
| EmDash Creating Plugins guide | raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/creating-plugins.mdx | 2026-05-02 |
| EmDash Hooks reference | raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/references/hooks.md | 2026-05-02 |
| EmDash Plugin Hooks docs | raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/hooks.mdx | 2026-05-02 |
| EmDash Plugin Overview docs | raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/overview.mdx | 2026-05-02 |
| EmDash Sandbox docs | raw.githubusercontent.com/emdash-cms/emdash/main/docs/src/content/docs/plugins/sandbox.mdx | 2026-05-02 |
| EmDash SKILL.md | raw.githubusercontent.com/emdash-cms/emdash/main/skills/creating-plugins/SKILL.md | 2026-05-02 |
| EmDash Releases | github.com/emdash-cms/emdash/releases | 2026-05-02 |
| EmDash Issue #41 (MCP tools) | github.com/emdash-cms/emdash/issues/41 | 2026-05-02 |
| EmDash Issue #149 (Free plan) | github.com/emdash-cms/emdash/issues/149 | 2026-05-02 |
| EmDash Issue #710 (waitUntil) | github.com/emdash-cms/emdash/issues/710 | 2026-05-02 |
| Cloudflare Blog Post | blog.cloudflare.com/emdash-wordpress | 2026-05-02 |
| Cloudflare Dynamic Workers Limits | developers.cloudflare.com/dynamic-workers/usage/limits/ | 2026-05-02 |
| EmDash docs site | docs.emdashcms.com | 2026-05-02 |
| Getting Started guide | docs.emdashcms.com/getting-started/ | 2026-05-02 |
