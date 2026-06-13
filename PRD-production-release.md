# Dateline — Production Release PRD (v0.3 → v1.0)

**Date:** 2026-06-13
**Status:** Draft for review
**Repo:** github.com/foreztgump/dateline-events-plugin
**Current state:** v0.2.0 (merged to `main`, HEAD `0df1653`) — EmDash 0.18 modernization complete, CI-green, **but not published**. Developer preview only.
**Supersedes scope of:** the unbuilt portions of `PRD.md` (2026-05-02 vision) — re-grounded on the post-modernization reality and the Tender payments split.
**Depends on:** [Tender](https://github.com/foreztgump/tender) payments plugin family (v0.1-rc, tag `v0.1-rc` @ `e20fcd2`) for all paid flows; `VERIFIED-PLATFORM-0.18.md` for platform facts.

---

## 1. Background

The EmDash 0.18 modernization (`PRD-emdash-0.18-modernization.md`) shipped in full as v0.2.0: three real sandboxed plugins (`core`, `rsvp`, `importer`) plus three helper libraries (`recurring`, `views`, `blocks`), 149 test cases, a real reference site, an honest docs truth-pass, and a release dry-run. That work made the existing feature surface **true** — but it deliberately stopped short of two things that "production release" requires:

1. **It is not actually released.** The v0.2.0 release ran a publish *dry-run only*. `npm view @dateline/core` returns `E404`. The publisher identity in every `emdash-plugin.jsonc` is the placeholder `dateline.example.com`. No operator can install Dateline today without cloning and building from source.
2. **It has no paid ticketing.** The original PRD's headline ("1,500-seat theater with assigned seating, dynamic pricing, box-office check-in") describes zero lines of shipping code. The decision since then: **payments are delegated to the separate [Tender](https://github.com/foreztgump/tender) plugin family**, not reinvented inside Dateline. Dateline becomes a *consumer* of Tender's gateway-agnostic charge API rather than embedding Stripe directly.

This PRD defines the path from "honest developer preview" to "installable, paid-ticketing-capable, audited 1.0."

### 1.1 What ships today (the v0.2.0 baseline — do not rebuild)

| Package | Role | Status |
|---|---|---|
| `@dateline/core` | events, venues, organizers, Block Kit admin, iCal, schema.org, GDPR helpers | ✅ sandboxed plugin |
| `@dateline/rsvp` | **free** RSVP, storage-backed capacity, waitlist, confirmation email | ✅ sandboxed plugin |
| `@dateline/importer` | iCal / CSV / JSON / TEC import | ✅ sandboxed plugin |
| `@dateline/recurring` | RRULE validation, lazy materialization, DST-aware caching | ✅ helper library |
| `@dateline/views` | Astro calendar/list/day/agenda components, event cards, RSVP forms | ✅ component library |
| `@dateline/blocks` | typed Block Kit builders/validators | ✅ helper library |

Collections that exist: `dateline_events`, `dateline_venues`, `dateline_organizers`, `dateline_attendees` (free RSVP). **No** `dateline_ticket_tiers`, `dateline_orders`, or `dateline_seat_maps`.

### 1.2 Honest gap list (the subject of this PRD)

- **G-REL** No npm/marketplace publish; placeholder publisher DID; no real Cloudflare **Paid** deploy validation (only local `wrangler dev` + workerd; sandbox isolation never exercised on a real Dynamic Worker Loader).
- **G-PAY** No paid ticketing. Requires new collections + a `tickets-backend` plugin that calls Tender via `@tender/sdk`, race-safe inventory holds, and idempotent fulfillment driven by Tender's webhook fan-out.
- **G-MCP** No MCP surface. `@dateline/mcp` standalone wrapper unbuilt; upstream custom MCP tool registration still unverified.
- **G-AUDIT** No security audit, no production performance benchmarks (concurrency, query budgets, edge cache hit rate).
- **G-DOCS** No public docs site; recipe library and MCP tool reference absent.
- **G-ADDON** Theater-grade and hybrid add-ons (`seats`, `pricing`, `checkin`, `virtual`, `ai`) unbuilt — explicitly later-major scope.

---

## 2. Goals & Non-Goals

### Goals

- **G1 — Ship a real release.** `@dateline/*` installable from npm (libraries) and marketplace/tarball (sandboxed plugins) under a real publisher identity, with a verified Cloudflare **Paid** deployment of the reference site proving sandbox isolation end-to-end.
- **G2 — Paid ticketing via Tender.** An operator can sell a paid ticket: define tiers, take payment through Tender (gateway-agnostic), and have a confirmed attendee created exactly once — race-safe under concurrency, idempotent under webhook retries.
- **G3 — AI reachability.** Every Dateline operation reachable from an MCP client (via a standalone wrapper if upstream tool registration is still unavailable).
- **G4 — Production confidence.** A documented security review and a performance benchmark suite that gates releases, both run against a real deployment.
- **G5 — Operator-grade docs.** A public docs site with quickstart, recipes, capability reference, and (when shipped) the ticketing + Tender integration guide.

### Non-Goals (this PRD)

- Building a payment gateway. Tender owns providers, webhook signature verification, refunds, subscriptions, and the customer vault. Dateline never touches Stripe/Square SDKs directly.
- `@dateline/seats`, `@dateline/checkin`, `@dateline/virtual`, `@dateline/ai`, `@dateline/pricing` beyond their interface stubs — these are tracked as **post-1.0 / separate majors** (§7).
- Changing the `@dateline/recurring` RRULE algorithm.
- Enterprise festivals (>10K attendees), multi-venue ticketing networks, white-label resale.

---

## 3. Workstreams

> Each workstream is independently shippable. WS-A (release) and WS-E (docs site) have **no dependency on Tender** and can ship first. WS-B (ticketing) depends on a Tender integration contract being verified against a live co-deployment.

### WS-A — Real release & distribution  *(gap G-REL)*

- **A1. Publisher identity.** Replace the `dateline.example.com` placeholder with the **shared org publisher DID** (decision: one identity across Dateline / Tender / Carte — see Q1). The DID is an **atproto** account identity (the protocol behind Bluesky); a publisher account does not yet exist for any family (Tender deferred publishing too — it pins placeholder `did:web:tender.invalid`, see `tender/openspec/changes/.../publisher.md`). Steps: (1) create the shared atproto identity — simplest path is a Bluesky account at bsky.app (durable `did:plc:…`), optionally aliased to an org domain via a DNS handle; (2) `emdash-plugin login <handle-or-did>`; (3) swap the placeholder for the real DID in all three `emdash-plugin.jsonc` manifests + update `author`/`security`; (4) re-run `emdash-plugin validate` per package; first `publish` pins the DID. **Note:** the DID gates *marketplace* publish only — npm library publish (A2) and tarball install need no DID, so A3 can lag A2 if the account isn't ready.
- **A2. npm publish (libraries).** Publish `@dateline/recurring`, `@dateline/views`, `@dateline/blocks` to npm with provenance (`npm publish --provenance` from CI on tag). Decide public scope access.
- **A3. Marketplace publish (sandboxed plugins).** `emdash-plugin publish` for `core`, `rsvp`, `importer` under the real DID; verify the published tarball bytes match the bundle SHA-256.
- **A4. Cloudflare Paid deploy validation.** Stand up the reference site on a **Workers Paid** account with Dynamic Worker Loader; prove the per-plugin capability boundary is actually enforced (the v0.2.0 work only validated this locally — see `VERIFIED-PLATFORM-0.18.md`). Capture evidence in a `VERIFIED-DEPLOY-PAID.md`.
- **A5. Release automation.** Promote the changesets dry-run to a real tagged publish pipeline (CI job on `v*` tags); document the rollback path.

**Acceptance:** a brand-new operator runs the README install verbatim against a fresh `npm create emdash` site and reaches a working calendar + RSVP without cloning this repo.

### WS-B — Paid ticketing via Tender  *(gap G-PAY)*

The load-bearing workstream. Dateline is a **consumer** of Tender; it never imports a gateway SDK.

- **B0. Verify the Tender integration contract.** Resolve the EmDash plugin-to-plugin call mechanism against a live co-deployment of Tender + Dateline. Tender ships a dual path — HTTP charge route + `@tender/sdk` typed client — but cross-plugin invocation, `ctx.waitUntil` semantics, and cross-plugin `content:afterSave` fan-out are **still maintainer-unverified** (Tender PRO-610/PRO-611). **This WS is gated on that verification.** Produce a `VERIFIED-TENDER-CONTRACT.md`.
- **B1. New collections.**
  - `dateline_ticket_tiers` — name, price, currency, inventory, per-event, sale window.
  - `dateline_orders` — buyer, line items, `tenderTransactionRef`, status (`pending|paid|refunded|failed`), idempotency key.
  - extend attendee model for paid holders (ticket tier, order ref, check-in state).
- **B2. `@dateline/tickets-backend` (sandboxed plugin).** Tier CRUD (Block Kit admin), a checkout route that creates a Tender charge via `@tender/sdk`, and a fulfillment path. Capabilities: `content:read`, `content:write` (no `network:*` — Tender makes the outbound calls; no `email:send` unless it sends receipts itself).
- **B3. Race-safe inventory.** Atomically decrement `inventory:{tierId}` per line; on rejection restore prior decrements; write `hold:{cartId}` with a 600s TTL; promote to a confirmed attendee **inside `ctx.waitUntil`** from the fulfillment handler. Never trust client counts. (Mirrors the AGENTS.md inventory-correctness rule.)
- **B4. Idempotent fulfillment.** Tender fans a normalized `payment.succeeded` event to Dateline (webhook or cross-plugin hook — settled in B0). Dedupe by Tender transaction id in KV (TTL 7 days). Exactly-once attendee creation under at-least-once delivery.
- **B5. Refund reflection.** When Tender reports a refund, flip the order to `refunded` and release/adjust inventory.
- **B6. Concurrency + idempotency tests.** 50-concurrent-purchase oversell test (green) + duplicate-webhook test (exactly-once) in CI, plus an e2e against the live harness.

**Acceptance:** end-to-end paid purchase (tier → Tender checkout → confirmed attendee) on the reference site; oversell impossible under 50 concurrent buyers; duplicate fulfillment events create exactly one attendee.

### WS-C — MCP / AI reachability  *(gap G-MCP)*

- **C1. REST coverage.** Ensure every operator action (event/venue/organizer CRUD, RSVP ops, tier/order ops once WS-B lands) has a stable REST route.
- **C2. `@dateline/mcp` standalone wrapper.** A thin MCP server (npm-installable into the operator's MCP client) that maps Dateline REST routes to MCP tools. Interim path while EmDash custom MCP tool registration remains unverified (still open upstream — monitor and migrate if it ships).
- **C3. Tool reference.** Generated MCP tool catalog in the docs site.

**Acceptance:** from an MCP client, create an event, move its date, and (post-WS-B) refund a ticket end-to-end.

### WS-D — Security audit & performance benchmarks  *(gap G-AUDIT)*

- **D1. Security review.** Full pass: capability minimality, sandbox-boundary assumptions, GDPR export/erase correctness, **Tender integration trust boundary** (Dateline must never receive raw payment credentials), and the Cloudflare WAF / Bot Fight Mode carve-out for webhook delivery. Use the repo's security-review tooling; record findings + resolutions.
- **D2. Performance suite.** Benchmark against the Paid deployment: calendar list view <10 D1 queries and <100ms cold; 50 concurrent ticket purchases with zero race conditions; edge cache hit rate >85% on event detail. Wire as a release-gating CI job (extends the existing sandbox profiler + perf pattern).
- **D3. Budget enforcement.** Keep all sandboxed handlers within the 50ms CPU / 10 subrequest / ~128MB Cloudflare limits; fail CI on regression.

**Acceptance:** a published security report with no open criticals; perf suite green and gating on the release branch.

### WS-E — Public documentation site  *(gap G-DOCS)*

- **E1. Docs site** at `dateline.dev` (or chosen domain): quickstart, install (dev + Paid deploy), capability & security reference, recipe library.
- **E2. Ticketing + Tender guide** (gated on WS-B): how to install Tender, wire a gateway, and sell a paid ticket.
- **E3. MCP tool reference** (from WS-C).
- **E4. Showcase**: 2–3 production sites running Dateline.

**Acceptance:** the docs site is the canonical install path; README points to it; all code snippets are CI-validated against the reference site.

---

## 4. Milestones

| Milestone | Scope | Gating |
|---|---|---|
| **M1 — Ship it (v0.3.0)** | WS-A (publish + Paid deploy validation) + WS-E1 (quickstart docs) | none — can start now |
| **M2 — MCP (v0.4.0)** | WS-C standalone MCP wrapper + tool reference | after M1 |
| **M3 — Tender contract** | WS-B0 only — verify cross-plugin contract on a live co-deploy; `VERIFIED-TENDER-CONTRACT.md` | Tender deployable on Paid |
| **M4 — Paid ticketing (v0.5.0)** | WS-B1–B6 | **gated on M3** |
| **M5 — Hardening (v0.9.0-rc)** | WS-D security audit + perf gates; WS-E2/E3 docs | after M4 |
| **M6 — v1.0** | All criteria in §6 met; ecosystem launch | after M5 |

> **Sequencing rationale:** release + MCP + docs (M1–M2) deliver operator value and AI reach **without** waiting on the unresolved EmDash plugin-to-plugin contract. Ticketing (M3–M4) is isolated behind an explicit verification gate so its open question can't block shipping the rest.

---

## 5. Risks & Open Questions

- **R1 — EmDash plugin-to-plugin contract (load-bearing).** Dateline↔Tender invocation, `ctx.waitUntil` after-response semantics, and cross-plugin `content:afterSave` fan-out are unverified on a real deployment (carried over from both the Tender and Carte PRDs). **Mitigation:** WS-B0 is a hard gate; M1/M2 don't depend on it.
- **R2 — Custom MCP tool registration upstream.** Still unverified; `@dateline/mcp` is the interim. **Mitigation:** ship the standalone wrapper; migrate if upstream lands.
- **R3 — Cloudflare WAF blocks webhooks.** Bot Fight Mode is known to block Stripe webhook deliveries; Tender owns the webhook URL, but Dateline's fulfillment depends on receiving Tender's fan-out. **Mitigation:** document the carve-out; debug via Cloudflare GraphQL `firewallEventsAdaptive`.
- **R4 — Free-plan isolation gap.** Sandbox isolation only exists on Paid. **Mitigation:** disclose at install (already in README); WS-A4 validates Paid explicitly.
- **R5 — Tender maturity.** Tender is v0.1-rc with its own deferred live-integration items (PRO-610/611). Dateline's ticketing timeline is coupled to Tender reaching a verifiable integration state. **Mitigation:** coordinate the contract verification jointly; treat M3 as shared work.
- ~~**Q1 — Publisher DID:** one shared org DID across Dateline/Tender/Carte, or per-family?~~ **Decided 2026-06-13 (user): one shared org DID across all families.** The shared atproto account is not yet created (Tender deferred too); creating it is the first human action in WS-A1.
- **Q2 — Commercial licensing:** the original PRD priced `tickets-backend` as commercial ($99/yr). Re-decide: keep `tickets-backend` MIT (consistent with the v0.2.0 all-MIT posture) or introduce the first commercial SKU here.

---

## 6. Definition of Done (v1.0)

- `@dateline/*` installable from npm (libs) + marketplace (sandboxed) under a real publisher DID; README install works verbatim on a fresh EmDash site.
- Reference site deployed and verified on Cloudflare **Paid** with enforced sandbox isolation (`VERIFIED-DEPLOY-PAID.md`).
- Paid ticketing works end-to-end through Tender: tier → checkout → exactly-once confirmed attendee; oversell impossible under 50 concurrent buyers; refunds reflected.
- Dateline operations reachable via MCP (native or standalone wrapper).
- Published security review with no open criticals; perf suite gating releases (calendar <10 queries/<100ms, edge cache >85%, all handlers within Cloudflare limits).
- Public docs site live with quickstart, recipes, capability reference, ticketing+Tender guide, MCP tool reference.
- 2–3 production showcase sites.

---

## 7. Explicitly Deferred (post-1.0 / separate majors)

These remain on the long-term vision (`PRD.md`) but are **out of scope** for the production-release line above:

- `@dateline/seats` — visual seat-map designer + frontend picker (native).
- `@dateline/pricing` — promo codes, dynamic pricing.
- `@dateline/checkin` — door-staff PWA scanner (native, offline-capable).
- `@dateline/virtual` — Zoom / Meet / Jitsi integrations.
- `@dateline/ai` — streaming admin chat panel (native; commercial).

Each is a self-contained add-on that depends only on `@dateline/core` (+ `tickets-backend` for seats/pricing) and can be scheduled independently once the 1.0 core line is stable.
