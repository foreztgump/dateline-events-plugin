# Analysis Output — README

Each plugin folder contains up to 9 numbered docs produced during the analysis phases.
All docs use the YAML front-matter template below so synthesis scripts can parse them uniformly.

## Directory Structure

```
research/analysis/<plugin-name>/
  00-overview.md        Phase 1 — file census, dependency map
  01-data-model.md      Phase 1 — post types, meta keys, custom tables, taxonomies, options
  02-hooks.md           Phase 1 — actions/filters + REST endpoints
  03-features.md        Phase 1 (i18n) + Phase 2 (feature inventory)
  04-admin-ux.md        Phase 2 — admin screen walkthrough
  05-frontend-ux.md     Phase 2 — frontend output (calendar layouts, single event)
  06-integrations.md    Phase 2 — WooCommerce, Stripe, Zoom, Google Calendar, etc.
  07-edge-cases.md      Phase 3 (P0 only) — timezone, DST, recurrence, capacity, refunds
  08-anti-patterns.md   Phase 4 (P0 only) — slow queries, bad UX, DB bloat, conflicts
```

## YAML Front-Matter Template

Every doc starts with this block. Fill in all fields; use `n/a` for fields that don't apply.

```yaml
---
plugin: <plugin-name>          # matches the sources/<plugin-name> directory
version: <version>             # from plugin header, e.g. 7.4.5
phase: <0|1|2|3|4>            # analysis phase that produced this doc
doc: <00-overview|01-data-model|02-hooks|03-features|04-admin-ux|05-frontend-ux|06-integrations|07-edge-cases|08-anti-patterns>
priority: <P0|P1|P2|P3>       # from PRD source inventory
analyst: <human|claude>        # who produced this doc
analyzed: <YYYY-MM-DD>
status: <draft|review|final>
notes: |
  Free-form notes about this doc — caveats, confidence level, anything the reader should know.
---
```

## Legal Reminder

- **READ** for understanding. **WRITE** specs in our own words. **IMPLEMENT** from specs.
- No verbatim code excerpts in any doc. Patterns and concepts only.
- No screenshots of source code. Admin/frontend UI screenshots are fine.
- Architecture is not copyrightable; specific code expression is.

## Plugin Priority Reference

| Plugin | Version | Priority |
|---|---|---|
| events-calendar-pro | 7.4.5 | P0 |
| eventin-pro | 4.0.19 | P0 |
| eventon | 4.8 | P0 |
| eventon-tickets | 2.4.7 | P1 |
| eventon-rsvp | 3.0.3 | P1 |
| eventon-seats | 1.2.6 | P1 |
| eventon-ticket-variations-options | 1.1.4 | P1 |
| eventon-rsvp-events-waitlist | 1.1.1 | P2 |
| eventon-rsvp-invitees | 1.0.2 | P2 |
| eventon-qrcode | 2.0.3 | P2 |
| eventon-full-cal | 2.1.3 | P2 |
| eventon-weekly-view | 2.1.4 | P2 |
| eventon-slider | 2.1 | P3 |
| eventon-csv-importer | 1.1.10 | P3 |
| eventon-wishlist-add-on | 1.1.2 | P3 |

## Running the capture scripts

The Playwright capture scripts (`capture*.py`, `eventon/*.py`) drive a **local
DDEV** WordPress site for clean-room analysis. Credentials come from the
environment — never hardcode them:

```bash
export DDEV_PASSWORD="<your-local-ddev-admin-password>"
# Optional overrides (defaults shown):
export DDEV_BASE_URL="https://dateline-site-b.ddev.site:8443"
export DDEV_USERNAME="admin"
python3 research/analysis/eventon/capture.py
```

These target a localhost-only DDEV site; there are no production credentials in
this repository.
