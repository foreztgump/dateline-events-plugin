# Proposal: PRO-332 — P1 Static Analysis (eventon-tickets, -rsvp, -seats, -ticket-variations)

## Why

The Dateline EmDash plugin family must absorb a decade of accumulated edge-case knowledge from the four P1 EventON add-ons (paid ticketing, free RSVP, seat-map UX, combinatoric ticket variations) without contaminating our MIT codebase with GPL-licensed PHP. Phase 1 static analysis turns those four GPL plugins into structured, paraphrased markdown reference docs — the only safe input for downstream PRDs and implementation specs. Without this gate, design decisions on `@dateline/tickets-backend`, `@dateline/rsvp`, `@dateline/seats`, and `@dateline/pricing` would either reinvent solved problems or risk verbatim derivation.

## What Changes

- Produce four sets (one per P1 plugin) of static-analysis markdown documents under `research/analysis/<plugin>/`:
  - `00-overview.md` — file census, entry point, dependencies, WP/PHP requirements
  - `01-data-model.md` — CPTs, taxonomies, custom tables, postmeta keys, options
  - `02-hooks.md` — actions, filters, REST routes (table form)
  - `03-features.md` — admin screens, settings, shortcodes, i18n-derived feature taxonomy
- Enforce a uniform YAML front-matter on every doc (plugin, version, analyzed date, analyst, phase).
- Establish a clean-room write discipline: paraphrased descriptions and pseudo-code only. Verbatim PHP is BLOCKED.
- No code is written in this change. No package, plugin, runtime, build, or CI is touched.

## Capabilities

### New
- `p1-plugin-research-corpus` — a reproducible methodology and validated corpus of paraphrased reference docs for the four P1 plugins.

### Modified
- *(none)* — this change adds research artifacts only. Existing capabilities and packages are untouched.

## Impact

- **Affected directories:** `/research/analysis/eventon-tickets/`, `/research/analysis/eventon-rsvp/`, `/research/analysis/eventon-seats/`, `/research/analysis/eventon-ticket-variations-options/` (all created by this change).
- **Read-only inputs:** `/research/sources/<plugin>/` (gitignored, untouched).
- **Affected systems:** none — research deliverable. No runtime, build, or deploy impact.
- **Downstream dependents:** future PRDs / OpenSpec changes for `@dateline/tickets-backend`, `@dateline/rsvp`, `@dateline/seats`, `@dateline/pricing`, and the cross-plugin synthesis docs (Phase 5).
- **Legal:** ZERO GPL contamination risk if write discipline is followed. Output is original prose describing patterns, which are not copyrightable.

## Rollback Plan

- Research artifacts are purely additive markdown under `research/analysis/`. Rollback = delete the four created subdirectories and revert this change. No runtime, schema, or dependency to unwind.
- If a clean-room review (manual diff or second-agent comparison) finds verbatim PHP in any output doc, that doc is quarantined and rewritten from scratch. The rest of the corpus is unaffected.
