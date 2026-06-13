# Migration Guide: v0.1 → v0.2

## What this guide is

Dateline v0.1 shipped against EmDash 0.9 and documented an install flow built on APIs and config shapes that **never actually existed** in a shipping EmDash release (a standalone `emdash.config.ts` with plugin factory functions, per-binding capability manifest variables, a `ctx.waitUntil` plugin primitive). Following the v0.1 docs verbatim would not produce a working site.

**v0.2 is the first release whose documented installation flow actually works.** It rebuilds the three plugins on EmDash **0.18** using the real single-file sandboxed plugin format, and rewrites every doc against verified platform behavior (see [VERIFIED-PLATFORM-0.18.md](VERIFIED-PLATFORM-0.18.md)). Treat this document as the **first real installation guide** as much as a migration guide: if you tried v0.1 and could not get it running, start fresh from [docs/installation.md](docs/installation.md).

## Summary of changes

| Area | v0.1 (as documented) | v0.2 (real, verified) |
|---|---|---|
| EmDash version | `^0.9.0` | `^0.18` |
| Plugin format | `definePlugin()` factory + `index.ts`/`sandbox-entry.ts` split | single-file: `emdash-plugin.jsonc` + `src/plugin.ts` (`SandboxedPlugin`) |
| Registration | `emdash.config.ts` with `plugins: [createCorePlugin()]` | `emdash()` integration in `astro.config.mjs`; `sandboxed: [core, rsvp, importer]` (default imports, not factory calls) + a `sandboxRunner` |
| Capability declaration | per-binding `EMDASH_PLUGIN_MANIFEST_*` vars in `wrangler.jsonc` | declared in each plugin's `emdash-plugin.jsonc`; travels with the plugin build |
| RSVP capacity | `ctx.kv.atomicIncrement` / `atomicDecrement` (no such API) | storage-backed claim records + conflict checks, oversell-tested |
| Deferring work | `ctx.waitUntil()` as a plugin primitive | not in the sandboxed `ctx`; host-level concern only |
| Importer network | `network:request` + `allowedHosts` | `network:request:unrestricted` (operators paste arbitrary feeds) |
| Block Kit shapes | Stats `stats`, buttons `text`, toasts `text` | Stats `items`, buttons/columns `label`, toasts `message` |
| Capability names | mixed | resource:verb (`content:read`) only |

## Step-by-step migration

### 1. Bump EmDash and add the sandbox runner

```bash
pnpm add emdash@^0.18 @emdash-cms/sandbox-workerd@^0.1.6
```

All Dateline packages now peer-depend on `emdash@^0.18`; no `^0.9` pin should remain.

### 2. Delete `emdash.config.ts`

There is no standalone EmDash config file. Plugin registration moves into your `astro.config.mjs` via the `emdash()` integration. Remove any `import createCorePlugin from "@dateline/core"` factory imports — the plugins are now **default imports** passed to `sandboxed: [...]`.

### 3. Register plugins in `astro.config.mjs`

```mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

import core from "@dateline/core";
import rsvp from "@dateline/rsvp";
import importer from "@dateline/importer";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" }),
      sandboxed: [core, rsvp, importer],
      sandboxRunner: "@emdash-cms/sandbox-workerd",
    }),
  ],
});
```

See [docs/installation.md](docs/installation.md) for the Cloudflare deploy branch (`d1()` / `r2()` / `sandbox()` from `@emdash-cms/cloudflare`).

### 4. Remove `EMDASH_PLUGIN_MANIFEST_*` from `wrangler.jsonc`

Capabilities are declared in each plugin's `emdash-plugin.jsonc` and bundled with the plugin — there are no per-binding capability variables. Your `wrangler.jsonc` should declare `d1_databases`, `r2_buckets`, and `worker_loaders` (the `LOADER` Dynamic Worker Loader binding), not manifest vars.

### 5. Rewrite custom plugins to the single-file format

If you wrote your own Dateline-style plugin with `definePlugin()`:

- Move the manifest fields into `emdash-plugin.jsonc`.
- Put hooks + routes in `src/plugin.ts`, default-exported as `SandboxedPlugin` using the named-const form (`const plugin: SandboxedPlugin = {...}; export default plugin;` — the `satisfies` form breaks d.ts generation).
- Do **not** annotate hook handler params.
- Replace any `ctx.kv.atomicIncrement`/`atomicDecrement` with storage-backed counters (KV has no atomic ops).
- Remove `ctx.waitUntil` — it is not in the sandboxed `ctx`; complete work within the invocation budget.

### 6. Update Block Kit field names

If you build admin UIs, switch to upstream 0.18 shapes: Stats `items`, buttons/columns `label`, toasts `message`.

## Known limitations (v0.2 Cloudflare deploy path)

The local dev and Playwright e2e flows are fully working on EmDash 0.18. Two limitations apply to the **Cloudflare deploy path** and must be addressed before production:

1. **No email transport on the Cloudflare build.** The dev/e2e mock `email:deliver` transport is a Node-filesystem plugin and is intentionally omitted from the Cloudflare build (it cannot run on Workers). RSVP confirmation emails will **not** be delivered on Cloudflare until you wire a Workers-compatible `email:deliver` transport — a provider HTTP API such as Cloudflare Email Service.

2. **Local `wrangler dev` does not exercise real sandbox isolation.** `wrangler dev` (miniflare) does not satisfy EmDash's Dynamic Worker Loader probe even though the `worker_loaders` `LOADER` binding binds, so plugins run **in-process** locally. The local preview validates routes and data only; true sandbox isolation must be validated against a real Workers **Paid** deployment. (On the Free plan, Dynamic Workers are unavailable everywhere, so the capability boundary is never enforced — the isolation pitch is Paid-only.)

3. **Reference-site importer dedup is slug-based.** The reference site's importer adapter ([`examples/reference-site/src/lib/importer-content.ts`](examples/reference-site/src/lib/importer-content.ts)) dedupes by the importer-derived **slug**, not `sourceId`, because the `dateline_events` collection has no `source_id` column. Distinct `sourceId`s that slugify identically will collapse into one event. Sites needing exact-`sourceId` dedup should register a `source_id` field on `dateline_events` (or store a hash) and dedup on that.

## See also

- [docs/installation.md](docs/installation.md) — the real install + deploy walkthrough
- [docs/capabilities-and-security.md](docs/capabilities-and-security.md) — capability model, `ctx` surface, measured budgets
- [docs/plugin-development.md](docs/plugin-development.md) — single-file sandboxed plugin format
- [VERIFIED-PLATFORM-0.18.md](VERIFIED-PLATFORM-0.18.md) — measured 0.18 platform facts
- [CHANGELOG.md](CHANGELOG.md) — per-package change log
