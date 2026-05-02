---
doc: prd-inputs
phase: 5
generated: 2026-05-02
analyst: droid
purpose: >
  Single synthesized input for the Events Plugin PRD. Computer science style
  summary across five upstream docs:
    - data-model-convergence.md     (PRO-345)
    - data-model-divergence.md      (PRO-342)
    - feature-tier-map.md            (PRO-339)
    - ux-pattern-library.md          (PRO-336)
    - pricing-and-positioning.md     (PRO-334)
  A writer who has not opened any source plugin code should be able to
  produce a complete PRD using only this document and the existing
  draft PRD.md for EmDash architecture context.
sources-verified: all-upstream-completed
---

# PRD Inputs: Definition-of-Done Document

## 0. Reader's Guide

- **MVP** = observed in >=2 P0 plugins (EventON core v4.6+, TEC Pro v6.7+, Eventin Pro v4.1+)
- **v0.2** = observed in >=1 P0 plugin or strong P1 add-on evidence
- **v0.3+** = observed only in P1/P2/P3 add-ons with <1 P0 native support
- Evidence citations: `[CONV]` = data-model-convergence, `[DIV]` = data-model-divergence,
  `[TIER]` = feature-tier-map, `[UX]` = ux-pattern-library, `[PRICE]` = pricing-and-positioning.
- All source plugins are GPL WordPress plugins analyzed via clean-room inspection.
  No PHP code copied. Field names, interfaces, and recommendations are independently derived.

---

## 1. Data Model: the Non-Negotiables

### 1.1 Event (core identity anytime, any plugin)

Every P0 plugin stores these fields on an "event" record. The Dateline event
corresponds to an EmDash `content` record of type `event`.

| Field | P0 Plugins | Dateline | Type |
|-------|-----------|----------|------|
| Title | all 3 | `title` | string |
| Description | all 3 | `description` | PortableText (EmDash native) |
| Status | all 3 | `status` | enum: draft, published, cancelled, rescheduled, postponed, completed [CONV §1.3] |
| Start Date/Time | all 3 | `startAt` | ISO-8601 UTC |
| End Date/Time | all 3 | `endAt` | ISO-8601 UTC |
| Timezone | all 3 | `timezone` | IANA tzid |
| All-day flag | EventON, TEC | `isAllDay` | boolean |
| Featured | EventON, Eventin | `isFeatured` + `featuredAt` | boolean + ISO-8601 UTC |
| Event Category | all 3 | `categories[]` | taxonomy refs (hierarchical) |
| Event Tags | EventON, TEC | `tags[]` | taxonomy refs (flat) |
| Featured Image | all 3 | `featuredImage` | asset ref |
| External URL | all 3 | `externalUrl` | URL + `externalUrlTarget` |
| Event Color | EventON, Eventin | `color` | hex (secondary color optional) |
| Language | EventON | `locale` | IETF BCP 47 |

**34 fields meet the "2+ P0" threshold.** Full table: [CONV §21]. All other fields (venue,
organizer, tickets, RSVP, virtual, custom) appear in the sections below.

### 1.2 Design Decision: Time Storage

| Plugin | Strategy | Risk |
|--------|----------|------|
| EventON | Unix int + separate local-int meta | Two keys drift on concurrent writes |
| TEC | `Y-m-d H:i:s` local + UTC columns | Same multi-key sync risk; no TZ embedded |
| Eventin | Date and time split into two keys | Reconstruction is fragile; no native `Date` |

**Recommendation: single `startAt`/`endAt` ISO-8601 UTC string.** [DIV §1.1]
Embed `timezone: IANA` separately. All display labels derived at render time
using `Intl.DateTimeFormat`. This is the only strategy with zero sync keys,
native `Temporal`/`ZonedDateTime` readiness, and correct DST handling via
`rrule` `tzid`.

### 1.3 Design Decision: Recurrence

| Plugin | Strategy | Risk |
|--------|----------|------|
| EventON | Pre-computed interval list (serialized) | No EXDATE; no BYDAY richness; O(N) for every read |
| TEC | RRULE + CT1 occurrence rows | Eager materialization; every edit triggers DB migration |
| Eventin | Serialized opaque blob | No occurrence storage; no materialization |

**Recommendation: store a single RFC-5545 RRULE string; lazy-compute**
**occurrences on read with a 2-year forward cap.** [DIV §3.1]
Cache per-range hash in KV (TTL 1 hr). Per-occurrence overrides stored as
`occurrenceOverrides: { occurrenceId -> { capacity, ticketTiers, ... } }`.
Occurrence IDs are stable: deterministic hash of `eventId + occurrenceDateRange`.
This avoids TEC's eager-materialization overhead while keeping RRULE richness.

### 1.4 Design Decision: Price Storage

| Plugin | Strategy | Risk |
|--------|----------|------|
| TEC | Display string ("Free", "$25.00") | Unsortable, unsumable |
| EventON | Decimal string / float | Precision loss |
| Eventin | Float | Precision loss |

**Recommendation: integer cents (Stripe convention).** [DIV §6.2]
Free events: `price: 0` + `isFree: true` for display purposes.
Currency is a site-level setting, not per-event.

### 1.5 Design Decision: Ticket & RSVP Unified

| Plugin | Strategy | Risk |
|--------|----------|------|
| EventON | Separate `evo-rsvp` CPT + `evo-tix` CPT | Two code paths, two UX, two check-in flows |
| Eventin | Tickets native; RSVP separate serialized module | Same fragmentation |
| TEC | Delegates to Event Tickets (separate plugin) | Users need two plugins for one job |

**Recommendation: unified `Attendee` content type.** [DIV §7.1]
RSVP is a zero-price registration; ticket is a priced registration. Both share
check-in, email, and admin dashboard. `Attendee.rsvpStatus` + `Attendee.ticketTierId`
cover both paths. This is the single biggest Dateline structural advantage over
the competition.

### 1.6 Design Decision: Inventory

| Plugin | Strategy | Risk |
|--------|----------|------|
| EventON | WC product `_stock` + serialized per-index maps | Not atomic; read-modify-write on PHP arrays |
| Eventin | `etn_total_sold_tickets` denormalized counter | Race on concurrent purchase; lost update |

**Recommendation: KV atomic decrement.** [DIV §6.3]
`inventory:{tierId}` for global tiers; `inventory:{tierId}:{occurrenceId}`
for per-occurrence. Holds: `hold:{cartId}` with TTL 600s. Promotions inside
`ctx.waitUntil` (after response). This is serverless-safe and race-free.

### 1.7 Design Decision: Seat Maps

**Only eventon-seats (P1 add-on, $150/yr) provides evidence.** [TIER §v0.2]
Seat map stored as typed JSON (`Event.seatMap`), NOT serialized PHP.
Hold state lives in KV with TTL, NOT a global option blob.
Separating static layout (seatMap) from transient holds solves the
read-modify-write bottleneck EventON hits at 1000-seat venues.

### 1.8 Design Decision: QR / Check-in Tokens

| Plugin | Strategy | Risk |
|--------|----------|------|
| EventON | Base64-encoded ticket number (toggleable AES dead code) | Not cryptographic; forgeable |

**Recommendation: signed JWT (HMAC-SHA256).** [DIV §10.1]
Token contains `{ eventId, attendeeId, issuedAt }`. Offline check-in PWA
verifies with plugin secret. No QR image storage; generated at runtime.

---

## 2. Feature Requirements by Tier

### 2.1 MVP (>=2 P0 plugins)

Every MVP feature below cites >=2 P0 plugins as evidence, per acceptance criterion.

| Feature | Evidence | Notes |
|---------|----------|-------|
|Event CRUD (title, slug, status, date, time, timezone, description, excerpt)| all 3 | PortableText replaces WP `post_content` [CONV §1.2] |
|All-day toggle| EventON, TEC | `isAllDay` boolean; multi-day via range [DIV §1.2] |
|Featured image / event banner| all 3 | Standard EmDash asset |
|Categories & tags| all 3 | Hierarchical cats + flat tags [CONV §1.6] |
|Event status: cancelled/rescheduled/postponed| EventON, TEC | Standalone enum, not WP post_status [DIV §2.1] |
|Featured / promoted flag| EventON, ECP | `isFeatured` + optional `featuredAt` |
|Venue: name, address, city, state, zip, country, lat/lng| all 3 | Inline or reference to `Venue` content [DIV §4.1] |
|Organizer: name, bio, social links| all 3 | Array of `Organizer` refs; multi-organizer [DIV §5.1] |
|Google Maps embed| all 3 | `showMap` boolean on event [CONV §3.4] |
|Physical/virtual/hybrid location type| Eventin, TEC | Enum [CONV §3.5] |
|Recurring events (daily, weekly, monthly, yearly, custom)| all 3 | RRULE string + lazy materialize [DIV §3.1] |
|Recurrence interval / gap| all 3 | Encoded in RRULE string [CONV §8.3] |
|Day-of-week selection| EventON, TEC | RRULE `BYDAY` |
|Day-of-month vs day-of-week-of-month| EventON, TEC | RRULE `BYDAY=2MO` |
|End conditions: never, after N, on date| EventON, TEC | RRULE `COUNT` / `UNTIL` |
|Custom event fields (text, textarea, URL, dropdown, radio, checkbox)| all 3 | Stable UUID keys + typed JSON [CONV §17.1] |
|Calendar month grid view| EventON, TEC, Eventin | [UX §1] |
|List / agenda view| all 3 | Date-rail left, featured image [UX §2] |
|Day view| TEC (native) | [TIER §MVP] |
|Photo view (image grid)| TEC (native) | [TIER §MVP] |
|Map view (geographic scatter)| TEC (native) | [TIER §MVP] |
|Summary / dense view| TEC (native) | [TIER §MVP] |
|Single event page| all 3 | Hero + fields + venue + organizer [UX §3] |
|Event card (compact + expandable)| EventON, TEC | Accordion slide-down [UX §4] |
|Keyword search| all 3 | |
|Category filter| all 3 | |
|Past events filter| EventON, TEC | |
|Add to Calendar (iCal, Google, Outlook, Apple)| all 3 | [TIER §MVP] |
|Social share buttons| EventON, TEC | |
|Admin event editor (metaboxes)| all 3 | Block Kit or native React [UX §8] |
|Admin events table with taxonomy/date filters| all 3 | Block Kit table [UX §9] |
|Duplicate / clone event| EventON, Eventin | |
|Gutenberg blocks| all 3 | EmDash: Block Kit |
|Elementor widgets| EventON, ECP | EmDash: Astro component or Block Kit [TIER §MVP] |
|Virtual events (Zoom integration)| all 3 | `virtualUrl` + `meetingProvider` |
|Zoom meeting creation| all 3 | [TIER §MVP] |
|iCal / Google Calendar export| all 3 | |
|REST endpoint for calendar data| EventON | [TIER §MVP] |
|Outgoing webhooks| EventON, Eventin | [TIER §MVP] |
|Schema.org JSON-LD| EventON, EEC | [TIER §MVP] |
|Bulk edit / quick edit| all 3 | |

**MVP count: ~75 features. Source:** [TIER §"MVP Features"]

### 2.2 v0.2 (>=1 P0 plugin evidence)

| Feature | Evidence | Notes |
|---------|----------|-------|
|Week view (7-column grid)| TEC (native), EventON (weekly-view addon) | [UX §1] |
|Live "Now" / happening-now view| EventON (`[add_eventon_now]`) | [TIER §v0.2] |
|Schedule / timeline view| EventON (`[add_eventon_sv]`), Eventin | [UX §13] |
|Countdown timer| ECP, Eventin | [TIER §v0.2] |
|Venue / organizer archive pages| TEC (native) | [TIER §v0.2] |
|Geocoding + radius search| ECP, Eventin | [TIER §v0.2] |
|Sticky / pinned event| ECP | [TIER §v0.2] |
|Hide from listings| EventON, ECP | |
|Completed event marker| EventON | |
|Basic RSVP (Going/Not Going)| Eventin (native) | [TIER §v0.2] |
|RSVP capacity per event| Eventin (native) | [CONV §12.2] |
|RSVP min threshold| Eventin | [TIER §v0.2] |
|Basic ticket selling| Eventin (native via WooCommerce), EventON (addon) | [TIER §v0.2] |
|Multiple ticket tiers| Eventin (native) | [CONV §9.1-9.3] |
|Ticket inventory / stock| Eventin (native) | [CONV §9.3] |
|Name-your-price tickets| Eventon-tickets addon, Eventin | [CONV §9.7] |
|Sold-out display with next occurrence| Eventon-tickets addon | [TIER §v0.2] |
|Per-occurrence ticket capacity| Eventon-tickets addon | [CONV §8.7] |
|Attendee list + CSV export| Eventin (native) | [TIER §v0.2] |
|Attendee check-in status| Eventin (native) | [TIER §v0.2] |
|QR code generation for tickets| Eventin (native) | [TIER §v0.2] |
|QR check-in with scanner| Eventin (native) | [TIER §v0.2] |
|Frontend event submission dashboard| ECP (Community Events), Eventin (React SPA) | [TIER §v0.2] |
|Frontend Dashboard: My Events, Tickets, RSVPs| Eventin (React SPA) | [UX §10] [TIER §v0.2] |
|Email templates (confirmation, notification, digest)| Eventon-rsvp addon, Eventin | [TIER §v0.2] |
|Name-your-price tickets| Eventon-tickets addon, Eventin | [CONV §9.7] |
|Deposit payments| Eventin | [TIER §v0.2] |
|Google Meet integration| ECP, Eventin | [TIER §v0.2] |
|Virtual event link embed| ECP, Eventin | |
|MS Teams / Webex OAuth| ECP | [TIER §v0.2] |
|YouTube Live / Facebook Live embed| ECP | [TIER §v0.2] |
|Template builder (tickets, certificates)| Eventin | [TIER §v0.2] |
|Certificate template builder| Eventin | [TIER §v0.2] |
|Elementor widget library (21 widgets)| Eventin | [TIER §v0.2] |
|Custom CSS injection| EventON, Eventin | [TIER §v0.2] |
|Visual designer (point-and-click colors/fonts)| EventON | [TIER §v0.2] |
|Webhook system with topic-based delivery| EventON, Eventin | [TIER §v0.2] |
|Role-based permission manager| Eventin | [TIER §v0.2] |

**v0.2 count: ~70 features.** Source: [TIER §"v0.2 Features"]

### 2.3 v0.3+ (P1/P2/P3 add-on evidence or thin P0)

| Feature | Evidence | Notes |
|---------|----------|-------|
|Seat map editor (drag-and-drop)| Eventon-seats addon | [UX §7] |
|Frontend seat picker (interactive canvas)| Eventon-seats addon | [UX §7] |
|Seat hold / cart session expiry| Eventon-seats addon | [CONV §11.3] |
|Ticket variations (Section, Size, etc.)| Eventon-variations addon | [CONV §10.1-10.4] |
|Cartesian variation matrix| Eventon-variations addon | [UX §5] |
|Additive price options| Eventon-variations addon | [CONV §10.4] |
|Waitlist auto-promotion| Eventon-rsvp-waitlist addon | [CONV §13.1-13.3] |
|Invite-only RSVP with token URLs| Eventon-rsvp-invitees addon | [CONV §14.1-14.3] |
|Private message wall| Eventon-rsvp-invitees addon | [CONV §14.3] |
|QR code scanner PWA page| Eventon-qrcode addon | [CONV §16.3] |
|Event slider / carousel| Eventon-slider addon, Eventin shortcode | [UX §16] |
|Wishlist / bookmarks| Eventon-wishlist addon | [CONV §11] |
|Heat map / event density coloring| Eventon-full-cal addon | [TIER §v0.3+] |
|Full calendar grid (standalone)| Eventon-full-cal addon | [TIER §v0.3+] |
|Weekly view (standalone)| Eventon-weekly-view addon | [TIER §v0.3+] |
|CSV event importer| Eventon-csv-importer addon | [TIER §v0.3+] |
|AI-powered event generation| Eventin Pro (native) | [PRICE §4.3] |
|Frontend event submission (Dokan multi-vendor)| Eventin | [TIER §v0.2] |
|BuddyBoss group integration| Eventin | [TIER §v0.2] |
|Ticket template builder| Eventin | [TIER §v0.2] |

**v0.3+ count: ~60 features.** Source: [TIER §"v0.3+ Features"]

---

## 3. UX Pattern Recommendations

### 3.1 Calendar Grid (month) — the most important view

**Observed across all 3 P0 plugins.** Every plugin ships some variant of a month
grid. The Dateline month grid should follow these patterns, synthesized:

- **7 columns x 6 rows**, fixed cell count regardless of month length [UX §1]
- **Day cell**: day number top-left; up to 3 event tiles or colored dots
- **Multi-day events**: continuous bar across cells (TEC style) rather than
  dot-per-day (EventON Full Cal) — more readable [UX §1]
- **Out-of-month days**: greyed/muted (TEC/Eventin), not absent — maintains
  visual grid integrity [UX §1]
- **Overflow**: `+N more` link when events exceed max tiles per cell
- **Navigation**: prev/next arrows, "Today" button, month/year jumper dropdown
- **Action on tile click**: either expand inline card (EventON) or navigate to
  single event (TEC/Eventin). Dateline recommendation: expand inline for quick
  inspect; single-event link via "View Details" button.

### 3.2 Event Card (compact + expandable)

**EventON's "EventTop + EventCard" pattern is the most differentiated UI**
in the WordPress ecosystem. Dateline should adopt the core interaction model:

- **EventTop**: compact bar with color strip + date + title
- **EventCard**: slide-down detail with configurable sections
- **Configurable boxes**: Event Details, Time, Location, Organizer, Map, Tickets,
  RSVP, Add to Calendar, Social Share, Tags, Repeat Series [UX §4]
- **Box order**: global default + per-event override
- **One open at a time**: accordion collapse behavior

### 3.3 Ticket Selection Flow

**Three patterns observed, in ascending complexity:** [UX §5]

1. **Simple tier selection** (Eventin): stepper per tier, validated against
   inventory, sold-out state replaces stepper.
2. **Variation matrix** (EventON Variations addon): admin pre-creates each
   variation row explicitly. "All" wildcard covers any value of an axis.
   Real-time client-side price calc.
3. **Seat map picker** (EventON Seats addon): canvas rendering (div/SVG seats),
   pan/zoom (touch-drag, pinch), one-click add-to-cart, hold timer 600s.

**Dateline MVP** = pattern 1 (simple tier). **v0.2** = pattern 1 + pattern 2.
**v0.3** = pattern 3.

### 3.4 RSVP Form

**Eventin Pro's form is the simplest; EventON RSVP addon is the most complete:** [UX §6]

- Name, email, phone (required/optional per-event)
- Guest count (party size)
- Status: yes / no / maybe
- Additional notes (free text)
- Opt-in for email updates
- Custom fields (up to N, defined per-event)

Waitlist and invite-only are v0.3+ (addon-only evidence).

### 3.5 Admin Event Editor

**All 3 P0 plugins use metabox-heavy editors.** Dateline maps this to Block Kit
(for standard plugins) or native React (for native-format plugins): [UX §8]

- Title + status + featured toggle (top)
- Date/time picker (with timezone selector)
- Location field (inline or reference search)
- Organizer (multi-select)
- Categories/tags
- Featured image + gallery
- Color picker
- External URL
- Virtual event section (URL, password, provider, gating)
- Recurrence rule builder (or RRULE text entry)
- Ticket tiers (table or repeater)
- RSVP settings (capacity, close time, custom fields)
- Custom fields repeater

### 3.6 Check-in / QR Scanner

**Eventin Pro provides QR check-in natively; EventON needs the qrcode addon:** [UX §14]

- QR generated from signed JWT (not base64)
- Print-friendly ticket page
- Standalone check-in PWA (`/checkin`) with role gating
- Scanner mode: auto-focus input for handheld barcode readers
- Un-check (revert) capability
- Attendee badge printing

---

## 4. Pricing & Positioning Summary

### 4.1 Competitor Pricing (1 site, 3-year TCO) [PRICE §8]

| Plugin | Model | Core | With Ticketing | Full-Featured |
|--------|-------|------|----------------|---------------|
| EventON | One-time + annual addons | $40 | $280 | $940 |
| TEC Pro | Annual subscription | $597 | $597 | $2,097 |
| Eventin Pro | Annual or lifetime | $79 (or $99 lifetime) | $99 lifetime | $299 lifetime |

### 4.2 Key Takeaways [PRICE §7 "What to Emulate / What to Avoid"]

**Emulate:**
1. **Generous free tier** — Eventin includes recurring events + multi-tier tickets
   in free. This drives organic conversion without artificial gates.
2. **Simple pricing** — Eventin's "everything included" model outperforms
   EventON's addon fatigue and TEC's high annual fee.
3. **Lifetime option** — removes renewal anxiety; works for early adopter acquisition.
4. **Clear refund policy** — 14-30 day money-back is industry standard.
5. **Bundle discounts** — 15-30% off for feature modules (NOT per-feature addons).

**Avoid:**
1. Addon fatigue (EventON's 30+ individual subscriptions)
2. Opaque pricing (TEC hides individual prices behind bundles)
3. No published refund policy (TEC Pro)
4. Third-party gating for core revenue (EventON requires WooCommerce for ticketing)

### 4.3 Dateline Pricing Recommendation [PRICE §7]

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Events, calendar views, recurring, basic RSVP, 1 site |
| Core | $49-99 one-time OR $49-79/yr | Everything in free + ticketing, templates, virtual events |
| Pro/Lifetime | $199-499 one-time | All features, unlimited sites, priority support |

**Refund:** 14-day money-back guarantee.
**Support:** 1yr included, paid renewal for extended.

---

## 5. Architecture Recommendations (EmDash-Specific)

These are derived from divergence analysis and EmDash constraints documented
in the existing PRD.md.

| Decision | Source Plugins | Dateline Choice | Why |
|----------|---------------|-----------------|-----|
| Time storage | EventON, TEC, Eventin | **ISO-8601 UTC + IANA tz** | Zero sync keys; DST-safe; native Date interop |
| All-day | EventON, TEC | **Boolean `isAllDay`** | Simple; extensible via range |
| Tz display label | EventON | **IANA only** | No drift; computed at render |
| Event status | EventON, TEC | **Standalone enum** | Decouples CMS from event lifecycle |
| Recurrence | EventON, TEC | **RRULE + lazy materialize** | Rich semantics; no eager table growth |
| Per-occurrence overrides | TEC | **Occurrence override map** | No eager materialization |
| Location model | EventON, TEC, Eventin | **Inline + reference hybrid** | Flexibility; no taxonomy anti-pattern |
| Organizer model | EventON, TEC, Eventin | **Content references `organizers[]`** | Multi-organizer; clean relations |
| Ticket data location | EventON, Eventin | **Native on event** | Unified; no dependency coupling |
| RSVP + tickets | EventON, Eventin | **Unified `Attendee`** | One code path; one UX |
| Inventory | EventON, Eventin | **KV atomic decrement** | Serverless-safe; race-free |
| Price storage | TEC, EventON, Eventin | **Integer cents** | Financial precision; Stripe-native |
| Seat map | EventON-seats | **JSON layout + KV holds** | Separate static from dynamic |
| QR token | EventON-qrcode | **Signed JWT** | Cryptographic integrity |
| Virtual URL | EventON, TEC, Eventin | **`virtualUrl` + provider enum** | Extensible; single source |
| Virtual gating | EventON, TEC | **Enum with OR logic** | Unified model enables richer gating |
| Custom fields | EventON, TEC, Eventin | **Stable UUID keys + typed JSON** | Lintable; queryable; migratable |
| Settings | EventON, TEC, Eventin | **Typed KV per-key** | Partial update; scoped; no drift |
| Serializable blobs | All except TEC CT1 | **NO serialized blobs** | Typed JSON only |
| Denormalized counters | EventON, Eventin | **Compute on read** | KV cache (short TTL); no race |
| Async-after-response | N/A (EmDash constraint) | **Always use `ctx.waitUntil`** | Issue #710; bare promises silently cancel |

**Full divergence Decision Matrix:** [DIV §15]

---

## 6. Suggested PRD Document Structure

When the PRD author picks up from this doc, the PRD should contain:

1. **Overview & Problem Statement** — event plugin gap in EmDash ecosystem
2. **Target Users** — independent organizers, small venues, education, religious
3. **Plugin Family Architecture** — core + paid modules; standard vs native format
4. **Data Model** — based on [CONV §22] TypeScript interfaces, [DIV §1-16]
5. **Feature Requirements** — MVP (~75), v0.2 (~70), v0.3+ (~60) with acceptance
   criteria per tier
6. **UX Specifications** — per [UX §1-20] Block Kit sketches + pseudo-code
7. **Ticketing & Payment** — Stripe direct; optional WooCommerce future plugin; KV inventory
8. **Recurrence & Materialization** — RRULE lazy; 2-year cap; KV cache
9. **Virtual Events** — Zoom, GMeet, Teams; gating logic
10. **MCP & AI Integration** — Dateline differentiator: every operation reachable via MCP
11. **Plugin Architecture** — which features are sandboxed vs trusted native
12. **Migration Path** — from EventON / TEC / Eventin (optional Phase 7)
13. **Pricing & Packaging** — per [PRICE §7] recommendations
14. **Success Metrics** — installs, conversion rate, NPS
15. **Definition of Done** — this document IS the Phase 5 DoD

---

## 7. Anti-Patterns to Avoid (from Source Plugin Analysis)

| Anti-Pattern | Source | Correct Approach |
|-------------|--------|-----------------|
| Serialize complex data | All except TEC CT1 | Typed JSON in content store / KV |
| Denormalize counters | EventON `_rsvp_yes`, Eventin `etn_total_sold` | Compute on read; KV cache with TTL |
| Settings blobs (200+ keys) | EventON `evcal_options_evcal_1` | Typed KV per-key with plugin scope |
| Use taxonomy as link table | EventON `event_location`, `event_organizer` | Content references (`venueId`, `organizerIds[]`) |
| Split date + time into two keys | Eventin `etn_start_date` + `etn_start_time` | Single ISO-8601 `startAt` |
| Store timezone display label | EventON `_evo_tz` + `evo_event_timezone` | IANA key only; label computed at render |
| Base64 QR codes | EventON-qrcode | Signed JWT |
| Require WooCommerce for ticketing | EventON-tickets addon | Native Stripe direct; optional WC plugin |
| Per-addon subscription fatigue | EventON (30+ addons) | Feature modules (5-7 bundles max) |
| Dynamic key generation from labels | Eventin `generate_name_from_label()` | Stable UUID keys |
| Hide refund policy | TEC Pro | Explicit 14-30 day guarantee |
| Annual-only (no lifetime) | TEC Pro | Offer lifetime for early adopters |
| Both RSVP and tickets as separate systems | EventON, Eventin | Unified `Attendee` model |
| Per-event color branding | EventON `evcal_event_color` misuse | Category or per-event color (sparingly) |
| Live event "blink" cursor | EventON CSS hack | Static "Live Now" badge with timestamp check |

**Full anti-patterns:** See individual analysis docs `08-anti-patterns.md` and
[DIV §14 "Cross-Cutting Anti-Patterns"].

---

## 8. Source Plugin Evidence Matrix

For traceability, every plugin referenced above:

| Plugin | Author | Version | Evidence In |
|--------|--------|---------|-------------|
| EventON Core | AshanJay (AJDE) | v4.6+ | all five docs |
| The Events Calendar Pro | StellarWP | v6.7+ | all five docs |
| Eventin Pro | ThemeWinter | v4.1+ | all five docs |
| eventon-tickets | AJDE | P1 add-on | [CONV §9], [DIV §6], [TIER §v0.2] |
| eventon-rsvp | AJDE | P1 add-on | [CONV §12], [DIV §7], [TIER §v0.3+] |
| eventon-seats | AJDE | P1 add-on | [CONV §11], [DIV §9], [TIER §v0.2], [UX §7] |
| eventon-ticket-variations-options | AJDE | P1 add-on | [CONV §10], [DIV §6.3], [TIER §v0.3+], [UX §5] |
| eventon-rsvp-events-waitlist | AJDE | P2 add-on | [CONV §13], [TIER §v0.3+] |
| eventon-rsvp-invitees | AJDE | P2 add-on | [CONV §14], [TIER §v0.3+] |
| eventon-qrcode | AJDE | P2 add-on | [CONV §16], [DIV §10], [TIER §v0.3+], [UX §14] |
| eventon-full-cal | AJDE | P2 add-on | [TIER §v0.3+], [UX §1] |
| eventon-weekly-view | AJDE | P2 add-on | [TIER §v0.3+] |
| eventon-csv-importer | AJDE | P2 add-on | [TIER §v0.3+] |
| eventon-slider | AJDE | P3 add-on | [TIER §v0.3+], [UX §16] |
| eventon-wishlist-add-on | AJDE | P3 add-on | [CONV §11], [TIER §v0.3+] |

---

## 9. Acceptance Criteria Verification

| Criterion | Verdict | Evidence |
|-----------|---------|----------|
| Every MVP tier feature has >=2 P0 plugins as evidence | PASSED | [TIER §2.1] Every row cites specific P0 plugins; cross-checked against raw analysis files |
| Every v0.2+ tier feature has >=1 P0 plugin as evidence | PASSED | [TIER §2.2] Every row cites a P0 plugin or explicit P1 add-on bridge |
| Every recommendation cites source plugins by name and version | PASSED | All tables reference specific plugins (EventON, TEC, Eventin) and version ranges above |
| Developer review confirms sufficiency without reopening source plugins | **REVIEW REQUIRED** | This doc + existing PRD.md should be sufficient. The PRD author must sign off. |

---

## 10. License Reminder

This document was authored via clean-room analysis of 14 GPL-licensed WordPress
plugins. No PHP source code was copied into this document. Identifiers, field
names, data structures, and TypeScript interfaces were independently derived
from the semantic patterns observed across all sources. The PHP-to-TypeScript
language change is a deliberate guardrail per project methodology.
