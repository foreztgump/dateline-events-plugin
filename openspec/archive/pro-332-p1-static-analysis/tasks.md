# Tasks: PRO-332 — P1 Static Analysis

Each task is fully self-contained, parallel-safe (zero cross-task dependencies), and produces all four output docs for one plugin. Apply the following CODE_PRINCIPLES.md hard rules to every task: **#3 Names Reveal Intent** (use the upstream identifier verbatim in tables; paraphrased prose elsewhere), **#7 No Duplicated Logic** (one row per hook/postmeta key, even if it appears in multiple call sites — link them in one cell), **#8 YAGNI** (do not invent fields the source does not contain). Soft guideline **#5 Comments Explain Why, Not What** applies to the analysis prose itself: explain WHY a feature exists, not just WHAT the code looks like.

**Error handling strategy (all tasks):** Errors at this layer are research errors, not runtime errors. If a ripgrep pass returns zero hits, document that explicitly ("no `register_rest_route` calls found") rather than omitting the section. If `lang/` is empty, say so. If the entry-point header lacks `Requires PHP`, say so. Never fabricate. If source files are unreadable, abort the task and report the path; do not proceed with partial analysis.

---

## Task 1 — Analyze `eventon-tickets` (v2.4.7)

**Plugin role:** WooCommerce ticket integration reference. Paid ticketing is the highest commercial-value pattern in the EventON family.

**Source path (read-only):** `/home/cownose/projects/Dateline/research/sources/eventon-tickets/`
**Output path:** `/home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/eventon-tickets/`

### Files to read (in order)
1. `eventon-tickets.php` (entry point; plugin header + bootstrap)
2. `includes/` (≈30 PHP files; main logic)
3. `templates/` (rendered output; informs feature inventory)
4. `lang/*.pot` or `*.po` (i18n source for feature taxonomy)
5. `changelog.txt` (cross-reference for feature timeline if needed)

### ripgrep commands to run
- Hooks (registered): `rg "add_action|add_filter" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- Hooks (emitted): `rg "do_action|apply_filters" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- Data model: `rg "register_post_type|register_taxonomy|dbDelta|update_post_meta|add_option|update_option" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- REST routes: `rg "register_rest_route" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- Shortcodes: `rg "add_shortcode" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- Admin menus: `rg "add_menu_page|add_submenu_page|add_meta_box|add_options_page" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' -n`
- i18n strings (sample): `rg "__\(|_e\(|_n\(|esc_html__\(|esc_attr__\(" /home/cownose/projects/Dateline/research/sources/eventon-tickets/ -g '*.php' --only-matching -h | sort -u`
- `.pot`/`.po` discovery: `find /home/cownose/projects/Dateline/research/sources/eventon-tickets/lang -maxdepth 2 -name "*.pot" -o -name "*.po" -o -name "*.mo"`

### Files to create
- `research/analysis/eventon-tickets/00-overview.md`
- `research/analysis/eventon-tickets/01-data-model.md`
- `research/analysis/eventon-tickets/02-hooks.md`
- `research/analysis/eventon-tickets/03-features.md`

### Front-matter (top of every file)
```yaml
---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---
```

### Acceptance criteria
- [ ] All four output files exist with the canonical names.
- [ ] Every file starts with the YAML front-matter block exactly as above.
- [ ] `00-overview.md` lists entry-point file, declared plugin header values (`Requires at least`, `Tested up to`, `Requires PHP`), file count, top-level directory description, and dependency on EventON core + WooCommerce (presence verified from bootstrap checks).
- [ ] `01-data-model.md` has a postmeta-keys table with columns "Postmeta key | Post type | Purpose (paraphrased)" and every distinct key from the `update_post_meta` ripgrep is represented (or grouped with a stated rule).
- [ ] `01-data-model.md` lists CPTs (if any), taxonomies (if any), and custom tables created via `dbDelta` (if any). If none, the section says so.
- [ ] `02-hooks.md` has a hook table with columns "Hook name | Type | Source file:line | Purpose (paraphrased)" covering registered + emitted hooks AND a separate REST route subsection (or "no REST routes registered").
- [ ] `03-features.md` lists admin screens, settings, shortcodes, and i18n-derived feature taxonomy grouped by topic (Ticketing UI, Email notifications, etc.). If `lang/` lacks `.pot`/`.po`, that is stated explicitly.
- [ ] No verbatim PHP function bodies, class declarations, or multi-line code blocks lifted from source appear anywhere in the four files. Identifiers (hook names, postmeta keys, route paths) appear verbatim as facts.
- [ ] The reviewer can run `rg "update_post_meta.*<sample-key>" /home/cownose/projects/Dateline/research/sources/eventon-tickets/` for any postmeta key listed in `01-data-model.md` and get at least one hit.

### Test files
None. This task produces markdown research artifacts; no automated tests apply. Verification is manual review against the spec scenarios.

---

## Task 2 — Analyze `eventon-rsvp` (v3.0.3)

**Plugin role:** Free RSVP flow reference. Informs `@dateline/rsvp` module design (capacity, no-payment confirmation, attendee email collection).

**Source path (read-only):** `/home/cownose/projects/Dateline/research/sources/eventon-rsvp/`
**Output path:** `/home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/eventon-rsvp/`

### Files to read (in order)
1. `eventon-rsvp.php` (entry point)
2. `includes/` (≈22 PHP files)
3. `templates/` (rendered RSVP form/confirmations)
4. `lang/*.pot` or `*.po`
5. `changelog.txt` (only if needed for context)

### ripgrep commands to run
- Hooks (registered): `rg "add_action|add_filter" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- Hooks (emitted): `rg "do_action|apply_filters" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- Data model: `rg "register_post_type|register_taxonomy|dbDelta|update_post_meta|add_option|update_option" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- REST routes: `rg "register_rest_route" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- Shortcodes: `rg "add_shortcode" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- Admin menus: `rg "add_menu_page|add_submenu_page|add_meta_box|add_options_page" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' -n`
- i18n strings: `rg "__\(|_e\(|_n\(|esc_html__\(|esc_attr__\(" /home/cownose/projects/Dateline/research/sources/eventon-rsvp/ -g '*.php' --only-matching -h | sort -u`
- `.pot`/`.po` discovery: `find /home/cownose/projects/Dateline/research/sources/eventon-rsvp/lang -maxdepth 2 -name "*.pot" -o -name "*.po" -o -name "*.mo"`

### Files to create
- `research/analysis/eventon-rsvp/00-overview.md`
- `research/analysis/eventon-rsvp/01-data-model.md`
- `research/analysis/eventon-rsvp/02-hooks.md`
- `research/analysis/eventon-rsvp/03-features.md`

### Front-matter
```yaml
---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---
```

### Acceptance criteria
- [ ] All four output files exist with canonical names and the front-matter above.
- [ ] `00-overview.md` lists entry point, header values, file count, directory map, and dependency on EventON core (verified from bootstrap).
- [ ] `01-data-model.md` documents every postmeta key written by RSVP flows (status, attendee count, capacity, etc.), plus any custom tables for attendee records, plus options for global RSVP settings. Include the postmeta-keys table.
- [ ] `02-hooks.md` covers registered + emitted hooks in the standard table format, with a REST route subsection (or "no REST routes").
- [ ] `03-features.md` lists admin screens (RSVP settings, attendee management), shortcodes (RSVP form), email-notification surfaces, and i18n-derived feature taxonomy.
- [ ] No verbatim PHP source. Identifiers OK.
- [ ] Spot-check verification: at least one postmeta key, hook, and shortcode listed in the docs is verifiable via ripgrep against the source.

### Test files
None — manual review.

---

## Task 3 — Analyze `eventon-seats` (v1.2.6)

**Plugin role:** Seat-map UX reference. Hardest UX in the EventON family — informs `@dateline/seats` (native React admin) design.

**Source path (read-only):** `/home/cownose/projects/Dateline/research/sources/eventon-seats/`
**Output path:** `/home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/eventon-seats/`

### Files to read (in order)
1. `eventon-seats.php` (entry point)
2. `includes/` (≈17 PHP files)
3. `assets/` (skim only — JS/CSS shaping seat-map UI; do not copy code; record file inventory)
4. `lang/*.pot` or `*.po`
5. `changelog.txt` (context)

### ripgrep commands to run
- Hooks (registered): `rg "add_action|add_filter" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- Hooks (emitted): `rg "do_action|apply_filters" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- Data model: `rg "register_post_type|register_taxonomy|dbDelta|update_post_meta|add_option|update_option" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- REST routes: `rg "register_rest_route" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- AJAX hooks (seat picker likely): `rg "wp_ajax_|wp_ajax_nopriv_" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- Shortcodes: `rg "add_shortcode" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- Admin menus: `rg "add_menu_page|add_submenu_page|add_meta_box" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' -n`
- i18n strings: `rg "__\(|_e\(|_n\(|esc_html__\(|esc_attr__\(" /home/cownose/projects/Dateline/research/sources/eventon-seats/ -g '*.php' --only-matching -h | sort -u`
- `.pot`/`.po` discovery: `find /home/cownose/projects/Dateline/research/sources/eventon-seats/lang -maxdepth 2 -name "*.pot" -o -name "*.po" -o -name "*.mo"`

### Files to create
- `research/analysis/eventon-seats/00-overview.md`
- `research/analysis/eventon-seats/01-data-model.md`
- `research/analysis/eventon-seats/02-hooks.md`
- `research/analysis/eventon-seats/03-features.md`

### Front-matter
```yaml
---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---
```

### Acceptance criteria
- [ ] All four output files exist with canonical names and the front-matter above.
- [ ] `00-overview.md` includes a one-line note acknowledging seat-map JS lives under `assets/` and is intentionally NOT analyzed for code (UX inventory only in `03-features.md`).
- [ ] `01-data-model.md` documents seat-map storage thoroughly — most likely a serialized seat layout in postmeta plus per-seat hold/booked state. Postmeta-keys table required.
- [ ] `02-hooks.md` covers registered + emitted hooks AND a dedicated AJAX subsection capturing `wp_ajax_*` actions used by the seat picker (this is where seat-hold state machinery lives).
- [ ] `03-features.md` describes the admin seat-map editor, frontend seat picker, and any per-seat ticket-tier mapping. i18n taxonomy grouped (Editor UI / Picker UI / Errors / Confirmation).
- [ ] No verbatim PHP. No verbatim JS code from `assets/` either — describe behavior in prose.
- [ ] Spot-check: one AJAX action listed is verifiable via ripgrep.

### Test files
None — manual review.

---

## Task 4 — Analyze `eventon-ticket-variations-options` (v1.1.4)

**Plugin role:** Combinatoric ticket pricing reference. Informs `@dateline/pricing` (variant pricing matrices, tier × option SKU expansion).

**Source path (read-only):** `/home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/`
**Output path:** `/home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/eventon-ticket-variations-options/`

### Files to read (in order)
1. `eventon-ticket-variations-options.php` (entry point)
2. `includes/` (≈13 PHP files)
3. `lang/*.pot` or `*.po`
4. `changelog.txt` (context)

### ripgrep commands to run
- Hooks (registered): `rg "add_action|add_filter" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- Hooks (emitted): `rg "do_action|apply_filters" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- Data model: `rg "register_post_type|register_taxonomy|dbDelta|update_post_meta|add_option|update_option" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- REST routes: `rg "register_rest_route" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- Shortcodes: `rg "add_shortcode" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- Admin menus: `rg "add_menu_page|add_submenu_page|add_meta_box" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n`
- Pricing math signals: `rg "price|cost|amount|total" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' -n -i`
- i18n strings: `rg "__\(|_e\(|_n\(|esc_html__\(|esc_attr__\(" /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/ -g '*.php' --only-matching -h | sort -u`
- `.pot`/`.po` discovery: `find /home/cownose/projects/Dateline/research/sources/eventon-ticket-variations-options/lang -maxdepth 2 -name "*.pot" -o -name "*.po" -o -name "*.mo"`

### Files to create
- `research/analysis/eventon-ticket-variations-options/00-overview.md`
- `research/analysis/eventon-ticket-variations-options/01-data-model.md`
- `research/analysis/eventon-ticket-variations-options/02-hooks.md`
- `research/analysis/eventon-ticket-variations-options/03-features.md`

### Front-matter
```yaml
---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---
```

### Acceptance criteria
- [ ] All four output files exist with canonical names and the front-matter above.
- [ ] `00-overview.md` documents the dependency on `eventon-tickets` (pricing extension; verify via bootstrap checks) plus standard header/structure metadata.
- [ ] `01-data-model.md` highlights how variant/option combinations are stored — likely nested arrays in postmeta or per-tier rows. Include the postmeta-keys table AND a paraphrased description of the variant data structure (in prose, NOT lifted PHP).
- [ ] `02-hooks.md` covers all hook types in the standard table format. REST routes subsection (or "no REST routes").
- [ ] `03-features.md` describes: admin variant configurator (per-ticket-tier options), frontend tier-option pricing display, total recompute behavior. i18n taxonomy grouped by topic.
- [ ] No verbatim PHP source. Identifiers OK.
- [ ] Spot-check: one variant-related postmeta key and one hook listed are verifiable via ripgrep.

### Test files
None — manual review.

---

## Final Verification (after all four tasks)

Mark this verification step as a separate task to ensure the corpus is reviewed as a whole, not just per-plugin:

### Task 5 — Cross-corpus consistency review

- [ ] All sixteen output files exist (4 plugins × 4 docs).
- [ ] Every file has the YAML front-matter block with `analyzed: 2026-04-30` and `phase: 1`.
- [ ] Run `rg "function .*\(.*\) ?\{" /home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/` — should return zero hits (no PHP function bodies in output).
- [ ] Run `rg "<?php" /home/cownose/projects/Dateline-pro-332-p1-static-analysis/research/analysis/` — should return zero hits (no PHP opening tags in output).
- [ ] Spot-check one row from each plugin's postmeta-keys table by ripgrepping the source: each must produce ≥1 hit.
- [ ] Confirm table column conventions ("Hook name | Type | Source file:line | Purpose (paraphrased)") match across all four `02-hooks.md` files.
- [ ] Confirm i18n taxonomy is grouped (not a flat dump) in all four `03-features.md` files.

### Acceptance criteria
- [ ] All checklist items pass.
- [ ] Reviewer signs off in the change's archive note before this change moves to `completed`.

### Error handling
If any check fails, the corresponding plugin's task is reopened. Do not archive the change with failed checks.
