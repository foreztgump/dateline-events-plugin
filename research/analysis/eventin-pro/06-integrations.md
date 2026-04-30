---
plugin: eventin-pro
version: 4.0.19
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# Eventin Pro 4.0.19 — Integrations

---

## Integration Inventory

| Integration | Tier | Activation | Data flow |
|-------------|------|-----------|-----------|
| WooCommerce | Required for paid tickets | Auto-detected | Ticket → WC Product → Cart → Order → Attendee |
| Stripe | Optional payment | Settings → Payments | Stripe Checkout → WC Order webhook |
| PayPal | Optional payment | Settings → Payments | PayPal redirect → WC Order webhook |
| WC Deposits | Optional | Auto-detected if WC_Deposits active | Deposit form injected before add-to-cart |
| Google Meet | Optional | Settings → Google Meet | OAuth → meeting link in event meta |
| Zoom | Optional | Settings → Zoom | JWT API → meeting in etn-zoom-meeting CPT |
| Elementor | Optional | Auto-detected if Elementor active | 21 widget groups registered |
| BuddyBoss | Module-gated | Settings → Modules | Groups ↔ Events, activity feed |
| Dokan | Module-gated | Settings → Modules | Vendor dashboard ↔ Events |
| Google Calendar | Frontend only | None (client-side links) | Add-to-calendar URL generation |
| Apple Calendar / Outlook | Frontend only | None | .ics file generation |
| WP Multilingual / Polylang | Passive | None | Translatable strings via WP i18n |

---

## 1. WooCommerce Integration

### Role
WooCommerce is the **required payment infrastructure** for paid tickets. Without WC, only free events and RSVP (no payment) are supported.

### How it works

**Ticket Product Creation:**
- Each Eventin event with paid tickets creates a corresponding WooCommerce product (`etn_ticket_product` meta links them)
- Ticket tiers map to WC product variations (if variable) or simple products
- Inventory tracked in both Eventin meta AND WC stock management

**Purchase Flow:**
1. Attendee clicks "Add to Cart" on event page
2. `woocommerce_add_to_cart_validation` hook validates: inventory, registration deadline, event not expired
3. Cart item contains event_id + ticket_tier_id + attendee details (custom cart item meta)
4. WC Checkout: Stripe or PayPal payment collected
5. On `woocommerce_payment_complete` / `woocommerce_order_status_completed`: attendee CPTs created, confirmation emails sent

**Hook touchpoints:**
- `woocommerce_add_to_cart_validation` (priority 10) — Eventin validates event-specific rules
- `woocommerce_endpoint_order-received_title` — customizes thank-you page title
- `woocommerce_thankyou_order_received_text` (priority 20) — adds ticket download link to thank-you

**Multi-vendor (Dokan):**
- `woocommerce_add_to_cart_validation` also validates cross-vendor cart rules

### WC Deposits

When `WC_Deposits` class is active:
- A deposit form is injected before the add-to-cart button (`etn_before_add_to_cart_button` at priority 9999)
- Deposit metaboxes added to event editor
- Deposit flow: partial payment → remainder due later → full attendee created only after full payment

### Known Issues / Observations
- WooCommerce is a large dependency for what is essentially a simple payment collection
- The tight WC coupling means Eventin cannot work with Stripe or PayPal directly — always goes through WC
- WC cart/checkout adds significant UI overhead for simple ticket purchases
- Dateline opportunity: direct Stripe integration without WC (already in AGENTS.md gotchas)

---

## 2. Stripe Integration

### Configuration
Settings → Payments → Stripe:
- Test Mode toggle
- Test Publishable Key / Test Secret Key
- Live Publishable Key / Live Secret Key
- Webhook Secret (for verifying WH events from Stripe)

### Technical implementation
- `EventinPro\Integrations\Stripe\StripePayment` class
- Registered via `eventin_payment_methods` filter
- Payment still routes through WooCommerce — Stripe handles tokenization via WC Stripe gateway
- Eventin Pro provides the configuration UI and registers the payment method; actual charging is delegated to WC

### Notable bug fixed in 4.0.19
- "Double payment bug fixed" (changelog) — unclear root cause, likely race condition in order completion handlers

---

## 3. PayPal Integration

### Configuration
Settings → Payments → PayPal:
- Mode: Sandbox / Live
- Client ID
- Client Secret

### Technical implementation
- `EventinPro\Integrations\Paypal\PaypalPayment` class
- `EventinPro\Admin\PaypalOrder` handles admin-side order reconciliation
- Like Stripe: routes through WooCommerce
- PayPal redirect flow (not Express Checkout); returns to WC thank-you page

---

## 4. Google Meet Integration

### Purpose
Auto-create and attach a Google Meet to an event for online events.

### Setup Flow
1. Admin goes to Settings → Google Meet
2. Enters Google OAuth Client ID + Client Secret
3. Clicks "Authorize" → Google OAuth consent screen
4. On approval, access tokens stored in WP options
5. Connected status shown: "Connected as your@email.com"

### Event-level Usage
In the event editor, Online Meeting tab:
1. Select "Google Meet" as meeting platform
2. Click "Create Meeting" button
3. REST call to Google Calendar API creates a Meet-enabled calendar event
4. Join URL stored in `etn_google_meet_link` meta
5. Link displayed in `EventVenue` block / widget on frontend

### Data stored
| Meta key | Value |
|----------|-------|
| `etn_google_meet` | Serialized meeting object (id, link, description) |
| `etn_google_meet_link` | Join URL |
| `etn_google_meet_short_description` | Meeting description |

### Registered via
`eventin_online_meeting_platforms` filter — modular hook allows other platforms (Zoom, custom) to add themselves.

### Limitations
- OAuth tokens are user-scoped (the admin who authorized)
- No multi-admin OAuth management
- If the authorizing admin loses access, all future meetings fail
- No auto-refresh logic visible in source (tokens can expire)

---

## 5. Zoom Integration

### Purpose
Create Zoom meetings linked to events.

### Configuration
Settings → Zoom:
- Zoom API Key (from Zoom JWT App)
- Zoom API Secret
- Connection test button

### Event-level Usage
Similar to Google Meet:
1. Select "Zoom" as meeting platform in event editor
2. Fill in meeting topic, start time, timezone
3. Meeting created via Zoom API
4. Meeting data stored in `etn-zoom-meeting` CPT with linked event

### Data stored (on event)
| Meta key | Value |
|----------|-------|
| `etn_zoom_event` | bool — is Zoom event |
| `etn_zoom_id` | Zoom meeting ID |
| `zoom_join_url` | Join URL |
| `zoom_meeting_host` | Host email |
| `zoom_start_time` | UTC start time |
| `zoom_timezone` | IANA timezone |

### Technical implementation
- Separate `etn-zoom-meeting` CPT stores each Zoom meeting record
- Webhook payloads include Zoom meeting data: `core/webhook/payloads/zoom-meeting-payload.php`
- JWT-based auth (deprecated by Zoom in favor of Server-to-Server OAuth — not updated in 4.0.19)

### Limitations
- Zoom deprecated JWT apps in September 2023; Eventin Pro 4.0.19 still uses JWT
- Meetings created via Zoom API but changes to event (date/time) are NOT automatically synced to Zoom — manual re-creation required

---

## 6. Elementor Integration

### What registers
`elementor/widgets/register` hook triggers `Widgets\Manifest::register_widgets()`:
- Adds 'eventin-pro' widget category to Elementor
- Registers all 21 pro widget groups (each group can contain multiple style variants)

### Widget categories registered
```
eventin-pro/
├── add-to-calendar/
├── attendee-list/
├── countdown-timer/
├── event-calendar/ (standard + list)
├── event-calendar-list/
├── event-locations/
├── events-one-line/
├── events-pro/ (styles 1-4)
├── events-slider/ (styles 1-3)
├── event-tab/
├── event-ticket/
├── faq/
├── organizers/ (styles 1-2)
├── recurring-event/
├── related-events/
├── schedule-list/ (styles 1-3)
├── schedule-tab/ (styles 1-3)
├── speakers/ (classic 3 variants, standard, slider 5 variants)
└── manifest.php (registry)
```

### Widget structure (per widget)
Each widget:
- `widget.php` — registers controls (Elementor settings panel)
- `template/` — Twig-like PHP template
- Inherits from `Elementor\Widget_Base`

### Integration assets
`elementor/frontend/before_enqueue_scripts` hook enqueues `eventin-pro-elementor.js`.

---

## 7. BuddyBoss Integration (module-gated)

### Activation
Admin enables via Settings → Modules → BuddyBoss.

### Features

**Group events:**
- Events can be assigned to BuddyBoss groups
- Custom group admin tab: "Events" tab in group navigation
- Members of the group can see group-specific events

**Activity feed:**
- `bp_register_activity_actions` — registers `eventin_event_created` activity type
- When event is created and linked to a group, activity entry posted to group feed

**Access control:**
- `_etn_buddy_group_id` meta on event controls group assignment
- Group organizer type stored in `organizer_group` meta

**Group assignment:**
- REST: `POST /eventin/v2/events/buddyboss/assign_group`
- Action: `etn_assign_event_to_group` fires after assignment

### Technical
- `modules/integrations/buddyboss/` directory
- Hooks: `bp_setup_nav`, `bp_screens`, `bp_template_content`, `bp_register_activity_actions`
- Requires BuddyBoss Platform plugin

---

## 8. Dokan Multi-Vendor Integration (module-gated)

### Activation
Admin enables via Settings → Modules → Dokan.

### Features

**Vendor event creation:**
- Vendors can create and manage events from their Dokan dashboard
- "Events" item added to Dokan dashboard nav via `dokan_get_dashboard_nav`
- "Add New Event" redirects to event creation (custom template)

**Event listing on vendor profile:**
- `dokan_store_profile_frame_after` — shows vendor's events on their store page

**Attendee visibility:**
- Vendors can see attendees for their own events from the Dokan product row actions

**Cart validation:**
- `woocommerce_add_to_cart_validation` + `wp_ajax_nopriv_add_to_cart_validation` — validates multi-vendor cart scenarios (prevents mixing vendors if needed)

### Technical
- `modules/multivendor/` directory
- Hooks: `dokan_load_custom_template`, `dokan_store_profile_frame_after`, `dokan_get_dashboard_nav`, `dokan_add_new_product_redirect`, `dokan_product_row_actions`

---

## 9. Calendar Export Integrations (Frontend, no OAuth)

### Google Calendar
Generated URL format:
```
https://calendar.google.com/calendar/r/eventedit?
  text={event_name}
  &dates={start}/{end} (YYYYMMDDTHHmmssZ format)
  &details={description}
  &location={venue}
  &sf=true
```

### Apple Calendar / Outlook (.ics)
Generated ICS file:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:{start}
DTEND:{end}
SUMMARY:{title}
DESCRIPTION:{description}
LOCATION:{venue}
END:VEVENT
END:VCALENDAR
```

Served as `Content-Type: text/calendar` response from `?etn_action=download_calendar`.

### Yahoo Calendar
Similar query string URL to Yahoo's calendar add form.

---

## 10. Webhook System

### Overview
Eventin Pro ships a full outbound webhook system for real-time event notifications to third-party services (Zapier, custom workflows, etc.).

### Configuration (admin)
CPT-based: each webhook is an `etn-webhook` post with meta:
- `name` — label
- `topic` — trigger event (see Topics below)
- `delivery_url` — HTTPS endpoint
- `status` — active / inactive
- `secrete` — signing secret (yes, typo in key name)

### Topics

| Topic | Fires when |
|-------|-----------|
| `event.created` | Event published |
| `event.updated` | Event post updated |
| `event.deleted` | Event trashed |
| `event.restored` | Event untrashed |
| `attendee.created` | Attendee created |
| `attendee.updated` | Attendee updated |
| `order.created` | WC order created |
| `order.updated` | WC order updated |
| `schedule.created` | Schedule entry created |
| `schedule.updated` | Schedule updated |
| `speaker.created` | Speaker published |
| `speaker.updated` | Speaker updated |
| `zoom-meeting.created` | Zoom meeting created |
| `zoom-meeting.updated` | Zoom meeting updated |

### Payload Schemas

**Event payload** (`core/webhook/payloads/event-payload.php`):
```json
{
  "id": 123,
  "title": "Event Name",
  "start_date": "2026-01-15",
  "end_date": "2026-01-15",
  "start_time": "18:00",
  "end_time": "21:00",
  "timezone": "America/New_York",
  "location": "...",
  "tickets": [...],
  "permalink": "https://..."
}
```

**Attendee payload** (`core/webhook/payloads/attendee-payload.php`):
```json
{
  "id": 456,
  "event_id": 123,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "ticket_id": "TKT-001",
  "ticket_name": "General Admission",
  "ticket_price": 25.00,
  "status": "success",
  "check_in_status": "unused"
}
```

### Delivery mechanism
- Webhooks queued during request via `etn_webhook_process_delivery` action
- Flushed synchronously via `shutdown` hook: `Webhook\Hooks::webhook_execute_queue()`
- **No retry logic** — if delivery fails, webhook is lost
- **No queue persistence** — if PHP dies before shutdown hook runs, delivery never happens
- Webhook list cached in transient (12-hour TTL): `_transient_etn_webhook`

### Security
- Request signed with HMAC-SHA256 using `secrete` meta value
- Signature in `X-Eventin-Signature` header
- No signature verification documentation visible in admin UI

### REST API for webhook management
```
GET    /eventin/v2/webhooks           — list (paginated)
POST   /eventin/v2/webhooks           — create
DELETE /eventin/v2/webhooks           — bulk delete
GET    /eventin/v2/webhooks/{id}      — single
PUT    /eventin/v2/webhooks/{id}      — update
DELETE /eventin/v2/webhooks/{id}      — delete
```
All require `manage_options` capability.

### Dateline implications
- Synchronous shutdown delivery is unreliable: long events, WP cron collisions, early exits all cause dropped webhooks
- No retry queue means SaaS integrations (Zapier) need to poll instead of relying on webhooks
- Dateline using Cloudflare Workers can use `ctx.waitUntil()` for fire-and-forget async delivery with retries

---

## 11. REST API Summary

All pro REST routes extend the base Eventin namespace `eventin/v2`.

### Authentication
- Admin endpoints: `manage_options` WP capability
- User endpoints: authenticated (`read` capability)
- Nonce-based for frontend React dashboard (`wp_localize_script`)

### Pro-added endpoints

| Resource | Endpoints |
|----------|-----------|
| Events | `GET /events/{id}/send_certificate`, `GET /events/certificate_templates`, `POST /events/buddyboss/assign_group` |
| Permissions | Full CRUD on `/permissions/{role}`, `GET /permissions/current-user` |
| Webhooks | Full CRUD on `/webhooks` and `/webhooks/{id}` |
| License | `POST /licenses/activate`, `POST /licenses/deactivate`, `GET /licenses` |
| RSVP | `GET/POST /rsvp/{id}`, `GET /rsvp/{id}/invitations`, `GET /rsvp/{id}/clone`, `PUT /rsvp/{id}/status` |
| AI | (delegated to eventin-ai plugin; no pro REST routes for AI directly) |

---

## Integration Quality Assessment

| Integration | Quality | Notes |
|-------------|---------|-------|
| WooCommerce | ⚠️ Medium | Works but couples simple ticket purchases to full e-commerce stack |
| Stripe | ⚠️ Medium | Config UI only; delegates to WC Stripe gateway |
| PayPal | ⚠️ Medium | Similar to Stripe; PayPal redirect flow (not modern PayPal SDK) |
| Google Meet | ⚠️ Medium | OAuth works; no token refresh logic; single-admin auth |
| Zoom | ❌ Low | Uses deprecated JWT auth (EOL Sept 2023) |
| Elementor | ✅ Good | Well-organized 21 widget groups with proper WP registration |
| BuddyBoss | ✅ Good | Deep social integration; module-gated correctly |
| Dokan | ✅ Good | Clean multi-vendor surface; minimal footprint |
| Calendar export | ✅ Good | Standard .ics / Google URL approach; no external deps |
| Webhooks | ❌ Low | Synchronous shutdown delivery; no retries; typo in signing key field |
| REST API | ✅ Good | Clean WP REST conventions; proper capability checks |
