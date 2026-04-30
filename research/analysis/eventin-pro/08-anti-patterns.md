---
plugin: eventin-pro
version: 4.0.19
base-plugin: wp-event-solution 4.0.16
analyzed: 2026-04-30
analyst: claudeflare
phase: 4
doc: 08-anti-patterns
issue: PRO-337
site: dateline-site-a (WP 6.9.4, PHP 8.2, DDEV)
sources:
  - Static analysis of eventin-pro 4.0.19 source code
  - WordPress.org support forum threads (wordpress.org/support/plugin/wp-event-solution/)
  - Patchstack security review (April 2025)
  - User reviews (WP.org, AppSumo, G2)
  - Dateline research/analysis/eventin-pro/ docs 01–06
---

# Eventin Pro 4.0.19 — Anti-Patterns

---

## 1. Slow Queries / Performance

### 1.1 — All-Event Fetch With Client-Side Hide

**Pattern:** `[etn_pro_events_classic]` and similar listing shortcodes accept `hide_past_events=yes`. The filtering is implemented in JavaScript — past events are fetched from the database and rendered into the DOM, then hidden via CSS class.

**Impact:** On a site with 500+ events, every listing page load fetches all events from `wp_postmeta` (multiple joins), outputs them all into the HTML, and hides the stale ones in the browser. No server-side `WHERE etn_start_date >= NOW()` filter.

**Source evidence:** Template rendering in `templates/` iterates over `WP_Query` results; the `hide_past_events` parameter is translated into a JS variable, not a query arg.

**Dateline implication:** Mandatory server-side date filtering in all event list queries.

---

### 1.2 — Postmeta-Heavy Data Model (No Custom Tables)

**Pattern:** Every piece of event data — ticket tiers, schedules, speakers, FAQ items, organizer data, recurrence rules — is stored as `wp_postmeta` rows. Each event can generate 30–60 postmeta rows.

**Impact:**
- A 1,000-event site has 30,000–60,000 postmeta rows for events alone. Every `WP_Query` with `meta_query` joins this table repeatedly.
- Attendees are a separate CPT with their own postmeta (`etn_attendee_ticket_id`, `etn_attendeee_ticket_status` [typo], etc.) — a sold-out event with 500 attendees creates 500 CPT posts × ~10 meta rows = 5,000 additional postmeta rows.
- No indexing on event date meta keys (`etn_start_date`, `etn_end_date`) — date-range queries do full table scans on `wp_postmeta`.

**User-reported:** "Adding an event took a minute or longer of loading sometimes, and would randomly error out" (webdev3244, WP.org). The admin event-edit screen renders heavy meta queries on page load.

**Dateline implication:** Dedicated tables with proper indexes (Kysely via `ctx.content`) vs. postmeta spaghetti.

---

### 1.3 — Synchronous Webhook Delivery at Shutdown

**Pattern:** Queued webhooks are flushed synchronously in the `shutdown` action (`Webhook\Hooks::webhook_execute_queue`).

**Impact:**
- Webhook delivery happens after the response is sent but within the same PHP process — no background processing.
- Under load, multiple concurrent requests each hold their own HTTP connection open to the webhook endpoint.
- If the webhook endpoint is slow (3–5 s), the PHP worker is tied up for that duration on every page that triggers a webhook event.
- On a shared host or Worker with CPU limits, this causes timeouts.

**Source evidence:** `src/webhook/Hooks.php`, `add_action('shutdown', [$this, 'webhook_execute_queue'])`.

**Dateline implication:** Async delivery via `ctx.waitUntil` — already documented in AGENTS.md as a requirement.

---

### 1.4 — 12-Hour Transient Cache on Webhook List

**Pattern:** The webhook list is cached in a WP transient for 12 hours (`set_transient('eventin_webhooks', ..., 12 * HOUR_IN_SECONDS)`).

**Impact:** A newly created webhook may take up to 12 hours to receive events. Webhook deletion also takes 12 hours to propagate. This is a poor DX for developers integrating with the webhook system.

**Source evidence:** `src/webhook/Api/WebhookController.php`.

---

### 1.5 — React SPA Bundle Size (~500KB gzip)

**Pattern:** The frontend dashboard (`[etn_pro_dashboard]`) loads a single `build/js/script.js` (~500KB gzip, larger uncompressed) on any page containing the shortcode.

**Impact:** First-load penalty on mobile connections. No code splitting — the entire React app loads even for simple dashboard views. `wp_enqueue_scripts` registers the script globally if the shortcode is detected on any page.

---

## 2. Painful UX Flows (>5 Clicks)

### 2.1 — Creating a Paid Ticket Event (>10 Clicks)

**Flow to create a new paid event with one ticket tier:**

1. Eventin → Add New Event (click 1)
2. Enter title
3. Set start date (date picker — click 2)
4. Set start time (time picker — click 3)
5. Set end date (click 4)
6. Set end time (click 5)
7. Scroll to Ticket section → enable tickets (toggle — click 6)
8. Click "Add Variation" (click 7)
9. Fill in tier name
10. Fill in tier price
11. Fill in tier quantity
12. Scroll to location → set location type (click 8)
13. Set publish status → Publish (click 9)
14. Separately go to Settings → Payments → configure Stripe (if not done) — additional 5+ clicks in a different menu

**Total for first event with payment setup: 14+ distinct interactions across two menus.**

**User-reported:** "3) Download version 4. Then it was a catastrophe: impossible to add an event..." (levyd, WP.org). The V4 rewrite of the event editor introduced the most friction.

---

### 2.2 — Sending Certificates to All Attendees (Hidden REST Endpoint)

**Flow:**
- No admin UI button for "Send certificates to all attendees"
- The feature exists only as a REST endpoint: `GET /eventin/v2/events/{id}/send_certificate`
- An admin must either know this endpoint exists and call it manually, or rely on a developer to expose it via a custom admin button

**User impact:** Organizers who want to send certificates after an event will not discover this feature through the admin UI. The Template Builder is prominent; the delivery mechanism is invisible.

---

### 2.3 — Role Permissions UI (Confusing Two-Level Access)

**Pattern:** Eventin has its own "Permissions" menu (`/wp-admin/admin.php?page=eventin_permission`) that controls access to Eventin features. WordPress core user roles still apply on top of it.

**Observed behaviour (user-reported):**
- Granting a user "Editor" role + Eventin permissions for "Events" is insufficient — the user also needs WP Dashboard access or they see a permissions error on the Eventin menu items.
- Eventin's permission UI shows a clean role → feature matrix, but does not warn that WP-level role restrictions take precedence.
- Result: admins spend time debugging why a "permitted" user still can't access events.

**User-reported:** "even when given permission to access Events, Organizers, etc., users are shown an error message about insufficient permissions. You must also give them Dashboard access." (swinggraphics, WP.org)

---

### 2.4 — Module System Without Dependency Hints

**Pattern:** Eventin Pro gates features (RSVP, Dokan, BuddyBoss, Certificates) behind a module toggle in Settings → Modules.

**UX issue:**
- Enabling "WooCommerce" module is required for paid tickets, but the module list uses generic names without explaining what each enables.
- There is no dependency graph shown — enabling "Ticket" module without enabling "WooCommerce" module results in a non-functional ticket form with no clear error.
- No "required by" indicator on module toggles.

---

### 2.5 — Duplicate Output Systems (4 Ways to Add a Calendar)

**Pattern:** The same calendar can be placed via Shortcode, Elementor Widget, Gutenberg Block, or PHP Template. Each has different parameter names and defaults.

**UX issue for site builders:** Choosing a system is a non-trivial decision. Mixing systems (shortcode in one place, block in another) leads to inconsistent styling because each system loads its own CSS. There is no documentation on the canonical preferred method.

**Maintenance cost:** Eventin Pro ships 25+ shortcodes + 21 Elementor widget groups + 14 Gutenberg blocks for substantially overlapping functionality. Bug fixes must be applied in three places.

---

## 3. Confusing Settings Hierarchies

### 3.1 — Settings Spread Across 5+ Tabs with Inconsistent Grouping

**Settings structure:**
```
Eventin → Settings
├── General Tab
│   ├── Event Settings
│   │   ├── Event Details (15+ toggles)
│   │   ├── Archive Event
│   │   └── Attendees
│   └── Slug Settings
├── Payments Tab
│   ├── Payment Method selector
│   └── Currency Settings
├── Email Tab
│   ├── Purchase Email
│   └── RSVP Email
├── Advanced Tab
│   ├── Date/time format
│   ├── Colors
│   ├── Slugs (duplicate — also in General)
│   ├── Webhooks
│   └── Domain Registration
└── Modules Tab (feature toggles)
```

**Issues:**
- Slug settings appear in both General → Slug and Advanced → Slug
- "Domain Registration" (license feature) is buried in Advanced
- Color customization is in Advanced, not alongside display settings in General
- Zoom and Google Meet settings are injected into the Settings page by the integration hooks but are not listed in the main settings tab bar — they appear as sub-items with no navigation hint

### 3.2 — WooCommerce Required Notice Is Non-Dismissible

**Pattern:** When WooCommerce is not active, Eventin shows an admin notice: "WooCommerce is required for paid tickets." This notice is rendered on every admin page and cannot be dismissed.

**Impact:** Sites that use only free events (RSVP only) or Stripe direct see this notice permanently. There is no way to suppress it even if WooCommerce is intentionally not installed.

**User-reported:** "When they added an admin notice about WooCommerce, they did not make the notice dismissible, so you and other admins always see an error that WooCommerce is required, even when you don't use that functionality." (swinggraphics, WP.org — confirmed present as of the review in 2025)

---

## 4. Plugin Conflicts and Known Incompatibilities

### 4.1 — WP 6.9.4 Boot-Timing Incompatibility (Site A)

**Pattern:** Base plugin (`wp-event-solution`) hooks CPT registration to `after_setup_theme` at priority 11. In WP 6.9.4, this hook fires before `plugins_loaded` at priority 999 completes, causing CPT registration to fail with "Invalid post type" errors in the admin.

**Observed:** All admin screens on Site A showed "Invalid post type" errors when the plugin was first activated for PRO-330. The observation matches a known WP 6.7+ change in hook execution order.

**Workaround:** Activating both `wp-event-solution` and `eventin-pro` together (not sequentially) resolved the boot-timing issue in our testing environment. Root cause is in the base plugin, not pro.

**Status:** Not yet fixed in `wp-event-solution 4.0.16`. Fixed in 4.1.x (available as update but not installed on Site A to preserve test environment).

---

### 4.2 — Stripe Double-Payment Bug (Fixed in 4.0.19)

**Pattern:** A double-payment bug was present in pre-4.0.19 versions of Stripe integration — certain checkout flows charged the card twice.

**Status:** Confirmed fixed in 4.0.19 per changelog. Documented here as a known historical regression pattern (the Stripe integration was reimplemented between 4.0.x versions).

**User-reported:** "Yesterday I updated to version 4.0.12 and the payment stopped working." (fravillalo, WP.org). Multiple similar reports around each minor version update.

---

### 4.3 — Security: Admin Email Exposed in Frontend JS

**Pattern:** The plugin localizes data to `etn-public-js-extra` JavaScript variable. This variable includes the site's admin email address, which is then visible in the page source to any visitor.

**Observed:** Confirmed still present as of January 2026 (swinggraphics, WP.org).

**Patchstack (April 2025):** "A March 2025 patch resolved a high-severity local file inclusion flaw." Patching was bundled with feature updates rather than shipped as a standalone security release — delayed remediation for active exploits.

**Impact:** Admin email in public JS creates social engineering and spam surface. Local file inclusion (now patched) was critical severity.

---

### 4.4 — File Editor Forcibly Re-Enabled

**Pattern:** Plugin activation enables the WordPress file editor (theme/plugin editor) — a capability that many admins disable intentionally as a security measure (`DISALLOW_FILE_EDIT`).

**Status:** Reported in 2025. Vendor response claimed it was fixed, but the user confirmed it persisted after the claimed fix.

**User-reported:** "Still force the file editor enabled... their claim to have 'fixed the issues you raised in our latest update' is a lie." (swinggraphics, WP.org, January 2026)

---

### 4.5 — Forced Demo Data and Unwanted User Account Creation

**Pattern:** On first activation, the plugin creates demo event data and user accounts for default "Organizer" and "Speaker" entries. These user accounts are created with email addresses and require manual deletion.

**User-reported (swinggraphics, WP.org):**
- "Should not have to create user accounts for speakers and organizers. Could be optional, but should not be required."
- "Once you delete these default Organizers and Speakers, you then also have to go delete them from Users."
- This occurs "any time the plugin is activated" — re-activation on an existing site re-creates the demo data.

---

### 4.6 — Dokan / Multi-Vendor Cart Validation Conflict

**Pattern:** `woocommerce_add_to_cart_validation` is hooked by Eventin at priority 10 with Dokan-specific cross-vendor validation. When Dokan is not installed, this hook still fires and checks for vendor-specific conditions.

**Risk:** Third-party plugins that also hook `woocommerce_add_to_cart_validation` can conflict with Eventin's validation, preventing valid cart additions.

---

### 4.7 — `posts_join` / `posts_where` Global Filter (Attendee Search)

**Pattern:** `Attendee\Hooks::attendee_ticket_id_search_join` and `::attendee_ticket_id_search_where` are attached to the global `posts_join` and `posts_where` filters with no `is_main_query()` or post-type guard.

**Risk:** These filters potentially modify WP_Query for non-attendee queries on the same request. If a theme or plugin runs multiple WP_Query instances on a page, the attendee search JOINs may be incorrectly applied to unrelated queries, causing unexpected query results or SQL errors.

---

## 5. Database Bloat Patterns

### 5.1 — Serialized Arrays for Structured Data

**Pattern:** All complex data (ticket tiers, schedules, speakers, FAQ items, organizer data, recurrence rules, social links, extra attendee fields) is stored as PHP serialized arrays in `wp_postmeta`.

**Bloat mechanism:**
- Serialized arrays cannot be queried efficiently with `meta_query` — full deserialization is required for any filtering.
- When a ticket tier is updated, the entire `etn_ticket_variations` blob is re-serialized and written back — no partial update.
- Over many edits, serialized blobs grow (stale keys accumulate inside the blob without cleanup).

**Scale projection:** An event with 5 ticket tiers, 10 schedule items, 5 speakers, and 8 FAQ items stored entirely in postmeta blobs vs. normalized rows is 2–4× larger in storage and 10–20× slower to query with filters.

---

### 5.2 — Dual / Triple Meta Key Aliases

**Pattern:** Many fields exist under 2–3 alternate keys (documented in `01-data-model.md`):
- `etn_event_logo` / `event_logo` / `event_logo_id`
- `etn_event_banner` / `event_banner` / `event_banner_id`
- `etn_event_recurrence` / `event_recurrence`

**Bloat mechanism:** When the plugin writes an event, it may write all alias keys, storing the same value 2–3 times. Over thousands of events, this multiplies the `wp_postmeta` row count unnecessarily.

**Query risk:** Code reading these values must check multiple keys for backward compatibility. Some code paths check only one key and silently get `null` when data was written under a different key.

---

### 5.3 — Attendee CPT Per Ticket

**Pattern:** Each ticket purchase creates one `etn-attendee` CPT post. A 500-person event creates 500 posts in `wp_posts` plus ~10 meta rows each = 5,000 postmeta rows, plus 500 `wp_term_relationships` rows for any taxonomy terms.

**Bloat at scale:** A site running 50 events × 200 attendees = 10,000 attendee posts. `wp_posts` is not designed as an attendee registry — no indexing on custom fields like `etn_attendee_ticket_id`, `etn_attendeee_ticket_status` [typo], or `event_id`.

**Query consequence:** Fetching "all attendees for event X" requires a `meta_query` on `wp_postmeta` with a full table scan on the `meta_key = 'etn_event_id' AND meta_value = {X}` predicate. Without a meta index on this key, this is O(n) over the entire postmeta table.

---

### 5.4 — Orphaned Attendee Meta on Refund

**Pattern:** Attendee CPT posts are not automatically removed or cleaned up when WooCommerce orders are refunded or cancelled (see edge case Scenario 5). Orphaned `etn-attendee` posts accumulate over time.

**Bloat mechanism:** High-churn events (recurring weekly, with frequent last-minute ticket changes) generate attendee posts that are never cleaned up. No admin tool or WP-Cron job sweeps orphaned attendees.

---

### 5.5 — `wp_options` Transient Growth

**Pattern:** The 12-hour webhook transient (`eventin_webhooks`) is stored in `wp_options`. If `WP_CRON` is disabled or unreliable (common on DDEV, cron-less environments), expired transients accumulate in `wp_options` and are never purged.

**Additional `wp_options` usage:**
- Module activation states stored as individual options (`eventin_module_{name}` pattern)
- Settings stored as a single large serialized array under `eventin_settings`
- License data stored under multiple `eventin_license_*` keys

**Dateline implication:** Avoid `wp_options` for anything per-event or per-tenant. Use KV with TTLs (already in AGENTS.md).

---

## Summary: Anti-Pattern Severity Matrix

| Anti-Pattern | Category | Severity | Dateline Action |
|-------------|----------|----------|----------------|
| Client-side past-event hide (all events fetched) | Performance | High | Server-side date filter in all queries |
| Postmeta for all structured data (no custom tables) | DB Bloat / Performance | High | Typed tables via `ctx.content` |
| Sync webhook delivery at shutdown | Performance / Reliability | High | `ctx.waitUntil` async delivery |
| Admin email in public JS | Security | High | Never localize server-side secrets to JS |
| File editor forcibly re-enabled | Security | High | Never modify `DISALLOW_FILE_EDIT` |
| Forced demo data / unwanted user creation | UX | Medium | No auto-population; use onboarding wizard |
| WC required notice non-dismissible | UX | Medium | Dismissible notices with "don't show again" |
| Per-occurrence exception: unsupported | Feature Gap | High | EXDATE support in RRULE |
| No cancellation / date-change notification | Feature Gap | High | First-class notification system |
| No waitlist | Feature Gap | High | Native waitlist with KV-backed position |
| No CSV/iCal import | Feature Gap | Medium | Import with full field mapping |
| Attendee CPT per ticket (no custom table) | DB Bloat | High | Dedicated attendees table |
| Orphaned attendees on refund | DB Bloat | Medium | Refund webhook → attendee invalidation |
| Dual/triple meta key aliases | DB Bloat | Medium | Single canonical schema, no aliases |
| 4 parallel output systems (blocks/shortcodes/widgets/templates) | Maintainability | High | Single block/component library |
| Serialized arrays for queryable data | DB Design | High | Normalized relational schema |
| WP 6.9.4 boot-timing incompatibility | Compatibility | Medium | Standard `init` hook for CPT registration |
| 12-hour webhook transient | Performance | Low | KV with short TTL, no stale cache |
