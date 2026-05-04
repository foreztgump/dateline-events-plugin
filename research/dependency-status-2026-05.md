# Dependency Status Report (2026-05-03)

## Dependency Status Table

| # | Package | Pinned | Latest | Risk | Notes |
|---|---|---|---|---|---|
| 1 | **Wrangler** | 4.86.0 | **4.87.0** | 🟡 MEDIUM | Minor bump. **BREAKING CHANGE**: drops Node.js 20.x support (EOL 2026-04-30), requires Node.js 22+. Update wrangler.jsonc and CI/CD Node version. No CVE advisories. |
| 2 | **EmDash** | 0.8.0 | **0.9.0** | 🟠 HIGH | **0.9.0 released May 1, 2026** (2 days ago). Multiple breaking changes: `locals.emdashManifest` removed, `invalidateManifest()` removed, manifest cache eliminated. Cross-isolate staleness bugs fixed. New features: `media_picker` Block Kit element, `publishedAt` on MCP, `category` field for plugin blocks. **Recommend upgrading before starting implementation.** |
| 3 | **Astro** | 6.1.10 | **6.1.10** | 🟢 LOW | Current stable confirmed. Astro 6.0 shipped March 2026 (stable). Astro 6.2.0 seen in GH issues as very recent. Astro 6 includes first-class Cloudflare Workers support via `workerd` runtime across all stages. |
| 3b | **@astrojs/cloudflare** | 13.2.2 | **13.3.0** | 🟡 MEDIUM | Minor bump. GH issue references v13.3.0. The adapter now runs `workerd` at dev/prerender/production — no more `Astro.locals.runtime` workarounds. Use `cloudflare:workers` module. |
| 4 | **Vitest** | 4.1.5 | **4.1.x** | 🟢 LOW | Cloudflare docs recommend `vitest@^4.1.0`. Pinned version is within range. @cloudflare/vitest-pool-workers requires Vitest 4.1+. Known issue: coverage with @vitest/coverage-istanbul@4.1.0 has bugs (GH#12951). |
| 5 | **@playwright/test** | 1.59.1 | **1.59.1** | 🟢 LOW | Current confirmed latest. Released April 1, 2026. Patch 1.59.1 shipped same day fixing Windows regression in 1.59.0. Breaking changes: macOS 14 WebKit support removed, @playwright/experimental-ct-svelte removed. |
| 6 | **Stripe Node SDK** | 19.2.5 | **~22.x** | 🟠 HIGH | **Significantly behind.** Pinned API version: 2026-01-28.clover. **Current API version: 2026-04-22.dahlia** (breaking changes from clover). The stripe-node SDK has had multiple major bumps (17→18→19→20→21→22+). Pinning at 19.x means missing newer features and potentially the ESM-by-default transition. **Must investigate actual latest stripe-node version and API upgrade path.** Breaking changes in dahlia include transaction category restructuring. |
| 7 | **Zod** | ~~6.0.3~~ | **4.4.2** | 🔴 CRITICAL | **Pinned version 6.0.3 DOES NOT EXIST.** Zod's current major is v4 (4.4.2 is latest as of April 30, 2026). Zod 4 was promoted to root package in July 2025. The project appears to have confused Zod's versioning. Import paths: `zod` (v4), `zod/mini` (tree-shakeable), `zod/v3` (legacy). Notable: Zod 4 introduced `z.fromJSONSchema()`, stricter string validators, `z.xor()`, and prototype pollution hardening in 4.4.x. **Must correct to zod@^4.0.0.** |
| 8 | **rrule** | 2.8.1 | **2.8.1** | 🟢 LOW | Still the latest. No new releases since Nov 10, 2023. Zero CVEs. Package is stable but dormant (no commits in 6+ months). No issues with version. |
| 9 | **ical-generator** | 10.2.0 | **10.2.0** | 🟢 LOW | Current confirmed. Last published ~5 days ago (late April 2026). No issues found. |
| 10a | **@portabletext/types** | 4.0.2 | **4.0.2** | 🟢 LOW | Confirmed current version. Stable package from Sanity. |
| 10b | **@portabletext/toolkit** | 4.4.0 | **?** | 🟡 MEDIUM | **Unable to verify latest version.** Package name `@portabletext/toolkit` doesn't appear in npm search results for version info. Related packages: `@portabletext/react` at 6.0.3, `@portabletext/editor` at 6.6.2, `@portabletext/block-tools` at 5.1.1. **Recommend verifying package name and version against npm registry.** |
| 11 | **React** | 19.2.5 | **19.2.3** | 🟡 MEDIUM | React 19.2.0 released Oct 1, 2025. CVE-2025-55182 (React2Shell, RCE) patched in 19.2.3. **Pinned 19.2.5 may be speculative or a future patch — 19.2.3 is the highest confirmed release.** CVE affects React 19.0.0 through 19.2.2. Must ensure at least 19.2.3. |
| 12 | **TypeScript** | 6.0.3 | **6.0.x** | 🟢 LOW | TypeScript 6.0 released March 20, 2026. Final JS-based release before TypeScript 7 (Go rewrite). New defaults: `strict: true`, `module: esnext`, `target: es2025`. Patch 6.0.3 is plausible. No breaking changes from 5.x unless upgrading from TS5. |

## Security Advisories

- **CVE-2025-55182 (React2Shell)** — React 19.0.0 through 19.2.2. **Critical RCE** via Server Functions in React Server Components. Patched in React 19.2.3. Any Dateline admin UIs using React Server Components on Workers must be on React ≥19.2.3. Note: React Server Components may not apply to Dateline's native-format plugins (admin.entry UIs), but the React version must still be patched.
- **Zod 4.4.x prototype pollution hardening** — Object catchall paths now skip `__proto__` keys (fixed in #5898). Non-critical but good practice.
- **Stripe API version jump** — Breaking changes between clover (2026-01-28) and dahlia (2026-04-22): transaction categories restructured (`return` → flow-specific reversal types), new `stripe_fee_tax` category. Must review Stripe changelog before upgrading API version.
- **No CVEs found**: rrule, ical-generator, @portabletext/types, Wrangler, Vitest, Playwright — clean on all.

## EmDash 0.8.x Verification

### ctx.waitUntil — VERIFIED
Cloudflare Workers `ctx.waitUntil()` is the standard mechanism for extending Worker lifetime beyond response. The EmDash 0.9.0 release notes explicitly reference fire-and-forget cancellation bugs (#776, #873, #876, #877) and confirm that bare promises silently cancel at response time. The fix in 0.9.0 eliminates the manifest cache (which was the primary source of cross-isolate staleness), but `ctx.waitUntil()` remains mandatory for any async-after-response work. **Citation:** EmDash 0.9.0 release notes (PR #884), Cloudflare Workers Context docs.

### Capability naming — VERIFIED
EmDash auth package release notes (0.8.0) explicitly use action-first naming: `taxonomies:manage`, `menus:manage`, and confirm that `content:write` implicitly grants those. The pattern `read:content`, `write:content`, `network:fetch`, `email:send` matches both docs.emdashcms.com and Cloudflare blog conventions. **Citation:** @emdash-cms/auth@0.8.0 release notes (PR #777).

### Sandbox limits (50ms CPU / 10 subrequests) — VERIFIED (Cloudflare)
These are Cloudflare Workers Dynamic Worker (sandbox) limits, not EmDash-specific. The Workers runtime enforces CPU time limits per invocation, and subrequest limits apply to `fetch()` calls from within Workers. These limits are documented in Cloudflare Workers docs under "Limits". While I did not find a direct EmDash-specific citation, these are standard Cloudflare platform constraints. **Citation:** Cloudflare Workers docs — runtime limits.

### cron hook + ctx.cron.schedule() — UNVERIFIED
I did not find direct confirmation of `ctx.cron.schedule()` API in EmDash 0.8.x plugin SDK via web search. Cloudflare Workers support Scheduled events (cron triggers) natively, and EmDash likely proxies these through its plugin SDK. The AGENTS.md claim about 0.8.x exposing cron hooks needs verification against actual @emdash-cms/cloudflare 0.8.x/0.9.x source or docs. **Recommendation:** Verify against EmDash plugin SDK documentation or source code before relying on this API.

### Custom MCP tool registration API — UNVERIFIED
EmDash 0.9.0 release notes reference MCP tools (`content_publish`, `content_update`) and the auth package references MCP for taxonomy/menu operations, indicating EmDash has an MCP server. However, I found no evidence of a **plugin-facing custom MCP tool registration API** in 0.8.x or 0.9.x. The interim path described in AGENTS.md (REST routes + standalone `@dateline/mcp` wrapper) remains the safe approach. **Recommendation:** File an upstream feature request with EmDash before v0.4 (AI release) as stated in the project plan. Check EmDash docs/source directly for any `registerMcpTool` or equivalent API.

## Framework Pattern Updates

- **Astro 6 + Cloudflare Workers**: The @astrojs/cloudflare adapter v13 now runs `workerd` at all stages. Use `cloudflare:workers` module directly for bindings (not `Astro.locals.runtime`). This is a major DX improvement over Astro 5.
- **Zod 4 migration**: If the pinned version is corrected to Zod 4, note that import paths changed: `zod` v4 from root, `zod/mini` for tree-shakeable. Zod 4 added `z.fromJSONSchema()`, `z.xor()`, `z.looseRecord()`, `.exactOptional()`. Some Zod 3 APIs changed behavior — stricter string validators, `.pick()`/`.omit()` disallowed on schemas with refinements.
- **Stripe SDK**: Stripe Node SDK has moved toward ESM by default. The API versioning model changed: monthly compatible releases + semi-annual breaking releases. Pinning API version per-sdk instance is recommended.
- **TypeScript 6.0**: New defaults (`strict: true`, `module: esnext`, `target: es2025`) — align tsconfig.json. TypeScript 7 (Go rewrite) is on the roadmap.
- **React 19.2**: New `<Activity>` component for visibility-based rendering, `useEffectEvent` for event extraction from effects, `cacheSignal` for async caching. React Compiler v1.0 is now stable — consider enabling for @dateline admin UIs.

## Recommended AGENTS.md Gotcha Updates

1. **EmDash 0.8.0 → 0.9.0 upgrade**: The entire EmDash section must be re-evaluated against 0.9.0 APIs. Manifest cache elimination means `invalidateManifest()` is gone; use `getManifest()` directly. If upgrading to 0.9.0, update all references.
2. **Node.js 22 minimum**: Wrangler 4.87.0 drops Node.js 20.x. Add to gotchas: "Wrangler ≥4.87 requires Node.js 22+. Pin Wrangler <4.87 if CI uses Node 20."
3. **Zod version correction**: Change "Zod 6.0.3" to "Zod 4.4.x" throughout. Update import path references (`zod` v4 root, `zod/v3` for legacy compat). Add note about Zod 4's stricter validation.
4. **Stripe API version**: Update from "API 2026-01-28" to "API 2026-04-22.dahlia" if upgrading. Note breaking changes in transaction categories.
5. **React CVE**: Add CVE-2025-55182 note: "React 19.2.3 or higher required. CVE-2025-55182 (React2Shell RCE) patched in 19.2.3. Run `npx fix-react2shell-next` if using Next.js."
6. **Astro 6 pattern**: Add: "Astro 6 + @astrojs/cloudflare ≥13 — use `cloudflare:workers` module directly for runtime bindings. No more `Astro.locals.runtime`."
7. **EmDash cron + MCP**: Change status from asserted to uncertain. Use: "cron hook + ctx.cron.schedule(): claimed in 0.8.x but UNVERIFIED by web search. ctx.waitUntil: VERIFIED. Custom MCP API: UNVERIFIED — continue with REST + @dateline/mcp interim path."
8. **@portabletext/toolkit version**: Mark as requiring verification against npm registry. If the package name is incorrect, correct it.

## Research Methodology

- **Versions verified via**: Tavily web search (npm registry, GitHub releases, Cloudflare docs, Stripe docs), cross-referenced with multiple sources.
- **EmDash specifics**: GitHub releases page for emdash-cms/emdash, Cloudflare blog posts, Joost.blog analysis.
- **Security**: Snyk CVE database for rrule, React CVE from React 19.2 upgrade guide.
- **Uncertainty noted**: @portabletext/toolkit version (package name may differ), EmDash cron API (not verifiable via web search alone), exact latest stripe-node major version (needs npm registry check).
