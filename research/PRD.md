# PRD: WordPress Events Plugin Analysis & Extraction

> **This is a research PRD, not a product PRD.** Its output is a body of structured documentation that will feed the actual EmDash Events Plugin PRD. No code is shipped from this work — only knowledge.

---

## Overview

We have acquired 14 WordPress event plugin packages representing the dominant players in the WP events ecosystem: The Events Calendar Pro, Eventin Pro, EventON Full, and 12 EventON add-ons. Goal: systematically extract architectural patterns, data models, UX flows, edge cases, and feature priorities into a structured reference library, without contaminating our MIT-licensed EmDash plugin with GPL code.

## Problem Statement

Reading 14 plugins of PHP code raw is unmanageable. Copying any of it is a license violation. Without a disciplined extraction methodology, we will either (a) miss critical edge cases that took these vendors a decade to find, or (b) accidentally lift GPL code into our MIT codebase. We need a clean-room workflow that produces structured insights and zero copyright risk.

## Target Users

- **Primary:** Claudeflare (this AI agent) running the analysis
- **Secondary:** The developer reviewing synthesis docs before locking the Events Plugin PRD scope
- **Tertiary (optional, post-launch):** The EmDash plugin community, if we publish synthesis as ecosystem evangelism

---

## Source Inventory

| Package | Version | Role | Priority |
|---|---|---|---|
| events-calendar-pro | 7.4.5 | Industry standard (800K+ installs, 13 yrs mature) | **P0** |
| eventin-pro | 4.0.19 | AI-native competitor (direct threat) | **P0** |
| eventon | 4.8 | UX leader, modular add-on architecture | **P0** |
| eventon-tickets | 2.4.7 | WooCommerce ticket integration reference | P1 |
| eventon-rsvp | 3.0.3 | Free RSVP flow reference | P1 |
| eventon-seats | 1.2.6 | Seat-map UX reference (hardest UX) | P1 |
| eventon-ticket-variations-options | 1.1.4 | Combinatoric ticket pricing | P1 |
| eventon-rsvp-events-waitlist | 1.1.1 | Capacity overflow / race conditions | P2 |
| eventon-rsvp-invitees | 1.0.2 | Token-gated private events | P2 |
| eventon-qrcode | 2.0.3 | Ticket validation / check-in flow | P2 |
| eventon-full-cal | 2.1.3 | Traditional month-grid view | P2 |
| eventon-weekly-view | 2.1.4 | Week layout patterns | P2 |
| eventon-slider | 2.1 | Visual showcase patterns | P3 |
| eventon-csv-importer | 1.1.10 | Bulk import patterns | P3 |
| eventon-wishlist-add-on | 1.1.2 | Gamification primitives | P3 |

---

## Legal Guardrails — READ FIRST

Non-negotiable. Violating these contaminates our plugin's license.

- **All 14 packages are GPL** (v2 or v3). The Events Calendar is GPLv2; EventON and add-ons are GPLv2; Eventin Pro is GPLv2.
- **Our EmDash Events Plugin is MIT** (or commercial-licensed for paid add-ons).
- **GPL is copyleft.** Any direct code derived from GPL must remain GPL. Mixing GPL into MIT contaminates the entire codebase.
- **READ for understanding. WRITE specs in our own words. IMPLEMENT from specs.** Never paste code from these plugins into our codebase.
- **Architecture is not copyrightable. Specific code expression is.** "Use a join table for many-to-many event-attendee relations" is a pattern (free to use). The exact PHP class implementing it is code (cannot copy).
- **Different languages help.** We're going PHP → TypeScript. Verbatim copying is harder, and accidental similarity is more obvious.
- **When in doubt, paraphrase twice.** Once when documenting the pattern, once when implementing it. The two paraphrases come out very different from the source.
- **No screenshots of source code in our docs.** Screenshots of admin UI are fine (UI is not copyrightable in this context); screenshots of source code create visible evidence of derivation.

---

## Features

### MVP — Phase 1 outputs (must produce)

1. **Per-plugin overview docs (14 total)** — what each plugin does, key stats, headline features
2. **Per-plugin data model docs (14 total)** — postmeta keys, custom tables, taxonomies, options
3. **Per-plugin hook map (P0/P1 only — 6 docs)** — actions/filters fired and available
4. **Per-plugin feature inventory (14 total)** — every screen, every setting, every shortcode
5. **Cross-plugin synthesis: data model convergence** — fields all 3 P0 plugins share (= real requirements)
6. **Cross-plugin synthesis: feature tier map** — every feature mapped to MVP / v0.2 / v0.3 with evidence

### Phase 2 (after MVP synthesis review)

7. **UX screenshot galleries** for P0 plugins (admin + frontend)
8. **Edge case docs** for P0 plugins (timezone, recurrence, sold-out, refunds, no-shows)
9. **Anti-pattern docs** (slow queries, bad UX, painful upgrades — what NOT to do)
10. **Cross-plugin synthesis: UX pattern library** — reusable UI patterns
11. **Cross-plugin synthesis: pricing & positioning intelligence**
12. **Final "PRD Inputs" document** — direct feed into the Events Plugin PRD

### Future (only if needed)

- i18n string extraction as fast feature taxonomy
- Performance benchmarks against our future EmDash plugin
- Public-facing synthesis blog post for ecosystem evangelism

---

## Methodology

### Phase 0: Setup (30 min)

- Unzip all 14 packages into `/research/sources/<plugin-name>/`
- Create empty output structure under `/research/analysis/<plugin-name>/` and `/research/synthesis/`
- Spin up two WordPress test sites (DDEV or LocalWP):
  - **Site A:** TEC Pro + Eventin Pro side-by-side (they conflict cleanly enough)
  - **Site B:** EventON Full + all 12 add-ons stacked
- Database backups before each plugin install — for clean diffs

### Phase 1: Static analysis per plugin (1-2 hr per P0, 20 min per P2/P3)

For each plugin:

1. **File census.** Count files, identify entry point (`*.php` with plugin header), map directory structure. Output: `00-overview.md`.
2. **Dependency map.** Composer/npm dependencies, required PHP version, required WP version, required other plugins. Output: appended to `00-overview.md`.
3. **Hook discovery.** Grep for `add_action`, `add_filter`, `do_action`, `apply_filters`. Build a table of: hook name → file → purpose. Output: `02-hooks.md`. (Cheat: also search for `_action(` and `_filter(` for completeness.)
4. **Data model discovery.** Grep for `register_post_type`, `register_taxonomy`, `dbDelta`, `update_post_meta`, `add_option`. Build a table of: storage location → field name → purpose. Output: `01-data-model.md`.
5. **REST endpoint discovery.** Grep for `register_rest_route`. Output: appended to `02-hooks.md`.
6. **i18n hack.** Open the plugin's `.pot` or `.po` file in `/languages/`. The list of translatable strings is a free, dense feature inventory. Output: appended to `03-features.md`.

### Phase 2: Feature inventory per plugin (1-2 hr per P0, 30 min per P2/P3)

1. **Admin screen walkthrough.** Open every settings page, every list table, every meta box. Document each in prose: "Settings → Events → General has X, Y, Z." Output: `03-features.md` and `04-admin-ux.md`.
2. **Frontend output.** View calendar in every layout. Document each: "Month view shows…", "Single event template includes…". Output: `05-frontend-ux.md`.
3. **Integration points.** Note every WooCommerce, Stripe, PayPal, Zoom, Google Calendar touchpoint. Output: `06-integrations.md`.

### Phase 3: Edge cases (P0 plugins only, ~3 hr per plugin)

Manually trigger and document:

- Timezone shifts (event in PST viewed by EST user — what happens?)
- DST transitions (recurring weekly meeting through Mar 9 / Nov 2)
- Recurring event with one-off exception ("every Monday except Memorial Day")
- Capacity sold out → waitlist → cancellation → promotion
- Ticket refund → quantity restoration
- Event date change after tickets sold
- Event cancellation entirely
- Multi-day event spanning month boundary
- Past events (display, search, archival)
- Imported events (CSV/iCal) — what data is lost vs preserved

Output: `07-edge-cases.md` per plugin.

### Phase 4: Anti-patterns (P0 plugins only, ~1 hr per plugin)

- Slow queries (search Events Calendar's GitHub issues for "performance" — they have known problems)
- Painful UX flows (anything taking >5 clicks)
- Confusing settings hierarchies
- Plugin conflicts and known incompatibilities
- Database bloat patterns

Output: `08-anti-patterns.md` per plugin.

### Phase 5: Cross-plugin synthesis (4-6 hr total)

Read across the per-plugin docs and produce:

- `data-model-convergence.md` — every field present in 2+ P0 plugins. **These are the real requirements.**
- `data-model-divergence.md` — where they disagree. **These are our design decisions.**
- `feature-tier-map.md` — every observed feature mapped to MVP / v0.2 / v0.3 with evidence ("Recurring events: present in all 3 P0 plugins, central to all docs → MVP").
- `ux-pattern-library.md` — UI patterns worth borrowing (calendar grid, list view, single event hero, ticket selection flow).
- `pricing-and-positioning.md` — commercial intelligence (price points, free vs pro splits, add-on bundling logic).
- `prd-inputs.md` — final synthesized input to the Events Plugin PRD.

---

## Output Schema

Strict folder structure. Consistency makes synthesis trivial.

```
/research/
  /sources/                           # unzipped plugins (read-only, never modified)
    /events-calendar-pro/
    /eventin-pro/
    /eventon/
    /eventon-tickets/
    ... etc
  /analysis/
    /events-calendar-pro/
      00-overview.md
      01-data-model.md
      02-hooks.md
      03-features.md
      04-admin-ux.md
      05-frontend-ux.md
      06-integrations.md
      07-edge-cases.md
      08-anti-patterns.md
      /screenshots/
        admin-001-events-list.png
        admin-002-event-edit.png
        frontend-001-month-view.png
        ... etc
    /eventin-pro/
      [same structure]
    ... etc
  /synthesis/
    data-model-convergence.md
    data-model-divergence.md
    feature-tier-map.md
    ux-pattern-library.md
    pricing-and-positioning.md
    prd-inputs.md
```

Markdown only. No proprietary formats. Each `.md` starts with a YAML front-matter block:

```yaml
---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-29
analyst: claudeflare
phase: 1
---
```

## Tooling

- **ripgrep** for code search across plugins (`rg "register_post_type" /research/sources/`)
- **WP-CLI** on the test sites for DB inspection (`wp db query "SHOW TABLES"`)
- **phpMyAdmin** or DBeaver for visual schema inspection
- **Browser** + screen capture for UX gallery (full-page screenshots, named per the schema above)
- **WordPress Query Monitor plugin** for slow-query identification (anti-patterns)
- **A scratchpad doc** for raw observations before they're cleaned into structured analysis docs

---

## Workflow Phases & Time Budget

| Phase | Plugins | Effort/plugin | Total |
|---|---|---|---|
| 0. Setup | n/a | n/a | 0.5 hr |
| 1. Static analysis (P0) | 3 | 1.5 hr | 4.5 hr |
| 1. Static analysis (P1) | 4 | 0.7 hr | 3 hr |
| 1. Static analysis (P2/P3) | 7 | 0.3 hr | 2 hr |
| 2. Feature inventory (P0) | 3 | 2 hr | 6 hr |
| 2. Feature inventory (P1) | 4 | 1 hr | 4 hr |
| 2. Feature inventory (P2/P3) | 7 | 0.5 hr | 3.5 hr |
| 3. Edge cases (P0 only) | 3 | 3 hr | 9 hr |
| 4. Anti-patterns (P0 only) | 3 | 1 hr | 3 hr |
| 5. Cross-plugin synthesis | n/a | n/a | 6 hr |
| **Total** | | | **~42 hr** |

That's roughly one focused work week, or two weeks at half-time. Feasible.

---

## Security & Legal Considerations

Beyond the legal guardrails above:

- **Test sites stay local.** Never deploy a site with all 14 plugins installed to the public internet. Several have known CVEs in older versions; combined attack surface is large.
- **No source code in commits.** The `/research/sources/` directory is in `.gitignore`. Only `/research/analysis/` and `/research/synthesis/` are committed.
- **No source code in screenshots.** UI screenshots only. If a screenshot accidentally captures source code (e.g., a debug panel), redact before saving.
- **No source code quoted in synthesis docs.** Pseudo-code is fine; verbatim PHP is not.

---

## Success Metrics

- **Coverage:** All 14 plugins have at least docs 00-03 (overview, data-model, hooks, features). All 3 P0 plugins have all 9 docs.
- **Cross-references:** Every synthesis doc cites specific source plugins by name and version.
- **Decision-readiness:** Every feature in the resulting Events Plugin PRD's "MVP" tier has at least 2 P0 plugins as evidence. Every "v0.2+" feature has at least 1.
- **Zero contamination:** A clean-room review (manual diff or another agent comparing source/output) finds no GPL-derived code in the EmDash plugin codebase.
- **Time:** Total effort under 50 hours.

---

## Open Questions

1. **Test site topology.** Single shared WP install with all plugins (faster setup, conflict risk) vs separate sites per major plugin (clean, slower)? Current recommendation: **two sites** (TEC+Eventin on Site A; EventON+add-ons on Site B). Adjust if conflicts emerge.
2. **Screenshot tooling.** Browser dev-tools full-page capture vs a tool like Shottr/CleanShot vs automated Playwright? Current recommendation: **manual full-page captures** for v1; automate later if we redo for v2 of the EmDash plugin.
3. **Synthesis publication.** Do we publish the cross-plugin synthesis publicly as ecosystem content (great EmDash marketing) or keep it internal (preserves competitive edge)? Current recommendation: **internal until our plugin ships**, then consider publishing redacted version.
4. **i18n string mining priority.** It's fast and dense. Worth doing early as a feature-taxonomy hack? Current recommendation: **yes, do during Phase 1** for all P0 plugins.
5. **Eventin Pro AI features specifically.** This is our direct competitor on the AI angle. Worth a dedicated `09-ai-features.md` doc just for this plugin? Current recommendation: **yes**.

---

## Definition of Done

The PRD is fulfilled when `/research/synthesis/prd-inputs.md` exists, is reviewed by the developer, and is sufficient to write the Events Plugin PRD without further reference to the source plugins.
