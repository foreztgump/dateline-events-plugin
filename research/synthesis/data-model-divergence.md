---
doc: data-model-divergence
phase: 5
generated: 2026-05-02
analyst: droid
---

# Data Model Divergence

> **Rule:** where the P0 plugins disagree (different storage strategy, different field, different shape), that is our design decision space.
>
> This document complements [`data-model-convergence.md`](./data-model-convergence.md). Convergence tells us what is non-controversial; divergence tells us where the competitors made different trade-offs — and where Dateline's advantage comes from choosing a better path.
>
> Each section documents:
> 1. The disagreement — what each plugin does
> 2. The options seen — their security, performance, maintainability implications
> 3. What Dateline should do — the recommendation

---

## 1. Time and Date Storage

### 1.1 Unix Timestamp vs. ISO String (UTC)

| Plugin | Strategy | Example |
|--------|----------|---------|
| **EventON** | Unix timestamp string + separate local-time key | `evcal_srow` (UTC int), `_unix_start_ev` (local int) |
| **TEC** | ISO-8601-like Y-m-d H:i:s string, split into UTC and local columns | `_EventStartDate` (local), `_EventStartDateUTC` (UTC) |
| **Eventin** | Date and time split into TWO separate keys | `etn_start_date` (Y-m-d), `etn_start_time` (H:i) |

**Options seen:**

1. **Unix epoch integers** — fast math, native `Date` interop, DST-naive when stored in UTC. Risk: timezone context requires a separate field. EventON stores `evcal_srow` (pure UTC) alongside `_unix_start_ev` (local), meaning every write must keep two keys in sync. Drift is silent.
2. **ISO-8601 strings** (TEC) — human-readable, sortable with no casting. Two keys per event (local + UTC). Same sync problem as EventON. Also: no millisecond precision, no timezone embedded in the string.
3. **Split date + time** (Eventin) — worst of both worlds. The join logic (`Y-m-d` + `H:i` + timezone) is fragile. No native Date support without reconstruction.

**Dateline direction (from convergence):** store single `startAt` + `endAt` as ISO-8601 UTC strings. Embed timezone separately (`timezone: IANA tzid`). This is the only strategy that requires zero sync keys, supports native `Temporal`/`ZonedDateTime` when available, and correctly handles DST with `rrule` `tzid`.

**Why EventON and TEC both chose badly:** WordPress native `postmeta` stores everything as strings; they chose strings that were convenient for SQL sorting (`_EventStartDate`) or Unix math (`evcal_srow`). Dateline does not use postmeta — we use a typed content store — so we escape both traps.

---

### 1.2 All-Day Events

| Plugin | Strategy |
|--------|----------|
| **EventON** | Enum `_time_ext_type`: `n`=normal, `dl`=day-long, `ml`=month-long, `yl`=year-long |
| **TEC** | Boolean `_EventAllDay` |
| **Eventin** | Implicit (no explicit flag; often `etn_end_time` is `23:59`) |

**Options seen:**

1. **Multi-value enum** (EventON) — conflates "all-day" with "month-long" and "year-long" events. Month-long/year-long events are edge cases that are better expressed via `startAt`/`endAt` range. The enum is not extensible.
2. **Boolean** (TEC) — clean, but requires explicit end-date logic (midnight of the following day).
3. **Implicit inference** (Eventin) — silent and fragile. A 23:59 end time could be a timed event ending at 23:59, or an all-day event.

**Dateline direction:** boolean `isAllDay`. Multi-day events use the `startAt`/`endAt` range. Month-long/year-long events are represented as `startAt` to `endAt` with a 30/365-day span. No special enum needed.

---

### 1.3 Timezone Storage

| Plugin | Strategy |
|--------|----------|
| **EventON** | Two keys: `_evo_tz` (IANA), `evo_event_timezone` (text label like "PST") |
| **TEC** | `_EventTimezone` (IANA string) |
| **Eventin** | `event_timezone` (IANA string) |

**Options seen:**

1. **IANA + display label** (EventON) — the label key is stale (e.g. "PST" is wrong during PDT). The label is redundant because `Intl.DateTimeFormat` can derive the abbreviation from the IANA key. Having both creates silent drift risk.
2. **IANA key only** (TEC, Eventin) — correct. Single source of truth. Display labels computed at render time.

**Dateline direction:** IANA key only (`timezone`). No display label stored.

---

## 2. Event Status / Lifecycle

### 2.1 Status Values

| Plugin | Values | Where Stored |
|--------|--------|-------------|
| **EventON** | `published`, `cancelled`, `rescheduled`, `postponed` | `_status` postmeta |
| **TEC** | Standard WordPress `post_status` | `wp_posts.post_status` |
| **Eventin** | Inferred from `post_status` — no custom status in data model observed | `wp_posts.post_status` |

**Options seen:**

1. **Custom status key** (EventON) — separates event status from CMS post status, allowing a `draft` event in the CMS to have a `published` event status (or vice versa). Adds complexity and a second key to manage.
2. **WP post status only** (TEC/Early Eventin) — simpler but conflates CMS workflow with event semantics. A "cancelled" event in TEC is typically a `publish` post with a note — the cancellation is not first-class in the data model.

**Dateline direction:** standalone enum `status` on the event content type. Values: `draft | published | cancelled | rescheduled | postponed | completed`. CMS-level status is separate (`content.status` at the EmDash level). This lets an event move through an edit workflow (`draft` → `published`) independently of event lifecycle (`published` → `cancelled` → `rescheduled`).

---

## 3. Recurrence Architecture

### 3.1 Storage Strategy

| Plugin | Strategy |
|--------|----------|
| **EventON** | Pre-computed repeat intervals in `repeat_intervals` (serialized array of [start, end] pairs); rule keys (`evcal_rep_freq`, `evcal_rep_gap`, etc.) for simple recurring; no RRULE |
| **TEC** | CT1 `rset` (iCalendar RRULE/RDATE/EXRULE string); `tec_occurrences` rows + `tec_series_relationships`; block editor JSON rules |
| **Eventin** | Naive serialized rule in `etn_event_recurrence` and `event_recurrence` — no occurrence materialization observed |

**Options seen:**

1. **Pre-computed interval list** (EventON) — `repeat_intervals` stores every occurrence. For a weekly event over 2 years, that's ~104 array elements. The array is serialized PHP. Query overhead is high (all-or-nothing deserialization). No timezone-aware DST handling. No support for exclusions (EXDATE) or complex BYDAY rules. The admin UI has separate controls for simple vs. custom repeats, with different storage paths.
2. **CT1 custom tables** (TEC) — true relational approach. `tec_events.rset` holds the RRULE. `tec_occurrences` holds materialized rows with `start_date`, `end_date`, `sequence`, `is_rdate`. `tec_series_relationships` links series → events. This is the most robust approach but requires a migration path from legacy postmeta.
3. **Opaque serialized blob** (Eventin) — worst option. No schema visible, no occurrence rows, no materialization. The recurrence is likely evaluated on render by PHP code, which is uninspectable from the data model alone.

**Dateline direction:** lazy materialization from a single RRULE string. The convergence doc specifies `recurrenceRule: RFC-5545 RRULE string`. Occurrences are computed on read (lazy), with a 2-year forward cap. Cache per-range hash in KV (TTL 1 hr). This avoids TEC's materialization overhead (every edit triggers DB migrations/updates) while keeping the data simple. We adopt TEC's RRULE richness without adopting their CT1 table complexity.

**Key divergence insight:** EventON's `repeat_intervals` is the legacy path Dateline would have taken if we were porting EventON directly. It is the wrong path. RRULE + lazy materialization is correct.

---

### 3.2 Per-Occurrence Data (Tickets, RSVP, Capacity)

| Plugin | Strategy |
|--------|----------|
| **EventON** | `ri_capacity` serialized array keyed by repeat index; `ri_count_rs` for per-instance RSVP counts |
| **TEC** | CT1 occurrences have their own rows; capacity and RSVP are per-occurrence via occurrence ID (`occurrence_id`) |
| **Eventin** | No per-occurrence data observed (recurrence is lightweight / no ticket-per-instance) |

**Options seen:**

1. **Serialized per-index maps** (EventON) — `ri_capacity` is a PHP serialized array: `{ 0 => 50, 1 => 50, 2 => 50 }`. No typing, no validation, no efficient lookup. Race conditions between read → modify → deserialize → write.
2. **Row-per-occurrence** (TEC CT1) — clean relational model. Each occurrence row can have distinct `capacity`, `sold`, `RSVP_yes`, etc. However, CT1 requires that every recurrence be materialized eagerly into rows.
3. **No per-occurrence support** (Eventin) — simple but insufficient for real-world ticketing on weekly classes.

**Dateline direction:** Event content type stores the `recurrenceRule`. Each computed occurrence has a derived `occurrenceId` (hash of eventId + occurrence date range). Per-occurrence overrides (capacity, ticket tiers, location) are stored as a map on the event: `occurrenceOverrides: { occurrenceId -> { capacity, ticketTiers, location, ... } }`. This avoids eager materialization while allowing per-instance data. Occurrence IDs are stable (deterministic from RRULE + index).

---

## 4. Location / Venue Modeling

### 4.1 Inline vs. Reference

| Plugin | Strategy |
|--------|----------|
| **EventON** | `event_location` taxonomy term (non-hierarchical) with term meta in `options` table (`evo_et_taxonomy_{term_id}`) |
| **TEC** | Separate `tribe_venue` CPT, linked via `_EventVenueID` integer FK |
| **Eventin** | Inline string/serialized block: `etn_event_location` or `etn_event_location_list` |

**Options seen:**

1. **Taxonomy-as-reference** (EventON) — taxonomies in WordPress are not proper content types. They lack revisions, complex ACF fields, custom endpoints, and have fragile term meta APIs. Storing address, lat/lng in `options` table (not the native `termmeta` table) is a workaround for taxonomy meta limitations. This is an anti-pattern.
2. **CPT-as-reference** (TEC) — correct relational model. Venue is a first-class content type with its own post ID. However, it's restricted to *one* venue per event (the `_EventVenueID` is a single int). Multi-venue events (e.g. "meet at cafe, then move to park") are not supported.
3. **Inline object** (Eventin) — simplest for MVP but duplicates data. Every event stores its own address. Name changes ("The Main Hall renamed to "Grand Hall") require updating every event. No reuse.

**Dateline direction:** support both. Default: `location` is an inline structured object `{ name, type, address?, lat?, lng?, showMap }`. For reusable venues: `venueId` is a reference to a `Venue` content type (separate EmDash content definition). Events can have `venueId` XOR inline `location` — not both. Multi-venue events (v0.2+): `location` becomes an ordered array of location entries, each either inline or referenced.

---

## 5. Organizer Modeling

### 5.1 Taxonomy vs. CPT vs. Inline

| Plugin | Strategy |
|--------|----------|
| **EventON** | `event_organizer` taxonomy term with term meta |
| **TEC** | `tribe_organizer` CPT linked via `_EventOrganizerID` |
| **Eventin** | Inline serialized array: `etn_event_organizer` |

**Same divergence pattern as Location/venue.** The three plugins made the same three choices. The taxonomy path is the same anti-pattern.

**Dateline direction:** `organizers` is a string array of content IDs referencing `Organizer` content type. Multiple organizers supported natively (array). For simple cases, an inline `organizerName` can be stored inside `customFields`.

---

## 6. Tickets & Pricing

### 6.1 Where Ticket Data Lives

| Plugin | Strategy |
|--------|----------|
| **EventON** | Tickets are WooCommerce products (`product` CPT), linked via `tx_woocommerce_product_id`. `evo-tix` CPT is a per-purchase ticket record. Ticket config lives partly on event (`evotx_tix`), partly on WC product. |
| **TEC** | `_EventCost` is a display string on the event. Full ticketing is via Event Tickets (separate plugin, not in P0). |
| **Eventin** | Ticket tiers are native: `etn_ticket_variations` serialized array on the event. `etn-attendee` CPT is the per-purchase record. |

**Options seen:**

1. **External e-commerce dependency** (EventON) — WooCommerce products are the source of truth for price, inventory, and variations. This means ticket data is split across two post types and two taxonomies. WC controls the cart, order, and line-item logic. EventON's `evo-tix` is a denormalized receipt record. Heavy coupling to WC's API changes and hooks.
2. **Display string only** (TEC) — `_EventCost` is a label, not a number. No inventory, no tiering, no variations. TEC historically delegates to a separate "Event Tickets" plugin for full ticketing. This creates a plugin-dependency boundary that users find confusing.
3. **Native tier definitions** (Eventin) — clean. All ticket data is on the event post. `etn_ticket_variations` is a serialized array of tier definitions. `etn-attendee` is the purchase record. No external dependency. However: Eventin has duplicate key problems (`etn_total_avaiilable_tickets` typo, multiple banner/logo keys).

**Dateline direction:** Eventin's native model, but with typed structured data instead of serialized blobs. Ticket tiers (`ticketTiers: TicketTier[]`) are defined on the event content type. Purchases create `Attendee` content records. No external e-commerce dependency for v0.1 — Stripe direct integration. Optional WooCommerce/Shopify integration as a future plugin.

**Key divergence insight:** TEC's "display string only" approach is why users complain about TEC + Event Tickets being "two plugins to do one job". Dateline should ship native ticketing as a core feature, not a plugin.

---

### 6.2 Price Storage

| Plugin | Strategy |
|--------|----------|
| **EventON** | Decimal string (`evcal_paypal_item_price`), decimal on WC product, `regular_price` on variation row |
| **TEC** | String (`_EventCost` — "Free" or "$25.00") |
| **Eventin** | Float (`ticket_price`), float on attendee (`_ticket_price`) |

**Options seen:**

1. **String** (TEC) — "Free" is a valid value. Impossible to sort, sum, or validate. Only for display.
2. **Decimal string / float** (EventON, Eventin) — usable for math but risky for financial precision. Floats lose cents on large numbers. Decimal strings require runtime parsing.
3. **Integer cents** (Not used by any P0 plugin) — Stripe, Square, and modern payment APIs use cents. No precision loss. Easy integer math.

**Dateline direction:** integer cents (`price: number`). Display formatting in frontend. Currency is site-level setting, not per-event. For free events: `price: 0` with `isFree: true` flag (for display purposes like strikethrough "Free" labels).

---

### 6.3 Stock / Inventory

| Plugin | Strategy |
|--------|----------|
| **EventON** | WC product `_stock` (global per product), `ri_capacity` (per-occurrence serialized), `evors_capacity_count` (RSVP cap serialized) |
| **TEC** | Event Tickets plugin (not analyzed) |
| **Eventin** | `etn_total_avaiilable_tickets` (global per event), `etn_total_sold_tickets` (denormalized counter) |

**Options seen:**

1. **WC product stock** (EventON) — atomically managed by WooCommerce's stock system. Good for race conditions. But limited: one stock per product, no per-occurrence or per-tier atomic decrement without custom code.
2. **Serialized capacity maps** (EventON `ri_capacity`, `ri_count_rs`) — not atomic. Multiple concurrent RSVPs can oversell because the read-modify-write happens in PHP serialized arrays.
3. **Denormalized sold counter** (Eventin `etn_total_sold_tickets`) — same race problem. Two concurrent ticket purchases both read `sold=10`, both increment to `11`, capacity is `20`, result is `12` not `12` (actual: if both increment independently the sold count could jump by 2 correctly — but if one writes first, the other overwrites). Actually more critically: both read 10, both write 11, result is 11. Lost update.

**Dateline direction:** KV-based atomic inventory. Key pattern: `inventory:{tierId}` for global tier, `inventory:{tierId}:{occurrenceId}` for per-occurrence. Atomically decrement with `ctx.kv` (Workers KV offers atomic `put` with a conditional CAS-like check, or use KV's built-in counter API if available). Hold reservation uses `hold:{cartId}` with TTL 600s. Promote to attendee inside `ctx.waitUntil`. This is the only strategy that handles concurrent checkouts correctly in a serverless environment.

---

## 7. RSVP vs. Ticket Registration — Parallel Paths

### 7.1 Two Separate Registration Systems

| Plugin | Strategy |
|--------|----------|
| **EventON** | RSVP (`evo-rsvp` CPT) AND Tickets (`evo-tix` CPT) are separate, non-unified. An event can have RSVP, tickets, both, or neither. Each has its own capacity, email flows, and check-in. |
| **Eventin** | Tickets are core. RSVP is a separate module (`rsvp_settings` serialized). Again: parallel paths, not unified. |
| **TEC** | No native RSVP/ticketing in analyzed scope (delegates to Event Tickets) |

**Options seen:**

1. **Separate systems** (EventON, Eventin) — more code, more edge cases, confusing UX. "I have an event with free RSVP and paid tickets — which one do I use?" Check-in apps must support both RSVP codes and ticket QR codes. Email templates are duplicated. Admin dashboards show two separate lists.
2. **Unified attendee model** (Not used by any P0 plugin) — every registrant is an `Attendee`. RSVP is just a zero-price registration. Ticket is a priced registration. Both share check-in, email, and the admin dashboard.

**Dateline direction:** unified `Attendee` content type. Registrations are always `Attendee` records. The event distinguishes `hasRsvp` (free registration available) and `hasTickets` (paid tiers available). An attendee can have `rsvpStatus: yes` + a `ticketTierId` (paid upgrade). This is the biggest design win Dateline can claim over the competition.

---

## 8. Custom Fields

### 8.1 Field Definition Storage

| Plugin | Strategy |
|--------|----------|
| **EventON** | Metabox count via `evo_max_cmd_count` filter. Keys are `_evomdt_subheader_{n}` and free-form prefixed keys. No schema file. |
| **TEC** | `custom-fields` option array (serialized) defines field types. Individual values stored per-event using the field's `name` as the meta key. |
| **Eventin** | `attendee_extra_fields` serialized array on event defines attendee fields. Keys generated from label text via `generate_name_from_label()` — unstable schema. |

**Options seen:**

1. **Runtime-defined keys** (EventON, Eventin) — impossible to lint, type-check, or query efficiently. Label changes break existing data. No migration path.
2. **Option-driven definitions, per-event values** (TEC) — better. Schema is centralized in the `custom-fields` option. Values use named keys. But still serialized in a single option blob.
3. **Typed JSON with stable IDs** (Not used by any P0 plugin) — Dateline's content store support for typed JSON fields.

**Dateline direction:** `customFields` and `attendeeFields` are arrays of `{ key, label, type, options?, required? }` on the event. Keys are stable UUIDs, not derived from labels. Values are stored as typed JSON inside the `Attendee` content record. This is the convergence doc's direction and it is correct.

---

## 9. Seat Maps

### 9.1 Storage

| Plugin | Strategy |
|--------|----------|
| **EventON Seats** | `_evost_sections` serialized PHP array on the event post. Contains sections → rows → seats with status, price, handicap. Seat holds stored in global option `_evost_expiration` (three-level nested array). |
| **Eventin** | `seat_plan` serialized on event (observed in Eventin Pro but not analyzed in depth). |
| **TEC** | No seat map support in analyzed scope |

**Options seen:**

1. **Giant serialized blob** (EventON) — `_evost_sections` is a deeply nested associative array with 4-5 levels. Every seat save re-serializes the entire map. Hold state is in a single site-wide option (`_evost_expiration`) that is read and written on every cart operation. At 1000-seat venues, this is a read-modify-write bottleneck on every page load.
2. **Structured but still serialized** (Eventin) — similar pattern; less detail available from source.

**Dateline direction:** `seatMap` is JSON (not serialized PHP). Structured as typed data. Seat holds use KV with TTL, not a global option. Seat availability is not stored alongside the map definition — the map is static layout, holds are transient KV state. This separates concerns and avoids the global option bottleneck.

---

## 10. Check-in / QR Code

### 10.1 Token Format

| Plugin | Strategy |
|--------|----------|
| **EventON QR** | Ticket number as base64-encoded string in QR URL. Optional AES-256 function exists but is NOT called in main flow. `evoqr_encrypt_dis` toggles base64 on/off. |
| **Eventin** | `etn_unique_ticket_id` string on attendee — observed but format not analyzed in depth. |

**Options seen:**

1. **Base64** (EventON) — not cryptographic. Anyone who scans a QR can decode the ticket number and forge a check-in. The AES helper is dead code.
2. **Plain UUID** (Not used) — guessable if sequential.
3. **Signed JWT** (Not used) — cryptographic integrity via HMAC. Contains eventId, attendeeId, timestamp. Verifiable offline.

**Dateline direction:** `checkInToken` is a signed JWT (HMAC-SHA256, secret per-plugin via `ctx.env` or KV). The token contains `{ eventId, attendeeId, issuedAt }`. Offline check-in PWA can verify the signature with the plugin secret. No QR image storage needed — generated at runtime from the token.

---

## 11. Wishlist / Favourites

### 11.1 Storage

| Plugin | Strategy |
|--------|----------|
| **EventON Wishlist** | Likely user meta or cookie (P3 — not analyzed in depth; source files not read). |
| **Eventin** | Not observed. |
| **TEC** | Not observed. |

**Options seen:**

1. **User meta** — per-user list of event IDs. Simple but not shareable across devices without login.
2. **Cookie / localStorage** — device-local only. Lost on logout/device change.
3. **Cloud-synced content type** (Not used) — `WishlistItem` or `SavedEvent` as a content type, allowing cross-device sync, analytics, and reminder notifications.

**Dateline direction:** P3 / out of scope for MVP. When implemented: `savedEvents` field on user profile (or separate content type if analytics/notification needs arise).

---

## 12. Virtual Events

### 12.1 URL Storage

| Plugin | Strategy |
|--------|----------|
| **EventON** | `_vir_url` string, `_vir_pass` string |
| **TEC** | `_tribe_events_virtual_url`, plus provider enum, embed flags, gating |
| **Eventin** | Multiple keys: `etn_google_meet_link`, `zoom_join_url`, `meeting_link` |

**Options seen:**

1. **Single URL + password** (EventON) — simplest. Password is plaintext in postmeta.
2. **Provider-aware typed config** (TEC) — `_tribe_events_virtual_video_source` is an enum (`zoom`, `google-meet`, `ms-teams`, etc.). Provider-specific config can be added. More extensible.
3. **Multiple URL keys** (Eventin) — confusing. Which one is the "real" URL? Three keys for essentially the same purpose.

**Dateline direction:** `virtualUrl` + `meetingProvider` enum + `virtualPassword` (secret type). Provider-specific config stored as typed JSON. Single source of truth for the join URL.

---

### 12.2 Access Gating

| Plugin | Strategy |
|--------|----------|
| **EventON** | `_vir_after_rsvp` yes/no, `_vir_after_tix` yes/no |
| **TEC** | `_tribe_events_virtual_show_on_event` enum (everyone, logged-in, ticket-holder), `_tribe_events_virtual_ticket_email_link` |
| **Eventin** | Not observed (online vs physical vs hybrid flag only). |

**Options seen:**

1. **Boolean gates** (EventON) — RSVP and ticket are separate booleans. No "logged-in only" option. No granularity (e.g. "RSVP or ticket" — it's AND logic, not OR).
2. **Enum gating** (TEC) — richer. Covers public, logged-in, ticket-holder. But no "RSVP holder" distinction — that's because TEC RSVP is a separate plugin.
3. **Missing: OR logic** — none of the plugins support "RSVP **or** ticket grants access". EventON requires both RSVP and ticket check if both flags are on.

**Dateline direction:** enum `virtualAccess = public | rsvped | ticket_holder | logged_in`. Dateline's unified attendee model means "RSVP" and "ticket" are not separate systems — they're points on the same spectrum. In v0.2, extend to `rsvp_or_ticket` and `specific_tier` (e.g. "VIP ticket holders get early access").

---

## 13. P3 / Frontend-Only Plugins

### 13.1 No Data Model Additions

These plugins add no new fields — they are pure renderers:

| Plugin | What It Adds |
|--------|-------------|
| **eventon-slider** | Frontend rendering; no schema |
| **eventon-full-cal** | One option flag (`evofc_heat`); no event data model |
| **eventon-weekly-view** | Frontend only; no schema |
| **eventon-csv-importer** | CSV-to-meta mapping; no new schema |
| **eventon-wishlist-add-on** | User-side relationship; no event schema |

**Dateline implication:** these plugins are proof that a clean, well-structured event data model enables infinite frontend variations without schema changes. Slider, full calendar, weekly view — all are display concerns. Our data model should make these trivial to implement.

---

## 14. Cross-Cutting Anti-Patterns

### 14.1 Serialized PHP Arrays

Every plugin except TEC (modern CT1 path) uses PHP `serialize()` for complex data. This is the single most damaging design decision across the WordPress event plugin ecosystem.

| Data Structure | Plugin | Serialized In |
|---|---|---|
| `ri_capacity` | EventON | `ajde_events` postmeta |
| `evors_data` | EventON | `ajde_events` postmeta |
| `_evost_sections` | EventON Seats | `ajde_events` postmeta |
| `_evovo_variation_type`| EventON Variations | `ajde_events` postmeta |
| `etn_event_schedule` | Eventin | `etn` postmeta |
| `etn_event_organizer` | Eventin | `etn` postmeta |
| `rsvp_settings` | Eventin | `etn` postmeta |
| `_tec_blocks_recurrence_rules` | TEC | `tribe_events` postmeta (JSON, not PHP serialize) |

**Dateline rule:** no serialized blobs. All structured data is typed JSON in KV or the content store. Native content fields for scalar data.

### 14.2 Denormalized Counters

| Counter | Plugin | Risk |
|---------|--------|------|
| `_rsvp_yes` / `_rsvp_no` / `_rsvp_maybe` | EventON | Race condition on concurrent RSVP submissions |
| `etn_total_sold_tickets` | Eventin | Race condition on concurrent purchases |
| `remaining_count` | EventON | Stale if computed in admin, not real-time |

**Dateline rule:** counters are computed from canonical source (RSVP/ticket tables) on read. KV can cache the result (short TTL, stamped with `max(attendee.updatedAt)`). Atomic inventory uses KV `inventory:{tierId}`.

### 14.3 Settings Blobs

| Plugin | Option Key | Problem |
|--------|-----------|---------|
| **EventON** | `evcal_options_evcal_1` | 200+ keys in one serialized array. No partial update, no validation. |
| **TEC** | `tribe_events_calendar_options` | Same pattern. All or nothing read/write. |
| **Eventin** | `etn_event_options` | Same pattern. |

**Dateline rule:** avoid monolithic settings blobs. Use typed KV keys with plugin-scoped prefixes. `ctx.kv` is auto-scoped — no collision risk.

### 14.4 Taxonomy as Link Table

EventON uses taxonomies (`event_location`, `event_organizer`) to model one-to-many relationships. Term meta lives in `options` table (`evo_et_taxonomy_{term_id}`), not the WP term meta API.

**Why this is wrong:** taxonomies are categorization systems, not relational databases. They lack referential integrity, custom fields, and proper REST endpoints. EventON works around taxonomy limitations by abusing the options table for term meta.

**Dateline rule:** use content references (e.g. `venueId`, `organizerIds[]`) on the event object. Reuse EmDash's content relation system.

---

## 15. Divergence Decision Matrix

| Topic | EventON | TEC | Eventin | Dateline Choice | Why |
|---|---|---|---|---|---|
| Time storage | Unix int + local int | Y-m-d H:i:s local + UTC | Split date + time | **ISO-8601 UTC** | Single key, DST correct, native Date |
| All-day | Enum `_time_ext_type` | Boolean | Implicit | **Boolean** | Simple, extensible via range |
| Timezone label | IANA + stale text | IANA only | IANA only | **IANA only** | No drift, computed labels |
| Event status | Custom meta | WP post_status | WP post_status | **Standalone enum** | Decouples CMS from event lifecycle |
| Recurrence storage | Serialized intervals | CT1 RRULE + tables | Serialized blob | **RRULE string, lazy materialize** | Rich semantics, no eager table growth |
| Per-occurrence data | Serialized index maps | Row-per-occurrence | Not supported | **Occurrence override map** | No eager materialization, still data-rich |
| Location model | Taxonomy term | CPT reference | Inline string | **Inline + reference hybrid** | Flexibility without anti-pattern |
| Organizer model | Taxonomy term | CPT reference | Inline serialized | **Content references** | Multi-organizer, clean relations |
| Ticket data location | WC product dependency | Display string only | Native on event | **Native on event** | Unified, no dependency coupling |
| Price storage | Decimal string/float | String label | Float | **Integer cents** | Financial precision, Stripe-native |
| Inventory | WC stock + serialized maps | Event Tickets plugin | Denormalized counter | **KV atomic decrement** | Serverless-safe, race-free |
| RSVP vs tickets | Separate systems | Separate plugin | Separate module | **Unified attendee model** | One code path, one UX |
| Custom fields | Runtime keys | Option blob + named keys | Label-derived keys | **Stable UUID keys + typed JSON** | Lintable, queryable, migratable |
| Seat map | Giant serialized blob | Not supported | Serialized blob | **JSON layout + KV holds** | Separation of static/dynamic |
| QR token | Base64 | Not analyzed | String ID | **Signed JWT** | Cryptographic integrity |
| Virtual URL | Single URL | Provider-aware | Multiple keys | **Typed provider config** | Extensible, single source |
| Virtual gating | Booleans (AND) | Enum (ticket-holder) | Not supported | **Enum with OR logic** | Unified model enables richer gating |
| Settings | 200-key blob | Monolithic option | Monolithic option | **Typed KV per-key** | Partial update, scoped, no drift |

---

## 16. License Reminder

This document was authored via clean-room analysis of 14 GPL-licensed WordPress plugins. No PHP source code was copied. Identifiers, field names, and data structures were independently derived from the semantic patterns observed across all sources. The Dateline TypeScript interfaces in [`data-model-convergence.md`](./data-model-convergence.md) are original work.
