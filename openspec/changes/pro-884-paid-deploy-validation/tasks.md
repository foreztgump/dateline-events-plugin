# Tasks — PRO-884 Cloudflare Paid deploy validation

> Outcome: Path B (per user decision). The Paid deploy is live and the capability
> boundary + resource limits are proven from the deployed runner bundle. The live
> probe `dump-ctx`/`limits` calls and sandboxed app-flows are blocked by the
> missing `PluginBridge` worker entrypoint (PRO-909) and deferred to the production
> website deploy.

## 1. Re-provision live resources (S)
- [x] 1.1 `wrangler d1 create dateline-refsite-db` → `database_id 0a405080-14bd-4ad1-b386-523e8a3585fb`.
- [x] 1.2 `wrangler r2 bucket create dateline-refsite-media`.
- [x] 1.3 Update `examples/reference-site/wrangler.jsonc` `d1_databases[0].database_id` (committed).
- [x] 1.4 Confirm `worker_loaders: [{ binding: "LOADER" }]`, `d1_databases` (DB), `r2_buckets` (MEDIA) present and correct.

## 2. Wire the probe instrument (S)
- [x] 2.1 Built `tools/platform-probe/plugin` (standalone) so its descriptor was importable.
- [x] 2.2 Registered the probe into the cloudflare `sandboxed: []` (validation-only) — REVERTED before commit (Task 9.3).
- [x] 2.3 Verified the probe manifest capabilities (`content:read`, `content:write`, `network:request:unrestricted`) — the known limited boundary-oracle set.

## 3. Build for the Cloudflare target (M)
- [x] 3.1 `pnpm -r build` succeeds.
- [x] 3.2 `DEPLOY_TARGET=cloudflare pnpm --filter @dateline/reference-site build` emits the worker + generated `wrangler.json`.
- [x] 3.3 Inspected `dist/server/wrangler.json` — `worker_loaders`, `d1_databases`, `r2_buckets`, `assets` carried through (`durable_objects`/`migrations` empty → PRO-909).

## 4. Deploy to Workers Paid (M)
- [x] 4.1 Seeded remote D1 (44 tables, 800 rows) via EmDash seed → SQL → `wrangler d1 execute --remote --file`.
- [x] 4.2 `wrangler deploy` succeeded — Version `c90cb134-...`, no error `10195`, `env.LOADER` is a Worker Loader. (evidence/deploy-environment.md)
- [x] 4.3 Deployed URL captured; `/` returns 200 with seeded content.

## 5. Prove the capability boundary on the real loader (M)
- [x] 5.1 Captured boundary evidence from the **deployed runner bundle** (evidence/deployed-bundle-enforcement.md §1, §3). Live probe `dump-ctx` BLOCKED-PENDING-PRO-909 (sandbox doesn't load — 404).
- [x] 5.2 Recorded: undeclared `users`/`email` omitted from `ctx` at wrapper-gen; host bridge throws `Missing capability:`; isolate gets only `BRIDGE` + `globalOutbound:null`.
- [~] 5.3 Live `limits`-route drive BLOCKED-PENDING-PRO-909. Limit enforcement characterized from deployed source instead (cpu/subreq passed to loader, wall via runner, memory declared-only).

## 6. Prove the application flows green on Paid (M)
- [~] 6.1 RSVP submit BLOCKED-PENDING-PRO-909 (plugin route 404 — sandbox not loaded).
- [x] 6.2 `/events.ics` fetched from deployed URL; valid VEVENTs from seeded D1 (evidence/events.ics).
- [~] 6.3 Importer round-trip BLOCKED-PENDING-PRO-909 (sandboxed plugin route 404).

## 7. Author VERIFIED-DEPLOY-PAID.md (M)
- [x] 7.1 Wrote the evidence doc (header, evidence-commands, capability-boundary, resource-limits table, app-flows).
- [x] 7.2 Wrote explicit **Gaps vs. local workerd** (memory unenforced; sandbox-load PRO-909; no live rejection yet).
- [x] 7.3 Wrote **Teardown** (resource names/ids + commands; decision: left running for PRO-909 validation).
- [x] 7.4 Filed PRO-909 for the `PluginBridge` worker-entrypoint gap (no fix here).

## 8. Docs + spec sync (S)
- [x] 8.1 Refreshed `examples/reference-site/README.md` Cloudflare section (real resources, seed steps, PRO-909 gap).
- [x] 8.2 Updated `examples/reference-site/CHANGELOG.md`.
- [x] 8.3 Updated the `reference-site` spec delta deploy-mode + boundary + limits scenarios to match Path B (synced at archive).

## 9. Verify (S)
- [x] 9.1 Every claim in `VERIFIED-DEPLOY-PAID.md` maps to a captured artifact or is marked BLOCKED-PENDING-PRO-909.
- [x] 9.2 `wrangler.jsonc` committed with the real D1 id; no secrets committed.
- [x] 9.3 `pnpm -r build` + `DEPLOY_TARGET=cloudflare` build green; probe wiring reverted (no app-code regression; probe absent from rebuilt bundle).
