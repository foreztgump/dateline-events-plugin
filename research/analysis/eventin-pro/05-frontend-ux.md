---
plugin: eventin-pro
version: 4.0.19
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Documented from static analysis of templates/, widgets/, shortcodes/, and build/ 
  artifacts. Live site walkthrough was blocked by a WP boot-timing incompatibility 
  on WP 6.9.4 (see 04-admin-ux.md note). i18n strings supplemented the analysis.
---

# Eventin Pro 4.0.19 — Frontend UX

---

## Overview: Frontend Surface Area

Eventin Pro delivers frontend output through four parallel systems:

| System | Entry point | Pro-specific |
|--------|-------------|--------------|
| **PHP Templates** | `templates/` directory | Yes — 3 single-event layouts |
| **Shortcodes** | 25+ `[etn_pro_*]` shortcodes | Yes |
| **Elementor Widgets** | 21 widget groups | Yes |
| **Gutenberg Blocks** | 14 pro block types | Yes |

All four coexist and are independently usable. This means admins have 4 different ways to place the same calendar on a page — a maintenance burden with no single canonical path.

---

## 1. Event Archive / Listing Pages

### URL Structure
- **Archive page**: `/etn/` (configurable slug in Settings → General)
- **Category archive**: `/etn-category/{slug}/`
- **Tag archive**: `/etn-tag/{slug}/`

### Archive Display (base plugin)
The free Eventin base plugin handles the basic archive. Pro enhances with:

- **Filterable calendar** — category and date filters injected above the list
- **Grid / list / calendar view toggle** (when calendar block shortcode is used)
- **Pagination** — respects "Events Per Page" setting

### Shortcodes for Event Listings

#### `[etn_pro_events_classic]`
| Parameter | Default | Description |
|-----------|---------|-------------|
| `column` | 3 | Grid columns (1–4) |
| `limit` | 6 | Events per load |
| `category` | all | Filter by category slug |
| `order` | DESC | date ordering |
| `hide_past_events` | no | Show/hide past events |
| `button_label` | "Buy Ticket" | CTA button text |
| `image_height` | 250 | Thumbnail height in px |
| `show_date` | yes | Show date badge |
| `show_time` | yes | Show time |
| `show_location` | yes | Show location |

**Rendered output**: Image card with event thumbnail, date badge overlay, title, date/time/location row, CTA button.

#### `[etn_pro_events_standard]`
Similar parameters to classic. Standard layout uses a horizontal card (image left, text right).

#### `[etn_pro_events_sliders]`
Parameters: `autoplay`, `autoplay_speed`, `loop`, `items`, `margin`, `nav`, `dots`.
Rendered as OWL Carousel with responsive breakpoints.

#### `[etn_pro_events_tab]`
Groups events by category into tabs. Tab navigation rendered horizontally above the listing.
Parameters: `categories`, `limit`, `column`.

#### `[etn_pro_events_one_line]`
Compact single-line event list: just date | title | category | location | button.
Useful for sidebar widgets or "upcoming events" strips.

---

## 2. Single Event Page

Three layout variants, selectable per event in the "Template" publish metabox:

### Layout 1: Default (event-one)
```
[Hero image — full width]
[Breadcrumb]
[Event title]
[Date | Time | Location | Category badges]
[Ticket purchase form (if tickets enabled)]
[Description / Content]
[Schedule section]
[Speakers grid]
[Organizer info]
[FAQs accordion]
[Related events]
[Social share buttons]
[Tags]
```

### Layout 2: Event Two
```
[Split-screen hero: image left / event details right]
[Banner with countdown timer overlay]
[Date, time, location sidebar panel]
[Ticket form]
[Description]
[Schedule tabs]
[Speakers]
[FAQ accordion]
[Organizer card]
[Related events row]
```

### Layout 3: Event Three
```
[Full-width banner with text overlay]
[Countdown timer as overlay on banner]
[Category badges under title]
[Content body]
[Tags strip]
[Location map/details panel]
[Speakers row]
[FAQ accordion]
[Organizer block]
[Attendee list (if enabled)]
[Related events]
```

### Template Hook Points
Each layout exposes Eventin-specific action hooks for theme customization:
- `etn_before_single_event_content_title` — above title
- `etn_before_single_event_details` — above details panel
- `etn_after_single_event_content_title` — below title
- `etn_after_single_event_content_body` — below main content (tags, locations, schedules)
- `etn_after_single_event_content_wrap` — below the wrap (speakers, FAQs, organizers)
- `etn_after_single_event_meta` — below meta block (attendee list, related events)
- `etn_after_single_event_details_rsvp_form` — after RSVP form

---

## 3. Ticket Purchase Flow

### Entry Point
Ticket form appears on the single event page via:
- Template hook (auto-placed in single event layouts)
- `[etn_pro_ticket_form]` shortcode
- `BuyTicket` Gutenberg block

### Flow Steps

**Step 1 — Ticket Selection**
```
┌─────────────────────────────────────┐
│ Ticket Tiers                        │
│ ┌──────────────────┬──────────┬───┐ │
│ │ General Admission │ $25.00   │ - 0 + │
│ │ VIP              │ $75.00   │ - 0 + │
│ └──────────────────┴──────────┴───┘ │
│                                     │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```
- Quantities validated against available inventory
- Sold-out tiers show "Sold Out" label, stepper disabled
- Max per order enforced client-side and server-side

**Step 2 — Attendee Details Form**
Per-ticket attendee detail collection:
- Name (required)
- Email (required)
- Phone (optional)
- Any extra fields configured per event (`attendee_extra_fields`)

Multi-ticket orders: one form set per ticket quantity (e.g., 3 General = 3 attendee forms).

**Step 3 — WooCommerce Checkout**
- "Add to Cart" redirects to WooCommerce cart
- Payment via Stripe or PayPal (configured in Settings → Payments)
- WC Deposits supported for partial payments
- On order completion: attendee CPTs created, confirmation emails sent

**Step 4 — Confirmation / Ticket Download**
- WooCommerce thank-you page with customized text
- Download ticket button: `?etn_action=download_certificate&attendee_id=X&event_id=Y&etn_info_edit_token=TOKEN`
- Token is stored in `etn_info_edit_token` meta on the attendee
- No account required to download ticket (token serves as auth)

**Free Events:**
- If all ticket tiers have price 0, purchase completes without WooCommerce checkout
- Attendee created immediately on form submit

---

## 4. RSVP Flow (module-gated)

RSVP and Tickets are **parallel flows** — both can be active on the same event simultaneously (unusual UX).

### Entry Point
RSVP form via:
- Automatic placement in single event template after ticket form
- `EventRSVP` Gutenberg block
- Hook: `etn_after_single_event_details_rsvp_form`

### Simple RSVP Form
```
┌─────────────────────────────────────┐
│ Will you attend?                    │
│ [Going] [Not Going]                 │
└─────────────────────────────────────┘
```
Logged-in users: RSVP recorded immediately.
Logged-out users: redirect to login or guest form.

### Advanced RSVP Form
Adds:
- Name, Email, Phone (if not logged in)
- Number of guests
- "Not going" reason text area

### RSVP Status Display
After submitting:
- Button changes to ✅ Going / ❌ Not Going with count
- "X people going" counter

### RSVP Limits
- `etn_rsvp_limit_amount` — max RSVPs accepted
- `etn_rsvp_miminum_attendee_to_start` — minimum threshold; event "confirmed" only if met
- Admin can view RSVP list from attendee screen or REST API

---

## 5. Calendar Views

### Standard Calendar (`[etn_pro_calendar_standard]`)
- Full FullCalendar-style month grid
- Click a date cell → events that day listed in a popup
- Navigation: prev/next month arrows
- Category filter above calendar
- Responsive: collapses to list on mobile

### List Calendar (`[etn_pro_calendar_list]`)
- Time-ordered list view (agenda style)
- Infinite scroll or pagination
- Filter by category / date range
- Search field

### Recurring Event Display (`[etn_event_recurring]`)
- Shows all future occurrences of a recurring event
- Parameters: `single_event_ids`, `limit`, `column`
- Each occurrence links to its own occurrence page or the parent

---

## 6. Countdown Timer (`[etn_pro_countdown]`)

```
Days  Hours  Minutes  Seconds
 02    14      37       22
```
- Real-time JS countdown to `etn_start_date` + `etn_start_time`
- Parameters: `id` (event post ID), `label_days`, `label_hours`, etc.
- On expiry: "Event has started" or custom end text
- Also available as `EventCountDownTimer` block

---

## 7. Schedule Display

### Schedule Tab (`[etn_pro_schedules_tab]`)
- Day tabs (Day 1, Day 2, etc.) or date-labeled tabs
- Each tab shows session list:
  - Time range
  - Session title
  - Speaker name + photo
  - Venue/room name
- AJAX tab switching (no page reload)

### Schedule List (`[etn_pro_schedules_list]`)
- Simple vertical list of all sessions
- No tabs — all days shown sequentially
- Three style variants (style-1 / style-2 / style-3)

---

## 8. Speaker Directory

### Speaker Classic (`[etn_pro_speakers_classic]`)
- Grid of speaker cards
- Card: photo, name, designation, company, social icons
- 3 style variants

### Speaker Standard (`[etn_pro_speakers_standard]`)
- Horizontal card layout

### Speaker Slider (`[etn_pro_speakers_sliders]`)
- Carousel with OWL Carousel
- 5 style variants
- Parameters: `autoplay`, `items`, `nav`, `dots`

---

## 9. Organizer Display

`[etn_pro_organizers]` shortcode:
- Organizer name, email, website, phone
- Logo image
- 2 style variants

---

## 10. Attendee List (`[etn_pro_attendee_list]`)

Publicly viewable attendee roll (if admin-enabled):
- Attendee name
- Ticket type purchased
- Check-in status (if shown)
- Avatar (gravatar)

Admin controls visibility of email address (privacy setting).

---

## 11. Frontend Dashboard (`[etn_pro_dashboard]`)

The most complex frontend element. A **React SPA** embedded in a WordPress page.

### Who sees it
- Users with `author`, `seller`, or `etn_manage_attendee` capability
- Unauthorized users see a "You are not authorized" message

### Dashboard Sections

**My Events tab**
- List of events this user has created (as event author)
- Create New Event button → frontend event creation form
- Per-event: Edit, Clone, Trash, View Attendees

**Frontend Event Creation Form**
Full-featured event form mirroring the admin edit screen:
- Title, description
- Date/time fields
- Location (online/physical/hybrid)
- Ticket tiers (add/remove)
- RSVP settings
- Speaker selection
- Category assignment
- Image upload

**My Tickets tab** (for event attendees)
- Events the user has purchased tickets for
- Download Ticket button per purchase
- View event details

**My RSVPs tab**
- Events the user has RSVP'd to
- Cancel RSVP button

**Attendees tab** (for event authors only)
- List of attendees for user's events
- Export CSV button
- Manual check-in toggle per attendee

**Notification tab**
- Email notification settings (opt-in/opt-out per event type)

### Technical Implementation
- Built script: `build/js/script.js` (React, ~500KB gzip)
- Localized via `wp_set_script_translations` + `wp-i18n`
- REST API: all operations via `eventin/v2/*` endpoints
- Auth: WP nonce passed via JS var `eventin_pro.nonce`

---

## 12. Location Display (`[etn_pro_event_location_list]`)

- List of venues/locations with event counts
- Parameters: `style`, `location_limit`
- AJAX filtering by location
- Each location links to a filtered event archive

---

## 13. Add to Calendar (`[etn_pro_add_calendar]`)

Dropdown button offering:
- Google Calendar link (pre-filled event details)
- Apple Calendar (.ics download)
- Outlook (.ics download)
- Yahoo Calendar link

---

## 14. Related Events (`[etn_pro_related_events]`)

Grid of 3–4 events in same category as current event.
Parameters: `limit`, `column`.

---

## 15. Certificate Download Flow

### Token-gated (no login required)
URL pattern: `?etn_action=download_certificate&attendee_id=X&event_id=Y&etn_info_edit_token=TOKEN`

- Token stored on attendee post at purchase
- Server validates token matches attendee meta
- If valid: renders the certificate template with attendee/event data
- Outputs as a browser-printable page or PDF (via wkhtmltopdf or similar)

### Admin bulk send
`GET /eventin/v2/events/{id}/send_certificate` triggers certificate emails to all attendees.

---

## Frontend UX Observations & Dateline Implications

| Observation | Dateline Opportunity |
|-------------|---------------------|
| 4 parallel output systems (shortcodes + widgets + blocks + templates) create inconsistent UX across sites | Single block-based component library with one canonical way to embed each feature |
| Ticket flow requires WooCommerce — adds cart, checkout, account management overhead | Native lightweight checkout without WooCommerce |
| RSVP and Tickets are parallel flows that can both show on same event — confusing to attendees | Unified "registration" concept (RSVP is just free tickets with no payment step) |
| Frontend dashboard is a React SPA embedded in a shortcode | Less confusing if it's a dedicated route; better integration with auth state |
| Calendar views (month grid vs. list) are separate shortcodes with separate options | Single calendar component with view toggle in the UI |
| No client-side search or filtering on the attendee list | Useful for organizers managing large events |
| No waitlist UI built into the ticket form | Opportunity for native waitlist with position display |
| Certificate download is token-based with no expiry | Security edge case: if token is shared, anyone can download |
| Countdown timer stops at zero with no live event state | "Event is happening now" status + streaming link injection would be useful |
| No social proof element (X people going / attending) on event pages | Conversion lift opportunity |
