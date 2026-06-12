# EmDash 0.18 Platform Research — Dateline Modernization

**Date:** 2026-06-11
**Researcher:** research-droid (subagent of Dateline modernization)
**Scope:** Verify the 10 questions in the parent task against the live EmDash docs, registry, and release notes.
**Sources verified via:** Tavily web extract (`https://docs.emdashcms.com/*`, `https://github.com/emdash-cms/emdash`), direct npm registry fetch (`https://registry.npmjs.org/{pkg}/{latest,...}`), and GitHub releases page.

## Executive summary

The PRD's mental model of EmDash 0.17+ is largely correct, but several PRD assumptions are **wrong**:

- **WRONG (PRD said "current" — actually already removed):** `definePlugin()`, the `PluginDescriptor` factory, and the `index.ts + sandbox-entry.ts` two-file split. 0.18.0's standard-plugin shape is a bare default export with `satisfies SandboxedPlugin` from `emdash/plugin`, built into a single `src/plugin.ts` paired with a hand-edited `emdash-plugin.jsonc`. The migrating-to-the-cli page is explicit.
- **WRONG (PRD said "native-only in 0.17"):** `ctx.cron.schedule()` and the `plugin:activate` hook. Both are real in 0.18 for sandboxed plugins; `plugin:activate` / `plugin:install` / `plugin:uninstall` are first-class hooks; cron uses `ctx.cron.schedule()` to register tasks fired by the `cron` hook.
- **WRONG (PRD said "invented"):** `hooks.email-events:register` and `hooks.email-transport:register` capabilities. They are real; `email:send` is also real, but it is gated on another plugin having registered an `email:deliver` transport.
- **CONFIRMED INVENTED:** `ctx.kv.atomicIncrement/Decrement` is NOT in the API. `ctx.kv` exposes only `get/set/delete/list(prefix)`. The PRD's planned fall-back (D1's own atomicity or non-atomic check-then-decrement) is the only path.
- **CORRECT (PRD assumption):** `emdash({ plugins, sandboxed, sandboxRunner })` in `astro.config.mjs`; manifest is `emdash-plugin.jsonc`; plugin-cli provides `init/build/dev/validate/bundle/publish/login`.

**All 10 questions answered below with VERIFIED (with source URL), LIKELY (indirect evidence), or UNRESOLVED (probe required) tags.**

---

## Q1. Latest versions on npm

**VERIFIED** — pulled from `https://registry.npmjs.org/{pkg}/latest` and the per-package `time` map.

| Package | `latest` | Released | Notes |
|---|---|---|---|
| `emdash` | **0.18.0** | 2026-06-11 | Replaces `0.17.2` (2026-06-05). Patch-level for plugin authors (per 0.18.0 release notes PRs #1391, #1405, #1407, #1408, #1409). |
| `@emdash-cms/blocks` | **0.18.0** | 2026-06-11 | Same release train as `emdash`. Same name as in 0.9.0, so the PRD's "bump not migration" call is correct. |
| `@emdash-cms/plugin-cli` | **0.5.1** | 2026-06-03 | Released 8 days **before** `emdash@0.18.0`. No new `plugin-cli` shipped in the 0.18.0 release train. Last six versions: 0.1.0 (2026-05-18), 0.2.0 (2026-05-19), 0.3.0 (2026-05-20), 0.4.0 (2026-05-28), 0.5.0 (2026-06-01), 0.5.1 (2026-06-03). |
| `@emdash-cms/cloudflare` | **0.18.0** | 2026-06-11 | Provides `d1()`, `r2()`, `access()` auth, and `sandbox()` runner (used as `sandboxRunner` in `emdash()`). |
| `@emdash-cms/sandbox-workerd` | **0.1.6** | 2026-06-11 | Workerd-based local sandbox runner (separate package from `@emdash-cms/cloudflare`). Listed in 0.18.0 release notes. |

**No 0.18.x patch has been published after 0.18.0 itself** as of 2026-06-11 — `0.18.0` is the only 0.18.x release on `latest`.

**Implication:** `emdash@^0.18` resolves to `0.18.0` only. The "0.17 → 0.18 is patch-level for plugin authors" claim is true at the runtime/ctx/hooks level, but the `migrating-to-the-cli` doc captures a real source-shape change for the standard plugin format. See Q2.

Sources:
- https://registry.npmjs.org/emdash/latest
- https://registry.npmjs.org/@emdash-cms/blocks/latest
- https://registry.npmjs.org/@emdash-cms/plugin-cli/latest
- https://registry.npmjs.org/@emdash-cms/cloudflare/latest
- https://github.com/emdash-cms/emdash/releases

---

## Q2. Sandboxed plugin format in 0.17/0.18

**VERIFIED — and the PRD's description is partially outdated.** Sources:
- https://docs.emdashcms.com/plugins/creating-plugins/your-first-plugin
- https://docs.emdashcms.com/plugins/creating-plugins/manifest
- https://docs.emdashcms.com/plugins/creating-plugins/migrating-to-the-cli

### Two-file → one-file split

The earlier (0.16/0.17) shape used `src/index.ts` (a `PluginDescriptor` factory) + `src/sandbox-entry.ts` (the `definePlugin({hooks,routes})` runtime). The current (0.18) shape is **one** runtime file, `src/plugin.ts`, plus a hand-edited manifest, `emdash-plugin.jsonc`. The `entrypoint` and `format` fields on the descriptor are gone; the build wires them up. Verbatim from the migrating-to-the-cli page:

> "A plugin is now one runtime file, `src/plugin.ts` (hooks and routes), and one hand-edited manifest, `emdash-plugin.jsonc` (identity and the trust contract). The `entrypoint` and `format` fields are gone; the build wires them up."

The "Removed" section explicitly enumerates **removed** exports from `emdash`: `StandardPluginDefinition`, `StandardHookHandler`, `StandardHookEntry`, `StandardRouteHandler`, `StandardRouteEntry`, and `isStandardPluginDefinition`. These were aliases for the previous `definePlugin` shape.

### Default export shape (the 0.18 standard)

```ts
import type { SandboxedPlugin } from "emdash/plugin";
import { z } from "astro/zod";

export default {
  hooks: {
    "content:afterSave": {
      handler: async (event, ctx) => { /* no annotations */ },
    },
  },
  routes: {
    status: { handler: async (routeCtx, ctx) => ({ ok: true }) },
    submissions: {
      input: z.object({ formId: z.string().optional() }),
      handler: async (routeCtx, ctx) => ({...}),
    },
  },
} satisfies SandboxedPlugin;
```

Critical details that contradict the PRD:
- `SandboxedPlugin` is now imported from **`emdash/plugin`** (a type-only subpath the bundler erases), not from `emdash`. The runtime handle returned by `SandboxRunner.load` is renamed to `SandboxedPluginInstance` — this matters only for custom runner authors.
- Hook handler parameters **must not be annotated**; TS infers `event` and `ctx` from the hook name. Narrower custom event types no longer type-check — you validate fields at runtime with `typeof` or a guard. Quoting: "A handler's `event` is always the canonical type for that hook. Annotating a handler with a narrower interface no longer type-checks."

### Manifest (`emdash-plugin.jsonc`)

Required fields (per the manifest reference page):
- `slug` — plugin identity. Must match `/^[a-z][a-z0-9_-]*$/`. NOT the npm package name.
- `publisher` — DID (`did:plc:…`) or handle. Pinned on first publish; CLI enforces `MANIFEST_PUBLISHER_MISMATCH` on every subsequent publish.
- `license` — SPDX expression (e.g. `"MIT"`, `"Apache-2.0"`). Required.
- `author` (singular, `name/url?/email?`) **or** `authors` (plural, ≤ 32) — required, setting both is an error.
- `security` (singular) **or** `securityContacts` (plural, ≤ 8) — required, each needs `email` or `url`.

Optional but PRD-relevant:
- `version` — preferred to **omit** for npm-distributed plugins; reconciled against `package.json#version` at build time. Required for registry-only plugins (no `package.json`).
- `capabilities: string[]` — defaults to `[]`.
- `allowedHosts: string[]` — defaults to `[]`. Required (non-empty) for `network:request`; must be empty for `network:request:unrestricted`.
- `storage: Record<name, { indexes?: string[]; uniqueIndexes?: string[] }>` — collection name matches `/^[a-z][a-z0-9_]*$/`; used as SQL table suffix.
- `admin: { pages?: [{ path, label, icon }]; widgets?: [{ id, title, size }] }` — declares admin surfaces; plugin must serve an `admin` route in `src/plugin.ts`.
- `name` (display), `description` (≤ ~140 chars), `keywords` (≤ 5), `repo` (https URL).

### CLI enforcement rules

- `network:request` **requires** non-empty `allowedHosts`; if the plugin must reach any host, use `network:request:unrestricted` with empty `allowedHosts`.
- Duplicate keys and unknown keys are errors at validate time (strict schema).
- A plugin that declares `admin.pages` or `admin.widgets` must also serve an `admin` route — the runtime checks this.

### `$schema` hint

The migrating-to-the-cli page shows: `"$schema": "./node_modules/@emdash-cms/plugin-cli/schemas/emdash-plugin.schema.json"`. Use this in the manifest for editor autocompletion.

### Entrypoint / package.json shape

The plugin package must export `./sandbox` (the built runtime file, typically `./dist/plugin.mjs`) and, when distributed via npm, also `.` (the descriptor module emitted as `dist/index.mjs`). `files: ["dist", "emdash-plugin.jsonc"]` is required for shipping.

---

## Q3. Verified `ctx` surface for sandboxed plugins

**VERIFIED** — from the Hook Reference page (`/reference/hooks`) and `your-first-plugin`. The full `PluginContext` interface is:

```ts
interface PluginContext {
  plugin: { id: string; version: string };
  storage: PluginStorage;                 // always present, scoped to plugin id
  kv: KVAccess;                            // always present, scoped to plugin id
  content?: ContentAccess;                 // requires content:read or content:write
  media?: MediaAccess;                     // requires media:read or media:write
  http?: HttpAccess;                       // requires network:request (or :unrestricted)
  users?: UserAccess;                      // requires users:read
  cron?: CronAccess;                       // requires no explicit capability (per Hooks ref)
  email?: EmailAccess;                     // requires email:send AND a transport registered
  log: LogAccess;                          // always present (info/warn/error)
  site: { name: string; url: string; locale: string };
  url(path: string): string;
}
```

### Each property

- **`ctx.storage.<collectionName>`** — typed `StorageCollection<T>` with `get/put/delete/exists/getMany/putMany/deleteMany/query/count`. `query` is **index-only** (queries on non-indexed fields throw). `orderBy` accepts `Record<field, "asc"|"desc">`. `limit` default 50, max 1000. Pagination via `cursor` + `hasMore`. (`where` operators: `gt/gte/lt/lte`, `in`, `startsWith`, plus exact match.)
- **`ctx.kv`** — `get/set/delete/list(prefix)`. Per-plugin scoping is **automatic and structural** (no capability needed). Cross-plugin KV access is impossible. **No atomic helpers** — `atomicIncrement`/`atomicDecrement` are not in the API.
- **`ctx.http.fetch(url, init?)`** — only way out of the sandbox. **Direct `fetch()` is blocked by the runner.** `ctx.http` is populated only when the corresponding capability is declared.
- **`ctx.cron.schedule(name, schedule, data?)`** — real API in 0.18, used with the `cron` hook. `schedule` is a croner-formatted string (EmDash's `croner` dep). The reference example:
  ```ts
  hooks: {
    "cron": async (event, ctx) => {
      if (event.name === "daily-sync") {
        const data = await ctx.http?.fetch("https://api.example.com/data");
        ctx.log.info("Sync complete");
      }
    },
  }
  ```
  ```ts
  // somewhere in install/activate
  ctx.cron.schedule("daily-sync", "0 0 * * *");
  ```
  Event shape: `{ name; data?; scheduledAt: ISO string }`. **The PRD's "ctx.cron.schedule() is invented" call is WRONG** — it exists in 0.18 for sandboxed plugins.
- **`ctx.email.send(msg)`** — real, but **gated by configuration**: a plugin can declare `email:send` but `ctx.email` is only populated if some other plugin has registered an `email:deliver` transport. The reference is explicit: "A plugin can declare `email:send`, but `ctx.email` will only be populated if some other plugin has registered an `email:deliver` transport."
- **`ctx.log`** — `info/warn/error` with structured fields.
- **Post-response primitive:** The docs do not expose a `waitUntil` or `after` primitive on `ctx`. Bare promises returned from a hook that exceed the runner's wall-clock limit are aborted. (The PRD's "ctx.waitUntil(…)" claim from earlier research is about the **host** Astro/Worker, not a per-plugin primitive — sandboxed plugins run inside the host's request lifecycle. PRD assumption "ctx.waitUntil is for any async work that continues past the response" still applies at the host level.)

### What the sandbox enforces (per the capabilities page)

1. Capability gating (the factory only populates `ctx.content`/`ctx.media`/`ctx.http`/`ctx.users`/`ctx.email` when declared).
2. Storage and KV scoping by plugin id.
3. Network isolation (no `fetch()` except via `ctx.http.fetch`).
4. **No host bindings** — sandboxed plugins don't see env vars, filesystem, or platform bindings.
5. Resource limits per runner (Cloudflare: 50 ms CPU, 10 subrequests, 30 s wall-clock, ~128 MB memory).

---

## Q4. Hooks and route/admin-page registration in 0.18

**VERIFIED** — sources: `/reference/hooks` and `/plugins/creating-plugins/manifest` (admin section) and `/plugins/creating-plugins/api-routes`.

### Hook IDs (full list from `/reference/hooks`)

| Hook | Trigger | Can Modify | Exclusive |
|---|---|---|---|
| `content:beforeSave` | Before save | Content data | No |
| `content:afterSave` | After save | Nothing | No |
| `content:beforeDelete` | Before delete | Can cancel | No |
| `content:afterDelete` | After delete | Nothing | No |
| `media:beforeUpload` | Before upload | File metadata | No |
| `media:afterUpload` | After upload | Nothing | No |
| `cron` | Scheduled task fires | Nothing | No |
| `email:beforeSend` | Before delivery | Message, can cancel | No |
| `email:deliver` | Email transport | Nothing | **Yes** |
| `email:afterSend` | After delivery | Nothing | No |
| `comment:beforeCreate` | Before store | Comment, can cancel | No |
| `comment:moderate` | Decide approval | Status | **Yes** |
| `comment:afterCreate` | After store | Nothing | No |
| `comment:afterModerate` | After status change | Nothing | No |
| `page:metadata` | Page head | Tags | No |
| `page:fragments` | Page body | Scripts | No (native only per docs) |
| `plugin:install` | First install | Nothing | No |
| `plugin:activate` | Plugin enabled | Nothing | No |
| `plugin:deactivate` | Plugin disabled | Nothing | No |
| `plugin:uninstall` | Plugin removed | Nothing | No |

**The PRD's "plugin:activate is invented" call is WRONG.** It's a real lifecycle hook in 0.18, alongside `plugin:install` / `plugin:activate` / `plugin:deactivate` / `plugin:uninstall`. Use them for setup, teardown, capacity sweeps etc.

### Hook config shape

```ts
"content:beforeSave": {
  priority: 50,            // default 100; lower runs first
  timeout: 10000,          // default 5000 ms
  dependencies: [],        // plugin IDs that must run first
  errorPolicy: "abort",    // "continue" or "abort" (default)
  handler: async (event, ctx) => {...},
}
```

Or shorthand: `"content:afterSave": async (event, ctx) => {...}`.

### Routes (sandboxed and native — same shape, same runtime)

Routes are mounted at `/_emdash/api/plugins/<slug>/<route-name>` where `<slug>` is the manifest's slug (also exposed as `ctx.plugin.id`). The handler signature is `(routeCtx, ctx)` with `routeCtx = { input, request, requestMeta }`. `input` is parsed from the `input` Zod schema declared on the route.

```ts
export default {
  routes: {
    status: { handler: async (_routeCtx, ctx) => ({ ok: true }) },
    submissions: {
      input: z.object({ formId: z.string().optional(), limit: z.number().default(50) }),
      handler: async (routeCtx, ctx) => {
        const { submissions } = ctx.storage;
        return await submissions.query({ where: { formId: routeCtx.input.formId } });
      },
    },
  },
} satisfies SandboxedPlugin;
```

### Admin pages (sandboxed) — Block Kit

`emdash-plugin.jsonc` declares:
```jsonc
"admin": {
  "pages":  [{ "path": "/gallery",  "label": "Gallery",         "icon": "image" }],
  "widgets":[{ "id": "recent",      "title": "Recent uploads",  "size": "half" }]
}
```
A plugin that declares `admin.pages` or `admin.widgets` must also serve an `admin` route in `src/plugin.ts` that returns Block Kit content (`{ blocks, toast? }` shape; use `@emdash-cms/blocks` typed builders + `validateBlocks()` in CI per the PRD's gotcha list).

### Native-only admin (React, page fragments, PT components)

Native plugins use `createPlugin()` (or `definePlugin()` with explicit `id`/`version`) and are loaded in-process. They support:
- `admin.entry: { title, route?, widget? }` + a `"./admin"` package export with React components
- `componentsEntry` for site-side Astro components
- `admin.portableTextBlocks` for custom PT block types
- The `page:fragments` hook (capability `hooks.page-fragments:register`) — **only** available to native plugins per the capabilities page

Sources:
- https://docs.emdashcms.com/reference/hooks
- https://docs.emdashcms.com/plugins/creating-plugins/api-routes
- https://docs.emdashcms.com/plugins/creating-plugins/manifest (admin surface section)
- https://docs.emdashcms.com/plugins/creating-plugins/capabilities

---

## Q5. Capability naming + policy in 0.18

**VERIFIED** — sources: `/plugins/creating-plugins/manifest` and `/plugins/creating-plugins/capabilities`.

### Canonical list (as of 0.18)

| Capability | Grants | `ctx` property |
|---|---|---|
| `content:read` | `ctx.content.get()`, `ctx.content.list()` | `content` |
| `content:write` | `ctx.content.create()`, `ctx.content.update()`, `ctx.content.delete()` | `content` |
| `media:read` | `ctx.media.get()`, `ctx.media.list()` | `media` |
| `media:write` | `ctx.media.getUploadUrl()`, `ctx.media.delete()` | `media` |
| `network:request` | `ctx.http.fetch()` restricted to `allowedHosts` | `http` |
| `network:request:unrestricted` | `ctx.http.fetch()` to any host (no allowlist) | `http` |
| `users:read` | `ctx.users.get/list/getByEmail` | `users` |
| `email:send` | `ctx.email.send()` (gated on a transport being registered) | `email` |
| `hooks.email-transport:register` | Register an `email:deliver` exclusive hook | — |
| `hooks.email-events:register` | Register `email:beforeSend` / `email:afterSend` | — |
| `hooks.page-fragments:register` | Register `page:fragments` (native only) | — |

**Always available, no capability needed:** `ctx.storage` (scoped to plugin id), `ctx.kv` (scoped to plugin id), `ctx.log`, `ctx.site`, `ctx.url`, `ctx.cron`, `ctx.plugin`.

**The PRD's claim that `hooks.email-events:register` is invented is WRONG** — it is a real capability in 0.18.

### Network policy

- `network:request` **requires non-empty `allowedHosts`**. Bare hostnames; leading `*.` allows subdomains (e.g. `*.cdn.example.com`). No scheme, no path, no whitespace.
- `network:request:unrestricted` requires **empty** `allowedHosts` (the capability already grants every host; a list would contradict it).
- `bundle`/`publish` enforces these cross-field rules and warns on a `network:request` with empty `allowedHosts`.
- Importing Node built-ins (`fs`, `path`, `child_process`, …) is hard-fail at bundle time.

### Capability consent flow

When a plugin is installed from the marketplace, the admin sees a consent dialog listing the declared capabilities. Updates that add capabilities surface as a capability diff and require fresh approval. So "declare exactly what you use, version-bump when adding more" is enforced socially and at install time.

### What the sandbox does NOT enforce

- Behaviour **within** a granted capability. A `content:write` plugin can edit any content; audit-time review is the only check.
- Side channels (timing, log output, stored data visible to host operator).
- Operator trust on Node.js. When the sandbox runner reports unavailable, `sandboxed: []` plugins are skipped at startup; moving them to `plugins: []` gives no V8 isolation, no resource limits, and full `fetch()` / env-var access.

---

## Q6. plugin-cli workflow and CI usage

**VERIFIED** — sources: `/plugins/creating-plugins/cli`, `/plugins/creating-plugins/publishing`, `/plugins/creating-plugins/manifest`.

### Commands (full list, from the CLI reference)

```
emdash-plugin init [name]                  # Scaffold a new sandboxed plugin
emdash-plugin build                        # Build dist/ (plugin.mjs, manifest.json, index.mjs)
emdash-plugin dev                          # Watch sources and rebuild on change (150 ms debounce)
emdash-plugin bundle                       # Pack dist/ + assets into a registry tarball
emdash-plugin validate [path]              # Validate emdash-plugin.jsonc against the schema
emdash-plugin publish --url <url>          # Publish a release pointing at a hosted tarball
emdash-plugin login <handle-or-did>        # Sign in with your Atmosphere account
emdash-plugin logout [--did <did>]         # Revoke the active session
emdash-plugin whoami                       # Show stored sessions
emdash-plugin switch <did>                 # Switch the active publisher session
emdash-plugin search <query>               # Free-text registry search
emdash-plugin info <handle-or-did> <slug>  # Show package details
```

Discovery commands (`search`, `info`) accept `--registry-url <url>` or `EMDASH_REGISTRY_URL`. Non-interactive commands (`whoami`, `validate`, `search`, `info`, `login`, `publish`) accept `--json` for machine-readable output.

### What `build` emits

| Artifact | What it is |
|---|---|
| `dist/plugin.mjs` (+ `dist/plugin.d.mts`) | Hooks and routes; loaded in-process (`plugins: []`) and by the sandbox loader (`sandboxed: []`) |
| `dist/manifest.json` | Manifest including hooks/routes read from `src/plugin.ts` |
| `dist/index.mjs` (+ `dist/index.d.mts`) | Descriptor module a site imports in `astro.config.mjs`; only emitted when a sibling `package.json` exists |

`dist/` is build output; the scaffold's `.gitignore` excludes it.

### CI usage

- **`validate` runs offline** (no network) with `tsc`-style `file:line:column` diagnostics, including cross-field rules. **Suitable as a pre-commit or CI gate.** This is the answer to "Can validate/build run without an Atmosphere account?" — **yes, for `validate` and `build`.** `bundle` and `publish` don't need a session to bundle, but `publish` does need one.
- `bundle` does no network either — it packages `dist/`, validates Node-builtin imports and capability sanity, collects optional assets (README, icon, screenshots), and writes `dist/<slug>-<version>.tar.gz` with `plugin.mjs` packed as `backend.js`.
- `publish` requires `login` first. It records the release to your own Atmosphere account and points at the **hosted tarball** (you supply `--url https://…`). The CLI does NOT host artifacts.

### Publisher identity (DID)

- `emdash-plugin login alice.bsky.social` opens the account provider's sign-in page in-browser (Atproto OAuth). EmDash never sees your password.
- The handle's DID is what you pin as `publisher` in the manifest. Pinned on first publish; subsequent publishes must match the session DID or the CLI returns `MANIFEST_PUBLISHER_MISMATCH` (no override flag; use `emdash-plugin switch <did>` to change sessions, or edit the manifest).
- Pin a `did:plc:…` (cryptographic, can't be moved or impersonated) over a handle (mutable) for long-lived plugins.

### `package.json` scripts (typical)

```jsonc
{
  "scripts": {
    "build": "emdash-plugin build",
    "dev":   "emdash-plugin dev"
  }
}
```

Sources:
- https://docs.emdashcms.com/plugins/creating-plugins/cli
- https://docs.emdashcms.com/plugins/creating-plugins/publishing

---

## Q7. `emdash()` Astro integration options in 0.18

**VERIFIED** (parts) + **LIKELY** (a few fields) — primary source: `/reference/configuration`, supplemented by `/plugins/creating-plugins/your-first-plugin`.

### Top-level shape (from the configuration reference + your-first-plugin example)

```ts
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { sandbox } from "@emdash-cms/cloudflare";
// For local workerd sandbox: import { sandbox } from "@emdash-cms/sandbox-workerd";

import hello from "@my-org/plugin-hello";   // default import, NOT helloPlugin()

export default defineConfig({
  integrations: [
    emdash({
      database: d1(),                  // REQUIRED — choose one: d1(), sqlite(), libsql(), postgres()
      storage:  r2({ binding: "R2" }), // REQUIRED — choose one: r2(), s3(), local()
      plugins:   [],                   // OPTIONAL — native plugins
      sandboxed: [hello],              // OPTIONAL — sandboxed plugins (default-imports)
      sandboxRunner: sandbox(),        // OPTIONAL — pluggable runtime; from @emdash-cms/cloudflare or @emdash-cms/sandbox-workerd
      auth: ...,                       // OPTIONAL — Cloudflare Access or custom
      authProviders: [atproto(), github(), google()], // OPTIONAL — login options
      fonts: { scripts: ["arabic", "japanese"] },      // OPTIONAL — Noto Sans scripts
      siteUrl: "https://cms.example.com",              // OPTIONAL — public origin
      maxUploadSize: 100 * 1024 * 1024,                // OPTIONAL — bytes, default 50 MB
      experimental: { registry: { aggregatorUrl: "..." } }, // OPTIONAL — point admin to a federated registry
    }),
  ],
});
```

### Per-option confirmation

- **`database`** — required. Imports from `emdash/db`: `sqlite({ url: "file:..." })`, `libsql({ url, authToken? })`, `postgres({ connectionString | host/port/db/user/password, ssl?, pool: { min, max } })`. `d1({ binding, session: "disabled" | "auto" | "primary-first", bookmarkCookie? })` comes from `@emdash-cms/cloudflare`. New in 0.18.0: `d1({ coalesce: true })` (experimental, requires `session`; collapses simultaneous read queries into one D1 round trip).
- **`storage`** — required. `r2({ binding, publicUrl? })` from `@emdash-cms/cloudflare`, `s3({ ...optional, all from S3_* env vars })` and `local({ directory, baseUrl })` from `emdash/astro`.
- **`plugins: []`** — array of native plugins (and standard-format plugins, per docs). Standard plugins work in either `plugins` or `sandboxed`.
- **`sandboxed: []`** — array of **default-imported** standard-format plugins. The migrating-to-the-cli page is explicit: `sandboxed: [helloPlugin()]` (the factory-call shape) is **gone**; the new shape is `sandboxed: [hello]` (a bare default import).
- **`sandboxRunner`** — pluggable runtime. `@emdash-cms/cloudflare` exports `sandbox()` (the production runner using Dynamic Worker Loader); `@emdash-cms/sandbox-workerd` is the workerd-based local runner. **If no runner is configured (or the runner reports unavailable on the current platform), `sandboxed: []` plugins are skipped at startup.** The capabilities page repeats this: "Operator trust on Node.js — when the configured sandbox runner reports unavailable (no Cloudflare Worker Loader, no Node-side runner installed, etc.), `sandboxed: []` plugins are skipped at startup. You can move them into `plugins: []` to run them in-process."
- **`auth`** — optional Cloudflare Access or custom provider.
- **`authProviders: [atproto(), github(), google()]`** — top-level array. `atproto()` accepts `{ allowedDIDs, allowedHandles, defaultRole }`. With no allowlist, only the first signup is Admin; everyone else gets `signup_not_allowed`.
- **`fonts`** — optional. `false` to disable, or `{ scripts: ["arabic", …] }` to add writing systems.
- **`siteUrl`** — optional; env fallback chain `EMDASH_SITE_URL`, then `SITE_URL`. Validates at Astro startup; required for passkeys, CSRF origin matching, OAuth redirects, MCP discovery, JSON-LD.
- **`maxUploadSize`** — optional, default `52_428_800` (50 MB). Rejects larger with 413/400.
- **`experimental.registry`** — optional, point the admin's plugin browse/install flow at a federated registry (requires `sandboxRunner`).

### Dev (SQLite/local) vs. deploy (D1/R2) wiring

- **Local dev:** `pnpm dev` uses Node.js + SQLite by default (no Cloudflare account). `npm create emdash@latest` scaffolds this. `database: sqlite({ url: "file:./data.db" })`, `storage: local({ directory: "./uploads", baseUrl: "http://localhost:4321/uploads" })`, and a workerd sandbox (`@emdash-cms/sandbox-workerd`) to exercise the sandbox isolation locally.
- **Deploy:** swap to `d1()` + `r2()` from `@emdash-cms/cloudflare`, set `sandboxRunner: sandbox()` from the same package. Dynamic Workers require a paid Cloudflare account (Free plan falls back to trusted in-process).
- **Cloudflare WAF carve-out** still applies (per AGENTS.md gotcha): Bot Fight Mode can block Stripe webhook deliveries. Document and tune `firewallEventsAdaptive`.

Sources:
- https://docs.emdashcms.com/reference/configuration
- https://docs.emdashcms.com/plugins/creating-plugins/your-first-plugin
- https://docs.emdashcms.com/plugins/creating-plugins/capabilities (sandbox fallback note)

---

## Q8. `getEmDashCollection` / `getEmDashEntry` in 0.18

**VERIFIED** — sources: `/reference/api`, `/guides/querying-content`, 0.18.0 release notes (PR #1409).

### Signatures (from `/reference/api`)

```ts
// Fetch all entries of a collection
const { entries, error } = await getEmDashCollection(
  collection: string,
  options?: CollectionFilter
): Promise<CollectionResult>;

// Fetch a single entry
const { entry, error, isPreview } = await getEmDashEntry(
  collection: string,
  slugOrId: string,
  options?: { locale?: string }  // only `locale`; preview state is auto-detected
): Promise<EntryResult>;
```

Both are imported from `emdash` (the docs don't show a named subpath).

### Filter options

- `locale?: string` — i18n. Defaults to request's current locale; fallback chain kicks in if no translation exists.
- `status?: "draft" | "published" | "archived"`
- `limit?: number`
- `where?: { [taxonomy]: string | string[] }` — OR logic across multiple values for the same taxonomy.
- `cursor?: string` — pagination.

### Entry return type

```ts
interface ContentEntry {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  publishedAt: string | null;
  data: { [field: string]: unknown } & { terms?: { [taxonomySlug: string]: Term[] } };
  edit: EditProxy;       // spread for inline editing in admin; no-ops in production
}
```

### New in 0.18.0 (per PR #1409 release note)

> "Pages render with fewer database round trips… `getTerm()`, `getEmDashEntry`, `getEmDashCollection`, `entry.data.terms?.tag`, `emdash-env.d.ts`, `getEntryTerms()`."

Confirmed: **`entry.data.terms` is now populated on every entry returned by `getEmDashEntry` / `getEmDashCollection`** (as `entry.data.terms?.<taxonomySlug>` → array of term objects). The taxonomy endpoints exposed in `/reference/api#taxonomies` (getTerms, getTerm, getEntryTerms, getEntriesByTerm) remain available.

The PRD's claim that "0.17.2 → 0.18 is patch-level for plugin authors" is true at the **plugin** API level (hooks, ctx surface, capabilities are unchanged). The 0.18.0 changes are mostly core (cold-start, query log, D1 coalesce, taxonomy terms on entry data). The migrating-to-the-cli doc captures the plugin shape churn that happened earlier in 0.16/0.17 (the `definePlugin` → `satisfies SandboxedPlugin` transition).

### Breaking option-shape changes since 0.9

**LIKELY** — direct evidence of the 0.9 → 0.18 plugin surface is sparse in the extracted docs (they show the current shape, not the 0.9 shape). The AGENTS.md and PRD already document the most important removals (manifest cache, `invalidateManifest()`, etc.). The remaining migration to verify against the actual repo's existing `getEmDashCollection` call sites is:

- `entries` (camelCase, plural) — confirmed for 0.18
- `error` and `isPreview` for `getEmDashEntry` — confirmed
- `entry.data.terms` is **new** in 0.18 (round-trip optimization); treat as an additive accessor, not a breaking rename
- 0.9 used `manifests` + `manifest.getManifest()` in places — those local Repos call sites should drop manual caching (the manifest cache was eliminated in 0.9 already; verified in AGENTS.md)

The current Dateline usage (`@dateline/views/src/lib/emdash-loader.ts:1` per PRD) reads `getEmDashCollection` and probably destructures `entries` — should work unchanged against 0.18.

Source: https://docs.emdashcms.com/reference/api, https://docs.emdashcms.com/guides/querying-content, https://github.com/emdash-cms/emdash/releases (PR #1409)

---

## Q9. 0.18.x release notes since 0.18.0

**VERIFIED** — **no 0.18.x patch has been published** as of 2026-06-11. `0.18.0` is the only 0.18.x release. Source: `https://github.com/emdash-cms/emdash/releases` (the release page lists `emdash@0.18.0` as the most recent, dated 2026-06-11).

### Notable changes bundled into 0.18.0 (plugin-relevant subset)

- **PR #1405** — fixed a cold-start bug where a visitor disconnect could leave a server instance permanently broken (hangs → 524 on Cloudflare). Sites no longer get stuck.
- **PR #1408** — faster cold starts (startup steps run concurrently, fewer DB/storage round trips). Most noticeable on Cloudflare.
- **PR #1409** — pages render with **fewer database round trips**; `getTerm`, `getEmDashEntry`, `getEmDashCollection` now surface `entry.data.terms?.tag` and `getEntryTerms()` (the new accessor the PRD assumes).
- **PR #1407** — query instrumentation (`EMDASH_QUERY_LOG=1`) now captures the whole request, not just the pre-header portion. New `[emdash-stream-end]` log line reports total query count, DB time, cache hits.
- **PR #1391** — `fetchpriority="high"` on priority images for faster above-the-fold.
- **`@emdash-cms/cloudflare@0.18.0` (PR #1410)** — experimental `coalesce: true` option for `d1()` adapter; collapses simultaneous read queries from one page render into a single D1 round trip. Requires `session` to be enabled; off by default while experimental. **Most relevant for the Dateline RSVP / capacity-lock flow if Dateline runs on D1.**
- **`@emdash-cms/sandbox-workerd@0.1.6`** — workerd-based local sandbox runner (separate from `@emdash-cms/cloudflare`). Patch-only; same version train as the rest of 0.18.

### Plugin-side changes

The migrating-to-the-cli page was published alongside this release, and `plugin-cli@0.5.1` shipped 2026-06-03 (8 days before `emdash@0.18.0`). No `plugin-cli@0.5.2` or higher as of 2026-06-11.

Source: https://github.com/emdash-cms/emdash/releases

---

## Q10. Real sandbox resource limits (CPU/subrequest caps)

**VERIFIED** — sources: `/plugins/creating-plugins/capabilities`, the `creating-plugins/SKILL.md` in the repo, and the README. The 0.18 limit table is the **Cloudflare Dynamic Worker Loader** limit set; if a different runner is configured the limits are the runner's.

| Resource | Sandboxed (Cloudflare Worker Loader) | Trusted |
|---|---|---|
| Runs in | Isolated V8 isolate (Dynamic Worker Loader) | Main process (Astro/Worker host) |
| CPU | **50 ms / invocation** | None (subject to host CPU) |
| Subrequests | **10 / invocation** (via `ctx.http.fetch`) | None |
| Wall-clock | **30 s** | None |
| Memory | **~128 MB** | None |
| Node.js APIs | None | Full |
| Env vars | None | Full |
| Filesystem | None | Full |
| Install method | Admin UI (one-click from marketplace) | `astro.config.mjs` (code change + deploy) |
| Capabilities | Enforced at runtime via RPC bridge | Advisory only |
| Network | Blocked direct `fetch()`; `ctx.http.fetch()` only with allowlist | Unrestricted |
| Data access | Scoped to declared capabilities | Full database |
| Available on | Cloudflare Workers only (paid plan for Dynamic Workers) | All platforms |

`emdash-plugin bundle` and `publish` add:
- No Node-builtin imports in `backend.js` (hard fail).
- No oversized files.
- Capability sanity (declared capabilities must be in the known set; deprecated names warn at bundle, hard-fail at publish).

The PRD's existing sandbox-profiler budgets (50 ms CPU + 10 subrequests per invocation) align with this. The Dateline monorepo's `tools/sandbox-profiler` is **still useful** but should be recalibrated for the workerd runner (separate package) for local dev — `@emdash-cms/sandbox-workerd` may have its own per-invocation knobs that differ from Cloudflare's Worker Loader defaults.

Sources:
- https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/SKILL.md
- https://docs.emdashcms.com/plugins/creating-plugins/capabilities
- https://docs.emdashcms.com/plugins/creating-plugins/manifest (CLI flags still win; validation section)

---

## Items that contradict the PRD assumptions (FLAGGED)

| # | PRD assumption | Reality in 0.18 | Action |
|---|---|---|---|
| 1 | `definePlugin()` is the standard plugin author API; `PluginDescriptor` factory pattern from `src/index.ts` + `src/sandbox-entry.ts` is current | Both `definePlugin` and the two-file split are **gone** for sandboxed plugins. One `src/plugin.ts` with `satisfies SandboxedPlugin` + an `emdash-plugin.jsonc` manifest. `definePlugin` is only used for native plugins. | WS2 must re-shape the Dateline core/rsvp/importer plugins to the new single-file + manifest layout. |
| 2 | `ctx.cron.schedule()` is invented (PRD §1, "invented runtime APIs") | Real in 0.18; paired with the `cron` hook. Schedule with croner-format strings. | RSVP can keep the scheduled waitlist-promotion / hold-expiry pattern. Just declare cron registration inside `plugin:install` or `plugin:activate` hooks. |
| 3 | `plugin:activate` hook is invented | Real in 0.18; first-class lifecycle hook alongside `plugin:install` / `plugin:deactivate` / `plugin:uninstall`. | Use `plugin:install` to seed cron, capacity counters, etc.; `plugin:uninstall` to clean up. |
| 4 | `hooks.email-events:register` capability is invented | Real; pairs with `hooks.email-transport:register`. `email:send` requires a transport to be registered by another plugin. | RSVP can register `email:beforeSend` to add RSVP-specific footers or intercept cancellations. |
| 5 | `definePlugin()` is native-only in 0.17+ | It is **native-only** in 0.18 too — but the standard plugin path **does not use `definePlugin` at all** anymore. Sandboxed plugins use the bare default export + `satisfies SandboxedPlugin`. | Re-shape WS2 (and drop the `createCorePlugin()`-style factories entirely or keep them as test-only re-exports). |
| 6 | `emdash({ plugins, sandboxed, sandboxRunner })` registration | Correct for the top-level options. **But** the per-item shape changed: `sandboxed: [helloPlugin()]` (factory call) is now `sandboxed: [hello]` (default import). | Update reference-site `astro.config.mjs` in WS5. |
| 7 | Importer needs `network:request:unrestricted` with empty `allowedHosts` for "operator-typed URLs" | Plausible — but the policy is to **prefer the narrower `network:request` with explicit `allowedHosts`**; the consent dialog surfaces exactly which hosts the plugin will call. Unrestricted should be reserved for webhook-sender / generic forwarder patterns. The importer case (feed URLs typed by the operator) is actually a fit for `network:request:unrestricted`, since the operator's URL list isn't known at install time. | WS2 should declare `network:request:unrestricted` for importer with empty `allowedHosts`, but document the trade-off in the README and consent dialog UX. |
| 8 | `ctx.kv.atomicIncrement/Decrement` is the planned primary path for RSVP capacity | **No atomic helpers on `ctx.kv` in 0.18.** API is `get/set/delete/list(prefix)`. PRD's fallback (D1 atomic decrement) is the only path. | WS3 must use the D1 atomic `UPDATE … SET capacity = capacity - 1 WHERE id = ? AND capacity > 0` pattern, or accept the non-atomic check-then-set with retry/oversell tests. |
| 9 | Sandboxed plugins need a separate `sandbox-entry.ts` | The standard-plugin path no longer separates the entry — `src/plugin.ts` is the single file, and the CLI's `build` produces `dist/plugin.mjs` (the loader uses this directly). | WS2 templates must be updated. |

---

## Items that are CORRECT in the PRD (CONFIRMED)

- `emdash-plugin.jsonc` manifest format with `slug`, `publisher` (DID), `license`, `author`, `security`, `capabilities`, `allowedHosts`, `storage`, `admin`.
- Plugin registration is `emdash({ plugins, sandboxed, sandboxRunner })` in `astro.config.mjs` (option names confirmed).
- `plugin-cli` provides `init/build/dev/validate/bundle/publish/login/whoami/switch/search/info`.
- Atmosphere account DID is the publisher identity (`emdash-plugin login alice.bsky.social` → DID is pinned as `publisher`).
- Cloudflare sandboxed mode is paid-only (Dynamic Workers); Free falls back to trusted.
- `emdash.config.ts` does **not** exist in any EmDash version — confirmed (no mention anywhere in extracted docs; README's instructions to use it are wrong).
- `EMDASH_PLUGIN_MANIFEST_*` wrangler vars are still invented — no mention in extracted docs.
- `entry.data.terms` is now populated (matches the PRD's assumption).

---

## Items UNRESOLVED without a local probe

- **Per-invocation CPU and subrequest budget under `@emdash-cms/sandbox-workerd@0.1.6`** — Cloudflare Worker Loader limits are documented; the workerd local runner may have different defaults. The Dateline sandbox-profiler needs a recalibration step (WS2) to confirm.
- **Exact `SandboxRunner.load` signature** for `@emdash-cms/cloudflare` (the `SandboxedPluginInstance` rename is real; the actual method shape isn't in the extracted docs). Dateline only consumes the standard plugin format, so this doesn't block WS2 — flagged for the custom-runner authors in upstream.
- **Whether `emdash-plugin init` and `build` work fully offline for an `emdash-plugin.jsonc` written by hand** — `validate` is documented as offline; `build` reads `src/plugin.ts` and the manifest locally; no network implied. **LIKELY** yes — but a probe in CI will confirm.
- **Post-0.18 workerd sandbox release cadence** — `@emdash-cms/sandbox-workerd@0.1.6` shipped 2026-06-11 with the rest of 0.18.0, no 0.18.x patch yet.

---

## Planning implications (for the parent agent)

1. **Re-anchor WS2 (sandboxed conversion) on the new single-file + manifest layout.** Drop `createCorePlugin()`-style factories, drop the dual `index.ts + sandbox-entry.ts` split, drop the `as unknown` casts. Default-export an object literal `satisfies SandboxedPlugin` from `src/plugin.ts`; keep `definePlugin()` only if any code path is genuinely native (none in Dateline today).
2. **Keep RSVP's capacity-lock out of `ctx.kv`.** Use D1's `UPDATE … SET capacity = capacity - ? WHERE id = ? AND capacity >= ?` pattern. `ctx.kv` is for non-atomic state only (the docs confirm `get/set/delete/list` are the only ops; no atomic helpers).
3. **Use `plugin:install` / `plugin:activate` / `plugin:uninstall` for setup and teardown.** Cron registration belongs in `plugin:install` (or first-run), not as a separate invented `ctx.cron.schedule()` dynamic call. The `cron` hook is the consumer; the schedule registration is in another hook.
4. **Document the importer's `network:request:unrestricted` choice in the install guide.** The PRD already flags this as an open consent-dialog question; pick the unrestricted path because operator-typed URLs aren't enumerable at install time. Use the narrower grant only when the URL set is fixed.
5. **Re-version the package exports.** Each plugin's `package.json` needs `"./sandbox": "./dist/plugin.mjs"` (not `sandbox-entry.mjs`) and `files: ["dist", "emdash-plugin.jsonc"]`. Drop the old `PluginDescriptor` factory re-exports.
6. **CI: `emdash-plugin validate` is the only required CI step** for build correctness; it's offline and catches the cross-field rules. `emdash-plugin build` is the artifact step. `emdash-plugin bundle` is the publish-prep step (only when publishing to the registry). None of these need an Atmosphere account.
7. **Reference-site rewire** (WS5): `astro.config.mjs` uses `sandboxed: [hello]` (default import), `plugins: []` empty for Dateline, `sandboxRunner: sandbox()` from `@emdash-cms/cloudflare` (deploy) or `@emdash-cms/sandbox-workerd` (dev).
8. **Bump @dateline/blocks to `@emdash-cms/blocks@^0.18.0`** — same package name, no migration. Just diff against current upstream typings (per PRD WS6).
9. **Local sandbox-profiler (tools/sandbox-profiler) stays**, but document that budgets are Cloudflare Worker Loader defaults; `@emdash-cms/sandbox-workerd` may differ.
10. **Document the `entry.data.terms` round-trip optimization in WS1** (or WS3) — Dateline views may now be able to drop separate `getEntryTerms` calls and read `entry.data.terms` inline.

---

## Source list (single-source-of-truth URLs)

- https://docs.emdashcms.com/plugins/creating-plugins/your-first-plugin
- https://docs.emdashcms.com/plugins/creating-plugins/manifest
- https://docs.emdashcms.com/plugins/creating-plugins/cli
- https://docs.emdashcms.com/plugins/creating-plugins/hooks (alias of `/reference/hooks`)
- https://docs.emdashcms.com/plugins/creating-plugins/api-routes
- https://docs.emdashcms.com/plugins/creating-plugins/storage
- https://docs.emdashcms.com/plugins/creating-plugins/capabilities
- https://docs.emdashcms.com/plugins/creating-plugins/publishing
- https://docs.emdashcms.com/plugins/creating-plugins/migrating-to-the-cli
- https://docs.emdashcms.com/plugins/registry
- https://docs.emdashcms.com/plugins/overview
- https://docs.emdashcms.com/reference/configuration
- https://docs.emdashcms.com/reference/api
- https://docs.emdashcms.com/reference/hooks
- https://docs.emdashcms.com/reference/cli
- https://docs.emdashcms.com/guides/querying-content
- https://docs.emdashcms.com/guides/taxonomies
- https://docs.emdashcms.com/guides/atmosphere-auth
- https://github.com/emdash-cms/emdash
- https://github.com/emdash-cms/emdash/releases
- https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/SKILL.md
- https://registry.npmjs.org/emdash/latest
- https://registry.npmjs.org/@emdash-cms/blocks/latest
- https://registry.npmjs.org/@emdash-cms/plugin-cli/latest
- https://registry.npmjs.org/@emdash-cms/cloudflare/latest
