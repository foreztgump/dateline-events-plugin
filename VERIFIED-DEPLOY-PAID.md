# VERIFIED-DEPLOY-PAID.md

Cloudflare **Workers Paid** deploy validation for the Dateline reference site (PRO-884, WS-A2,
release gate prod-M1 / v0.3.0). Supersedes the local-only isolation findings in
`VERIFIED-PLATFORM-0.18.md` for the question "is the per-plugin sandbox boundary enforced on a
real Dynamic Worker Loader?".

Evidence types used below:
- **VERIFIED-LIVE** — observed by HTTP request / `wrangler` call against the deployed Paid worker.
- **VERIFIED-BY-DEPLOYED-SOURCE** — read from the exact artifact `wrangler deploy` uploaded
  (`examples/reference-site/dist/server/virtual_astro_middleware.mjs`), i.e. the code that runs on
  the Paid account.
- **BLOCKED-PENDING-PRO-909** — requires the missing `PluginBridge` worker-entrypoint wiring; will
  be exercised on the upcoming production website deploy.

Raw evidence lives in `openspec/changes/pro-884-paid-deploy-validation/evidence/`:
`deploy-environment.md`, `deployed-bundle-enforcement.md`, `root.html`, `events.html`, `events.ics`.

---

## Account, plan, and deployed worker

| Field | Value |
|---|---|
| Account | `b…m@gmail.com` (account ID `a031c4…e806`, redacted) |
| Plan | Workers **Paid** — Dynamic Worker Loader available |
| Wrangler / Node | `4.88.0` / `v22.21.0` |
| Worker | `dateline-reference-site` |
| URL | https://dateline-reference-site.networkreef-dev.workers.dev |
| Live version | `c90cb134-35df-4abc-a739-fb488c26eeb4` (deployed 2026-06-14T03:28Z) |

- **VERIFIED-LIVE** `wrangler deploy` succeeded with `worker_loaders: [{ binding: "LOADER" }]` in
  config. The Free plan rejects `worker_loaders` at deploy with error **10195**; this deploy
  produced no such error, so the account is Paid with the Dynamic Worker Loader enabled.
- **VERIFIED-LIVE** Generated bindings (`dist/server/wrangler.json`): `LOADER` (worker loader),
  `DB` → `dateline-refsite-db` (`0a405080-14bd-4ad1-b386-523e8a3585fb`), `MEDIA` →
  `dateline-refsite-media`, `SESSION` (KV `853a0572831d42eab3326536155afff6`).

## Evidence commands

```bash
# Live deploy + bindings
node <wrangler>/bin/wrangler.js deployments list          # → version c90cb134...

# Live public routes (seeded-D1-backed)
curl -s -o root.html   -w "%{http_code}\n" $URL/             # → 200 "Dateline Reference Site"
curl -s -o events.html -w "%{http_code}\n" $URL/events       # → 200 "Dateline Events"
curl -s -o events.ics  -w "%{http_code} %{content_type}\n" $URL/events.ics  # → 200 text/calendar

# Sandboxed plugin routes (current deploy)
curl -s -o /dev/null -w "%{http_code}\n" -X POST $URL/_emdash/api/plugins/dateline-rsvp/submit   # → 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST $URL/_emdash/api/plugins/dateline-platform-probe/dump-ctx  # → 404

# Deployed-artifact source (the code that runs on Paid)
grep -n "globalOutbound\|BRIDGE:\|subRequests\|isAvailable\|PluginBridge not available" \
  examples/reference-site/dist/server/virtual_astro_middleware.mjs
```

## Capability boundary

The boundary is two-layered; both layers are present in the deployed runner code.

1. **`ctx` surface omits undeclared optional capabilities at load time.**
   **VERIFIED-BY-DEPLOYED-SOURCE** `generatePluginWrapper()` bakes presence into the isolate's
   wrapper (deployed bundle lines 173–174, 286–294):

   ```js
   const hasReadUsers = capabilities.includes("users:read");
   const hasEmailSend = capabilities.includes("email:send");
   const users = ${hasReadUsers} ? { get, getByEmail, list } : undefined;
   const email = ${hasEmailSend} ? { send } : undefined;
   ```

   A plugin without `users:read` gets `ctx.users === undefined`; without `email:send`,
   `ctx.email === undefined`.

2. **The host-side `PluginBridge` re-checks every capability before any DB/R2/network access** and
   throws `Missing capability: <cap>`. **VERIFIED-BY-SOURCE** (`@emdash-cms/cloudflare/dist/sandbox/
   index.mjs`, runner that is bundled into the worker): `content:read`/`content:write` (lines
   406–517), `media:read`/`media:write` (lines 520+), and `network:request` /
   `network:request:unrestricted` for `sandboxHttpFetch` (lines 167–168).

3. **The isolate has no data bindings and no direct egress.** **VERIFIED-BY-DEPLOYED-SOURCE**
   `loader.get(...)` (deployed bundle lines 487–502) gives each isolate `env: { PLUGIN_ID,
   PLUGIN_VERSION, BRIDGE }` — `BRIDGE` is the only binding (no DB/R2/KV) — and
   `globalOutbound: null` (no arbitrary outbound fetch). All data + network flow through the
   capability-checked bridge.

- **BLOCKED-PENDING-PRO-909** Live `dump-ctx` (observe `capabilityPresence`/undefined surfaces) and
  a live `Missing capability` rejection. The probe plugin was bundled into the **as-deployed**
  worker (its `dump-ctx`/`limits`/`storage-kv` route code appeared inline in that build) but is
  never loaded into an isolate because the sandbox runner is unavailable — see **Gaps** below.
  (The probe wiring has since been reverted from the source tree per `tasks.md` 9.3; the deployed
  Version `c90cb134` still contains it.)

## Resource limits

**VERIFIED-BY-DEPLOYED-SOURCE** `DEFAULT_LIMITS` (deployed bundle lines 369–374) and the
`loader.get` limits object (lines 483–495):

| Limit | Documented | Default in deployed runner | Enforced on Paid loader? | Mechanism |
|---|---|---|---|---|
| CPU | 50 ms | `cpuMs: 50` | **Yes** — passed to `loader.get(... limits.cpuMs ...)` | Worker Loader, V8 isolate level |
| Subrequests | 10 | `subrequests: 10` | **Yes** — passed as `limits.subRequests` | Worker Loader, V8 isolate level |
| Wall time | 30 s | `wallTimeMs: 30000` | **Yes** — runner wraps every hook/route in `withWallTimeLimit()` | Runner `Promise.race` |
| Memory | ~128 MB | `memoryMb: 128` | **No (declared, not enforced)** — value is **never passed to `loader.get`**; only `cpuMs` + `subRequests` are | V8 platform ceiling, not per-worker configurable |

The runner's own comments confirm the split: *"CPU and subrequest limits are enforced by Worker
Loader. Wall-time is enforced here."* (deployed bundle lines 528, 538–540).

- **BLOCKED-PENDING-PRO-909** Live measurement of a CPU>50ms / subreq>10 / mem>128MB rejection via
  the probe `limits` route (the probe enforces a safety cap of cpu≤2500ms, subreq≤20, mem≤256MB).

## Application flows on Paid

| Flow | Status | Evidence |
|---|---|---|
| SSR home page from remote D1 | **VERIFIED-LIVE** 200 | `evidence/root.html` ("Dateline Reference Site") |
| Events listing from remote D1 | **VERIFIED-LIVE** 200 | `evidence/events.html` ("Dateline Events") |
| iCal feed (`@dateline/core` generation on the worker, remote-D1 content) | **VERIFIED-LIVE** 200 `text/calendar`, valid VEVENTs | `evidence/events.ics` |
| RSVP submit → capacity decrement (sandboxed `dateline-rsvp` route) | **BLOCKED-PENDING-PRO-909** (404 — sandbox not loaded) | `deployed-bundle-enforcement.md` §4 |
| Importer round-trip (sandboxed `dateline-importer` route) | **BLOCKED-PENDING-PRO-909** | `deployed-bundle-enforcement.md` §4 |

The public flows prove the worker serves SSR Astro from the **remote D1 binding** and runs Dateline
core code on the Paid account. The sandboxed-plugin flows are gated by the PRO-909 sandbox-load gap.

## Gaps vs. local workerd

1. **memoryMb is not enforced on the real loader either.** Identical to the local-workerd finding in
   `VERIFIED-PLATFORM-0.18.md`: the documented ~128MB per-invocation limit is declared in
   `DEFAULT_LIMITS` but never handed to Worker Loader (no memory option exists). The ~128MB ceiling
   is a V8 platform property, not a per-plugin enforced budget. CPU + subrequests, by contrast, are
   genuinely enforced by the Paid loader (an improvement over the workerd runner, which only enforced
   wall time locally).

2. **Sandbox does not load on this deploy — `PluginBridge` is not wired (→ PRO-909).** The Cloudflare
   sandbox runner requires `exports.PluginBridge` (a Durable Object) on the worker entrypoint:
   `isAvailable() = !!getLoader() && !!getPluginBridge()` (deployed bundle lines 410–411), and load
   throws *"PluginBridge not available. Export PluginBridge from your worker entrypoint."* (line 432).
   The deployed `entry.mjs` exports only `default`; the generated `wrangler.json` has empty
   `durable_objects.bindings` and `migrations`. Result: `isAvailable()` is false → sandbox load is
   silently skipped (`if (!sandboxRunner || !sandboxRunner.isAvailable()) return;`, line 1199) →
   `sandboxedPlugins` is empty → every plugin route returns **404** (a loaded-but-private route would
   return 403). The EmDash Astro integration does **not** auto-wire this; it is a reference-site
   deploy-config gap, tracked as **PRO-909** and to be validated live on the production website
   deploy. The local workerd path does not need `PluginBridge` (it runs plugins in-process), so this
   gap is unique to the Cloudflare Paid path and was only discoverable here.

3. **No live `Missing capability` / limit-rejection observation yet.** Because of gap #2, the
   capability-boundary and limit enforcement on Paid are proven **by the deployed runner's source**
   (the exact code in the uploaded bundle), not by a runtime `dump-ctx`/`limits` response. The source
   evidence is strong (it is the deployed artifact) but is code-path analysis, not a captured live
   rejection.

## Teardown

Live, billable resources provisioned for this validation (on the redacted Cloudflare account). The account
hosts unrelated production resources (pioneer-saloon, threatskope, etc.) — **do not touch those.**

| Resource | Binding | Name / ID | Removal command |
|---|---|---|---|
| Worker | — | `dateline-reference-site` | `wrangler delete --name dateline-reference-site` |
| D1 | `DB` | `dateline-refsite-db` (`0a405080-14bd-4ad1-b386-523e8a3585fb`) | `wrangler d1 delete dateline-refsite-db` |
| R2 | `MEDIA` | `dateline-refsite-media` | `wrangler r2 bucket delete dateline-refsite-media` |
| KV | `SESSION` | `853a0572831d42eab3326536155afff6` | `wrangler kv namespace delete --namespace-id 853a0572831d42eab3326536155afff6` |

**Decision:** these resources are **left running** so the PRO-909 fix can be validated live on the
same infrastructure during the upcoming production website deploy (per the deploy plan). Tear them
down with the commands above if that plan changes, to avoid silent cost.

## Conclusion

On a real Workers **Paid** account with the Dynamic Worker Loader active (`env.LOADER` confirmed,
no error 10195), the per-plugin sandbox boundary is enforced by construction in the deployed runner:
each plugin isolate receives only a capability-checked `BRIDGE` binding with `globalOutbound: null`,
undeclared optional capabilities are absent from `ctx`, and CPU + subrequest + wall-time limits are
enforced (memory is declared-only, matching local). The one missing piece for a fully live demonstration
— exporting the `PluginBridge` Durable Object from the worker entrypoint so the sandbox loads — is a
reference-site deploy-config gap captured in **PRO-909** and deferred to the production website deploy.
