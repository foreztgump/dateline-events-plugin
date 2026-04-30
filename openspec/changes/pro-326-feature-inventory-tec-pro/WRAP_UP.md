# Wrap-Up: PRO-326 — Feature inventory: events-calendar-pro

## Checklist
- [x] Live walkthrough on Site A (DDEV: dateline-site-a.ddev.site)
- [x] 04-admin-ux.md (466 lines)
- [x] 05-frontend-ux.md (462 lines)
- [x] 06-integrations.md (428 lines)
- [x] 40 screenshots captured
- [x] capture.py + observations.json committed
- [x] Committed: f56d96d
- [x] Pushed: feature/pro-326-feature-inventory-tec-pro
- [x] PR open: https://github.com/foreztgump/dateline-events-plugin/pull/3
- [x] Linear updated: In Progress → (will be set to Done after PR merge)
- [x] OpenMemory saved
- [ ] PR merged
- [ ] Branch deleted: feature/pro-326-feature-inventory-tec-pro
- [ ] Worktree removed: /home/cownose/projects/Dateline-pro-326-feature-inventory-tec-pro

## Setup gotchas (worth preserving)

1. **TEC base / ECP version compatibility** — TEC 6.15.20 (latest stable) is too new for ECP 7.4.5. ECP 7.4.5 expects TEC 6.11.1+ but bumping TEC past ~6.13 triggers ECP's "upgrade to 7.7.12+" notice and disables most admin chrome. Use `ddev wp plugin install the-events-calendar --version=6.11.1 --activate --force` to pin the matching base.

2. **Site A CPT conflict with Eventin** — Eventin core 4.0.16 in Site A is older than Eventin Pro 4.0.19 expects (4.0.21+), causing the admin notice "Eventin Pro requires Eventin v4.0.21". Deactivate Eventin Pro and Eventin core for ECP walkthroughs. Re-activate for PRO-330 / Eventin walkthroughs.

3. **CT1 occurrence permalink resolution requires the full ECP save pipeline** — direct postmeta seeding (`wp_insert_post` + `update_post_meta`) does NOT populate `tec_events` / `tec_occurrences`. Manual raw SQL inserts populate the rows but single-event permalinks still 404 because ECP's permalink resolver expects sequence-keyed routing baked in by the save listener. List/calendar views work fine because they resolve via the events archive query, not occurrence permalink.

4. **TEC's query filter excludes `tribe_events` posts that have no `tec_events` row** when CT1 is on. `get_posts(['post_type'=>'tribe_events'])` returns empty even when raw posts exist — bypass with `$wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type='tribe_events'")`.

5. **DDEV Site A `xhgui` is stopped by default** — fine for our purposes; spin up via `ddev xhgui` if profiling is needed for Phase 4.

## Reusable artifacts

- **Playwright capture script** at `research/analysis/events-calendar-pro/capture.py` — pattern reusable for any TEC-family or Eventin-family Phase 2 walkthrough. Adjust `BASE_URL`, login creds, admin/frontend URL lists.
- **CT1 sync helper** (sync2.php pattern in commit message) — for any future seeded events that need CT1 row backfill.

## Follow-Up Items

- **PRO-341 (Phase 3 edge cases: events-calendar-pro)** — should exercise the event-edit Save flow live (with all hooks running) to populate CT1 properly so single-event templates can be screenshotted on real data. The CT1 occurrence-edit modal (this/upcoming/all) is also exercise-worthy.
- **PRO-338 (Phase 4 anti-patterns: events-calendar-pro)** — query-monitor is already active on Site A for slow-query analysis. Map view + month-view-with-many-events are known hot paths from i18n string mining.
- **Site B (`dateline-site-b.ddev.site`)** awaits parallel walkthrough work for PRO-327, PRO-325, PRO-328 (EventON family). Check that EventON and add-ons are activated and seeded.
- **Eventin walkthrough re-run** — if anyone redoes PRO-330's screenshots, first upgrade Eventin core to 4.0.21+ to satisfy Eventin Pro's version dependency, then deactivate ECP/TEC for that walkthrough.
