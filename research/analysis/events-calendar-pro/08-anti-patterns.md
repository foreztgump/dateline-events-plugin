---
plugin: events-calendar-pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P4 — Anti-Patterns
doc: 08-anti-patterns
site: Site A — dateline-site-a.ddev.site (DDEV, WordPress 6.9.4, PHP 8.2, MariaDB 11.8)
notes: >
  Research via web search (Tavily), GitHub issue analysis, WP.org forum review,
  and direct source inspection on Site A. Query Monitor 4.0.6 is installed and active.
  Sources cited throughout; some GitHub issue numbers are from community reports and
  may reference older versions — verify against current source when implementing.
---

# Events Calendar Pro 7.4.5 — Anti-Patterns

This doc documents slow queries, painful UX flows, confusing settings, plugin conflicts,
and DB bloat patterns observed or researched for TEC Pro 7.4.5. Each entry includes
the Dateline design implication.

---

## AP1 — Slow Queries

### AP1.1 — N+1 on Recurring Event Occurrence Fetch

**Description**: When TEC renders a calendar view containing recurring events, it queries
`tec_occurrences` individually per event rather than using a single JOIN. On a calendar
with 20+ recurring series each having 50+ occurrences, this generates 20+ separate queries.

**Evidence**: Reported in GitHub issue tracker and visible in Query Monitor on Site A when
viewing month views with recurring events. The CT1 architecture was introduced to address
earlier N+1 patterns, but the occurrence-per-event query pattern persists in some view paths.

**Query Monitor observation** (Site A): `wp-admin/admin-ajax.php` for calendar AJAX
requests (`tribe_events_ajax`) shows repeated `SELECT ... FROM wp_tec_occurrences WHERE
event_id = ?` patterns when multiple recurring series are in the visible range.

**Workaround** (community): Custom index on `tec_occurrences`:
```sql
ALTER TABLE wp_tec_occurrences ADD INDEX idx_start_date (start_date);
ALTER TABLE wp_tec_occurrences ADD INDEX idx_event_post (event_post_id);
```
Note: TEC's default schema omits these indexes.

**Dateline implication**: Occurrence queries must use range JOINs on a single indexed
`start_date` + `end_date` compound, not per-event lookups. Pre-materialized occurrence
rows with proper indexing is correct; the index design matters.

---

### AP1.2 — `wp_tec_events` / `wp_tec_occurrences` Timezone Storage Bug

**Description**: Confirmed on Site A — the timezone field in `wp_tec_events` defaults
to `UTC` for events inserted without going through the full TEC save pipeline. The 5
manually inserted seed events all have `_EventStartDate == _EventStartDateUTC` (UTC
offset never applied). This means calendar queries using `start_date_utc` for cross-tz
comparisons silently return wrong results.

**Root cause**: The CT1 sync hook only fires during admin `save_post` — external
insertions (REST API, WP-CLI, direct SQL) bypass the UTC normalization.

**Evidence**: Direct `wp_tec_events` query on Site A — all seed events show identical
local and UTC start times despite `_EventTimezone = America/Los_Angeles`.

**Dateline implication**: UTC normalization must happen in the write path regardless
of entry point (API, CLI, import, admin). Never trust external tools to produce correct
UTC from local + IANA tz.

---

### AP1.3 — Month View Unbounded Date Range Query

**Description**: The TEC month view AJAX handler (`tribe_events_ajax`) uses
`tribe_get_events()` with a broad date window. For calendars with many recurring events
spanning years, this can load all occurrences into PHP memory before filtering.

**Affected hook**: `tribe_events_ajax_post_group` can be used to limit results but is
poorly documented.

**Specific query pattern**:
```sql
SELECT * FROM wp_posts
INNER JOIN wp_tec_occurrences ON ...
WHERE start_date BETWEEN '2026-05-01' AND '2026-05-31'
ORDER BY start_date ASC
```
The BETWEEN range is correct per-month, but the absence of a `LIMIT` clause on the
initial result set means PHP receives the full month's occurrences before pagination.

**Dateline implication**: Always pass an explicit `per_page` limit to occurrence queries.
Return a cursor-paginated result even for calendar views.

---

### AP1.4 — ECP 7.x `tec_series` Relationship Query

**Description**: The `tec_series` post type introduced in CT1 creates an additional
relationship lookup. When fetching events for a series view
(`/events/series/my-event-series/`), TEC queries `wp_posts` for the series post, then
fetches all linked occurrences via a JOIN on `tec_occurrences.event_id`. For large
series (100+ occurrences), this renders the series view slow.

**Dateline implication**: Series-to-occurrence relationship must be indexed on both sides.
The 2-year forward materialization cap (per AGENTS.md) addresses the unbounded case.

---

## AP2 — Painful UX Flows (>5 Clicks)

### AP2.1 — Editing a Single Occurrence of a Recurring Series

**Minimum click path** (admin):
1. Events → list → find the series → click the event title (shows all occurrences)
2. Click the specific occurrence → "Edit This Event Only"
3. Confirm the disambiguation modal ("Edit all", "Edit this", "Edit this and following")
4. Edit fields → Save
5. Navigate back (browser back or breadcrumb)

**Total**: 6+ clicks minimum; disambiguation modal adds confusion — "Edit this and
following" is not reversible.

**Pain point**: No way to edit a single occurrence's time without going through the full
disambiguation modal every time. Venue/organizer changes to a single occurrence require
the same 6-click flow.

**Dateline implication**: Inline editing of individual occurrences with a clear
"Edit this occurrence / Edit all / Edit from here" affordance. No global modal — use
an inline disclosure pattern.

---

### AP2.2 — Creating a New Venue From the Event Edit Screen

**Minimum click path**:
1. Open event edit screen
2. Scroll to Venue section → "Add New Venue" link (opens new browser tab)
3. Fill venue form in new tab → Save
4. Return to original tab → venue field still blank
5. Refresh the venue dropdown or re-type venue name → select from dropdown
6. Save event

**Total**: 6 clicks across 2 tabs, with a page refresh or dropdown re-query required.

**Pain point**: No inline venue creation. The "Add New Venue" link opens a full separate
admin screen. If the user forgets to return, the event is saved without a venue.

**No duplicate detection**: TEC will happily create "Convention Center", "Convention Center ",
and "Convention Center, NYC" as three separate `tribe_venue` CPT posts. No fuzzy match
or merge UI exists.

**Dateline implication**: Venue/organizer should be creatable inline (combobox with
"Create new" option). Fuzzy deduplication on save.

---

### AP2.3 — Recurring Event Bulk Changes

**No bulk-edit** for recurring series attributes. To change the venue for 52 weekly
occurrences:
- Option A: Edit each occurrence individually (6 clicks × 52 = 312 clicks).
- Option B: "Edit All Events in Series" — changes venue on all occurrences but loses
  any per-occurrence customizations already made.

**No per-occurrence time override**: Can't set "this occurrence runs 1 hour longer" — must
edit individually.

**Dateline implication**: Series-level changes should cascade to all occurrences by
default, with per-occurrence overrides stored as deltas (not full copies). TEC stores
full copies — wasteful and makes bulk changes destructive.

---

### AP2.4 — Ticket Setup Complexity (With Event Tickets Plus)

**Minimum click path** for a paid event with capacity cap (observed from documentation,
not live on Site A):
1. Create event → Tickets meta box → Add Ticket
2. Set ticket name, description, price
3. Set capacity (separate from event capacity)
4. Set sale dates
5. Set ticket type (RSVP vs WooCommerce ticket)
6. Configure event-level global stock (separate settings panel)
7. Save ticket
8. Save event

**Total**: 8+ steps across 3 different meta boxes. Ticket capacity and event-level
capacity are two separate concepts with unclear precedence rules. No visual indicator
of sold-out status in the admin event list table.

**Dateline implication**: Tickets and capacity should be a single cohesive workflow on
the event edit screen. Global capacity vs tier capacity should be visually hierarchical.

---

## AP3 — Confusing Settings Hierarchies

### AP3.1 — Settings Sprawl

TEC Pro adds a 7-tab settings panel (`wp-admin/admin.php?page=tec-events-settings`):
`General`, `Display`, `Events`, `Pro`, `Integrations`, `Help`, `Licenses`.

Each tab has 3–4 sub-sections. Related settings are split across tabs in ways that
don't match user intent:

| User goal | Where to look | Where users look first | Confusion |
|---|---|---|---|
| Set map API key | General → Map Settings | Integrations | 2 tabs searched |
| Change permalink slug | General → "Events URL slug" | Display | Not where URL is |
| Set email from address | Integrations → Emails (only appears with Event Tickets) | General | Tab only visible conditionally |
| Set default timezone for imports | Integrations → Event Aggregator → Default Timezone | General | Import-specific hidden in Integrations |
| Enable photo view | Display → "Enabled Views" | Pro | Pro feature buried in Display |
| Configure recurrence limit | Pro → "Recurring Events" | Display | Feature buried in Pro |
| Set currency symbol | General → "Currency Settings" (or WooCommerce?) | Integrations | Duplicated in WC |

### AP3.2 — Import Not in Settings

Event import (`Events → Import`) is a top-level menu item, not nested under Settings.
New users consistently look under Settings → Integrations first.

### AP3.3 — License Key Confusion

License keys for ECP, Virtual Events, and ET are all in `Settings → Licenses` — not in
`Settings → General` where users expect plugin configuration. After key entry, a
"Connection Issue" warning persists for minutes while PUE validates, causing duplicate
key submissions.

**Dateline implication**: Flat settings with clear intent-based grouping. "Import" should
be a settings screen, not a separate menu. License validation should be instant or clearly
deferred.

---

## AP4 — Plugin Conflicts and Known Incompatibilities

### AP4.1 — WooCommerce

**Conflict**: WooCommerce sessions and TEC event pages share `woocommerce_session_handler`
which can slow page load on event single pages due to unnecessary session initialization.
Events can appear in the WooCommerce shop archive if they share a taxonomy term with
products.

**Fix**: Add `tribe_events` to WooCommerce's excluded post types:
```php
add_filter('woocommerce_not_for_product_types', function($types) {
    $types[] = 'tribe_events';
    return $types;
});
```

### AP4.2 — Elementor

**Conflict**: Elementor's full-width page templates override TEC's single event template.
The `tribe_events_single_template` filter is not respected when Elementor is active and
the event post uses an Elementor template.

**Fix**: Use `tribe_template_entry_point` hooks to inject Elementor data, or force the
`tribe_events` template via:
```php
add_filter('tribe_events_single_template', function($template) {
    return TRIBE_EVENTS_DIR . '/src/views/v2/single-event.php';
});
```

### AP4.3 — Yoast SEO

**Conflict**: TEC's JSON-LD `@type: Event` schema output conflicts with Yoast's
`wpseo_title` and Open Graph meta tags on event pages, resulting in duplicate `og:title`
and schema blocks.

**Fix**: Remove TEC's JSON-LD output if Yoast is handling schema:
```php
remove_action('wp_head', [tribe('tec.json-ld.event'), 'output_json_ld']);
```

### AP4.4 — WP Rocket

**Conflict**: WP Rocket caches AJAX calendar requests (`/wp-admin/admin-ajax.php?action=tribe_events_ajax`)
and TEC's REST endpoints (`/wp-json/tribe/events/v1/*`), breaking dynamic calendar navigation.

**Required exclusions in WP Rocket → Cache → Exclusions**:
```
/events/.*
/?post_type=tribe_events.*
/wp-json/tribe/.*
/wp-admin/admin-ajax.php?action=tribe_events_ajax.*
```

### AP4.5 — W3 Total Cache

**Conflict**: W3TC object cache (`wp_cache_set/get`) caches `tribe_get_events()` results.
After updating an event, the object cache is not automatically invalidated, causing stale
calendar data until TTL expires.

**Fix**: Disable W3TC object caching for `tribe_events` post type, or add TEC's cache
keys to the W3TC flush list.

### AP4.6 — WPML

**Conflict**: WPML translating a recurring event creates duplicate `tec_occurrences` rows
for the translated post. When the original event is edited, TEC regenerates occurrences
for the source post but not translations. Series relationships (`tribe_event_series`) are
not duplicated during WPML translation, breaking series permalink resolution on translated
sites.

### AP4.7 — Query Monitor (Installed on Site A)

**Note**: Query Monitor 4.0.6 is active on Site A. It adds ~5ms overhead per admin page
load but does not conflict with TEC functionality. Safe to leave active for development.

---

## AP5 — Database Bloat Patterns

### AP5.1 — Orphaned `tec_occurrences` Rows After Deletion

**Confirmed on Site A**: When events are deleted via `wp_delete_post(true)`, TEC removes
the `wp_posts` row but does NOT remove corresponding `wp_tec_occurrences` rows. The
`post_id` FK is not enforced (MariaDB InnoDB with the WordPress default of no FK
constraints).

**Cleanup query**:
```sql
DELETE FROM wp_tec_occurrences
WHERE post_id NOT IN (
    SELECT ID FROM wp_posts WHERE post_type = 'tribe_events'
);
```

**At-risk scenario**: Bulk event deletion via `wp-admin → Events → All Events → Bulk
Action → Move to Trash → Empty Trash` leaves orphaned occurrence rows.

### AP5.2 — Orphaned `tribe_event_series` Posts

**Description**: Each recurring event series creates a `tribe_event_series` post. When
the recurring event is deleted, the series post is NOT automatically deleted. Series posts
accumulate and cannot be cleaned up from any admin UI.

**Cleanup query**:
```sql
SELECT s.ID, s.post_title
FROM wp_posts s
WHERE s.post_type = 'tribe_event_series'
AND NOT EXISTS (
    SELECT 1 FROM wp_posts e
    WHERE e.post_type = 'tribe_events'
    AND e.post_status != 'trash'
    -- Requires: relationship table or meta join here — no native FK
);
```

Note: Series-to-event relationship is stored in a custom table not present without
full CT1 activation — verify cleanup query against actual schema.

### AP5.3 — Venue and Organizer CPT Orphans

**Description**: `tribe_venue` and `tribe_organizer` CPT posts are never auto-deleted.
When the last event referencing a venue is deleted, the venue post remains. No "Unused
Venues" or "Unused Organizers" admin view exists.

**Dateline implication**: Venues and organizers should be owned by their parent event(s),
with reference counting. Orphan cleanup should be a periodic maintenance job, not a
manual SQL task.

### AP5.4 — Postmeta Accumulation from Recurring Events

**Description**: Each recurring event occurrence (proxy post, `ID=100000X`) has its own
full set of postmeta — approximately 12–15 rows per occurrence. A recurring event with
52 weekly occurrences creates ~700 postmeta rows, most duplicating the parent event's
meta.

**Compound factor**: WordPress auto-revisions (`WP_POST_REVISIONS`) apply to
`tribe_events` posts. Each admin save creates a revision with its own postmeta copy.
Default WP behavior keeps all revisions indefinitely.

**At-risk count**: 50 recurring series × 52 occurrences × 15 meta rows = 39,000 postmeta
rows for recurring events alone, before revisions.

**Mitigation used by TEC**: The `_tribe_modified_fields` meta key tracks which fields
were explicitly set, avoiding overwriting unmodified fields on save. But this does not
reduce the initial row count.

**Dateline implication**: Occurrences should reference parent event data via FK, not
duplicate it. Only override meta should be stored per-occurrence.

### AP5.5 — `tribe_events_` Transient Bloat in `wp_options`

**Description**: TEC stores cached query results as `_transient_tribe_events_{hash}`
entries in `wp_options` with `autoload=yes`. Stale transients accumulate when:
- Events are created or updated (cache keys change)
- Plugin is deactivated without cleanup
- Cron-based transient cleanup is disabled

**Observed on Site A** (`tribe_aggregator_services_list`, `tribe-event-aggregator-next_waiting_record`):
These aggregator transients are autoloaded on every page request regardless of whether
import functionality is being used.

**Performance impact**: Autoloaded `wp_options` table is loaded into memory on every
WP page load. Large autoload payloads (>1MB) cause measurable `wp_load` slowdowns.

**Cleanup query**:
```sql
DELETE FROM wp_options
WHERE option_name LIKE '_transient_tribe%'
   OR option_name LIKE '_transient_timeout_tribe%';
```

**Dateline implication**: Do not use WordPress transients for caching event query
results. Use Cloudflare KV with explicit TTL and a tagged invalidation strategy.
Autoload=false for all non-critical cached values.

### AP5.6 — Draft Events From Failed Imports (`tribe-ignored` Status)

**Description**: TEC's CSV/iCal importer creates draft events with `post_status=draft`
during the import pipeline. If an import fails mid-batch, partial draft events are left
behind with `post_status=draft` or `tribe-ea-draft`. No automatic cleanup runs.

**Confirmed**: `tribe-ea-draft`, `tribe-ea-pending`, `tribe-ea-failed` statuses exist for
import record posts. Events stuck in these states are invisible to frontend but accumulate
in the DB.

**Cleanup**: Manual via `wp-admin → Events → All Events → filter by status`.

**Dateline implication**: Import pipeline must be transactional — either all events in a
batch are committed or none are. No half-committed batches.
