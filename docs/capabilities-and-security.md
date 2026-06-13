# Capabilities & Security

Dateline's three plugins run sandboxed on Cloudflare Workers (Paid plan) with explicit capability declarations in their `emdash-plugin.jsonc`. This document explains the capability model, the runtime `ctx` surface, measured sandbox budgets, data access boundaries, and the native-vs-sandboxed distinction.

## The Resource:Verb Capability Model

EmDash 0.18 uses the canonical capability naming scheme: `resource:[sub-resource]:verb[:qualifier]`. Capability names are **resource-first** (`content:read`), not action-first (`read:content`); the CLI normalizes or rejects deprecated aliases.

Each plugin declares only the capabilities it needs, in its manifest. EmDash's runtime enforces them at the sandbox boundary, so a plugin cannot exceed its declared permissions.

### Canonical capabilities

| Capability | Grants | `ctx` binding | Declared by (this repo) |
|---|---|---|---|
| `content:read` | `ctx.content.get()`, `ctx.content.list()`, `ctx.content.query()` | `ctx.content` | core, rsvp, importer |
| `content:write` | `ctx.content.create()`, `ctx.content.update()`, `ctx.content.delete()` | `ctx.content` | core, rsvp, importer |
| `media:read` | `ctx.media.get()`, `ctx.media.list()`, download URLs | `ctx.media` | (available; not declared in v0.2) |
| `media:write` | `ctx.media.getUploadUrl()`, `ctx.media.delete()` | `ctx.media` | (available; not declared in v0.2) |
| `network:request` | `ctx.http.fetch()` to hosts listed in `allowedHosts` only | `ctx.http` | (available; not declared in v0.2) |
| `network:request:unrestricted` | `ctx.http.fetch()` to any host (security trade-off — see below) | `ctx.http` | importer |
| `users:read` | `ctx.users.get()`, `ctx.users.list()` | `ctx.users` | (available; not declared in v0.2) |
| `email:send` | `ctx.email.send()` via EmDash's mail pipeline | `ctx.email` | rsvp |

The exact, authoritative lists are in [packages/core/emdash-plugin.jsonc](../packages/core/emdash-plugin.jsonc), [packages/rsvp/emdash-plugin.jsonc](../packages/rsvp/emdash-plugin.jsonc), and [packages/importer/emdash-plugin.jsonc](../packages/importer/emdash-plugin.jsonc).

> Deprecated aliases (`read:content`, `network:fetch:any`, …) are normalized or rejected by `@emdash-cms/plugin-cli`. Always use the current resource:verb names in manifests.

### Always available (no declaration needed)

- `ctx.kv.*` — plugin-scoped KV store (`get`/`set`/`delete`/`list` only; **no atomic ops**). Automatic per-plugin isolation.
- `ctx.log.*` — structured logging.
- `ctx.site`, `ctx.url`, `ctx.plugin`, `ctx.storage` — host/site context and the plugin's own storage collections.
- Routes and hooks declared in the manifest.

### The verified runtime `ctx` surface

The `dump-ctx` probe on `@emdash-cms/sandbox-workerd@0.1.6` returned these `ctx` keys:

```json
["content", "email", "http", "kv", "log", "media", "plugin", "site", "storage", "url", "users"]
```

The capability-gated members (`content`, `media`, `http`, `users`, `email`) are present only when the manifest declares the matching capability; the rest are always present.

> **There is no `ctx.waitUntil` in the sandboxed plugin `ctx`.** Deferring work past the response (`waitUntil` / host-level `after()`) is a Cloudflare Workers **host** concern in 0.18, not something the sandboxed plugin `ctx` exposes. Plugin handlers should complete their work within the invocation and budgets below.

## Plugin-Scoped KV

Each sandboxed plugin has automatic, exclusive access to its own KV namespace. No capability declaration needed.

- **Methods:** `get`, `set`, `delete`, `list` only. No atomic increment/decrement — never build a counter on a KV read-modify-write (it races).
- **Cross-plugin access:** structurally impossible. Plugin A cannot read or write Plugin B's KV.
- **TTL and cleanup:** use KV for short-lived caches (e.g. the 1-hr recurrence-range cache) and dedup keys (7 days for Stripe webhook idempotency).

## Data Access Patterns

### Content queries

All content access goes through `ctx.content.*`. No raw SQL, no D1 access from plugins.

```ts
// ✅ Correct
const event = await ctx.content.get("dateline_events", eventId);

// ❌ Not allowed: raw SQL / D1
const event = await sql`SELECT * FROM events WHERE id = ${eventId}`;
```

### Persistent plugin storage

Beyond content, a plugin keeps its own records in `ctx.storage` collections declared in the manifest (e.g. RSVP's `rsvps` collection). Storage supports `get`/`put`/indexed `query`/`count`. Queries must target an **indexed** field — a non-indexed query is rejected:

```text
Cannot query on non-indexed field 'note'.
```

> **Capacity guard, not `uniqueIndexes`:** on the local workerd runner, `storage.uniqueIndexes` does **not** enforce a duplicate-insert conflict (a second document with the same indexed values but a different id inserts successfully). RSVP capacity therefore uses explicit counter rows + application-level conflict checks, guarded by a concurrent-oversell test — not a unique-index constraint.

### Network access

`ctx.http.fetch()` is the only network exit. Under `network:request` it is restricted to the manifest's `allowedHosts`; under `network:request:unrestricted` it may reach any public host. Requests to private/loopback IPs are blocked regardless:

```text
URLs targeting private IP addresses are not allowed
```

**Importer consent trade-off:** `@dateline/importer` declares `network:request:unrestricted` with an empty `allowedHosts`, because operators paste arbitrary feed URLs (any iCal/CSV/JSON endpoint) at import time — the set of hosts is not knowable ahead of time. This is a deliberate trade-off: it grants broad outbound reach in exchange for letting users import from any source. Operators should treat importer activation as a consent decision and, where possible, run imports from reputable feed URLs they control.

## Sandbox Budget & Performance

Cloudflare Workers caps each sandboxed invocation at:

- **50 ms CPU per invocation**
- **10 subrequests per invocation** (`ctx.http.fetch`, `ctx.content.*`, etc.)
- **30 s wall time**
- **~128 MB memory**

### Measured local-runner behavior

`@emdash-cms/sandbox-workerd@0.1.6` enforces **only wall time** on the Node path. It prints on startup:

```text
[emdash:workerd] cpuMs, memoryMb, and subrequests limits are not enforced by standalone workerd. Only wallTimeMs is enforced on the Node path. For full resource isolation, deploy on Cloudflare Workers.
```

The M0 platform probe measured (see [VERIFIED-PLATFORM-0.18.md](../VERIFIED-PLATFORM-0.18.md)):

| Resource | Cloudflare documented | workerd-runner measured |
|---|---:|---|
| CPU | 50 ms | no failure through a 2000 ms busy loop |
| Subrequests | 10 | no failure through 15 `ctx.http.fetch` calls |
| Wall clock | 30000 ms | 31000 ms rejected |
| Memory | ~128 MB | no failure through 192 MB allocation |

**Implication:** keep CI profiler budgets pinned to the Cloudflare limits (50 ms / 10 subrequests / 30 s / 128 MB). The local runner will not catch a CPU/subrequest/memory overrun — only a deployment on Workers Paid does.

### Profiling budget usage

Every sandboxed package includes a profile harness. Gate handlers in CI:

```bash
pnpm sandbox:profile
```

A handler over budget is reported (advisory); a harness failure exits non-zero and blocks CI.

## Native vs Sandboxed (the real 0.18 distinction)

EmDash 0.18 distinguishes two plugin formats — and where the sandbox actually applies depends on the Cloudflare plan:

- **Sandboxed plugins** (`@dateline/core`, `@dateline/rsvp`, `@dateline/importer`) ship the single-file format and run inside the Dynamic Worker Loader sandbox on a **Workers Paid** plan, with their `ctx` surface gated by declared capabilities. These can be distributed through the EmDash marketplace.
- **Native plugins** run as host code (full trust, no capability gating). They are distributed via npm + a CLI installer, **not** the marketplace. Dateline does not ship a native plugin in v0.2; the dev-only mock email transport in the reference site is a host-level (native) plugin used for local testing.

### Plan differences

| | Workers Paid | Workers Free |
|---|---|---|
| Dynamic Worker Loader | available | unavailable |
| Sandboxed plugin execution | isolated V8, capability-enforced | **in-process**, no isolation, no capability boundary |
| Recommendation | production | prototyping only |

On Free, plugins run in-process and the capability boundary is not enforced — the isolation/security pitch is **Paid-only**. Disclose this at install time.

> Note: local `wrangler dev` (miniflare) does not satisfy the Dynamic Worker Loader probe either, so plugins run in-process locally even with the `LOADER` binding bound. Validate real isolation against a Workers Paid deployment; the local preview validates routes and data only.

## GDPR Compliance

`@dateline/core` provides two privacy operations:

- **Export** — returns all personal data for a given email (events created, RSVP records, and order/chat history when those add-ons are installed), as downloadable JSON.
- **Erase** — anonymizes RSVP attendee records (name/email/phone removed), deletes order records (refunds handled separately), and deletes chat history. User identity is matched by email.

## What plugins cannot do (by design)

- ❌ Access raw SQL or D1
- ❌ Reach private/loopback IPs (and, without `network:request:unrestricted`, only `allowedHosts`)
- ❌ Read other plugins' KV
- ❌ Execute system commands or shell
- ❌ Access the host filesystem
- ❌ Inject arbitrary HTML/JS into admin (Block Kit JSON only)
- ❌ Bypass auth checks on routes
- ❌ Call Cloudflare APIs directly

## See also

- [Installation guide](./installation.md) — setup walkthrough
- [Plugin development](./plugin-development.md) — single-file sandboxed format, hooks, testing
- [VERIFIED-PLATFORM-0.18.md](../VERIFIED-PLATFORM-0.18.md) — measured platform facts
- [Root README](../README.md) — architecture overview
