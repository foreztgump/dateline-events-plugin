# Eventin Pro 4.0.19 — Feature Inventory (i18n String Mining)

Source: `languages/eventin-pro.pot` (1,368 msgid strings) + static analysis of feature entry points.

---

## Feature Modules

### 1. AI Content Generation ⭐ (NEW in 4.0.19)

**Marketing claim:** "Create event with AI"

**What it does:**
- Generate event **title**, **description**, **image**, and **FAQ** from a keyword/prompt
- Factory pattern: `AiGeneratorFactory::create('event', 'title|description|image|faq')`
- Actual LLM calls delegated to the separate `eventin-ai` plugin (`EventinAi\Core\Ai`)
- Exposed via the event edit screen in admin dashboard

**Key i18n strings:**
- "Generate with AI"
- "AI Generated"
- "Generate Event Title"
- "Generate Event Description"
- "Generate FAQ"

**Gap analysis:** The AI plugin is a separate install — adds friction and an additional plugin dependency. No AI for attendee management, scheduling, or recommendations. No natural language event search. Image generation suggests DALL·E or similar API integration.

---

### 2. Ticket System

- Multiple ticket tiers per event (`etn_ticket_variations` — serialized array)
- Ticket inventory management (`etn_total_avaiilable_tickets` / `etn_total_sold_tickets`)
- QR code on ticket print
- Unique ticket ID (`etn_unique_ticket_id`) for scanner verification
- WooCommerce as the payment processor (required for paid tickets)
- Deposit payments via WC_Deposits integration
- Ticket template builder (new in 4.0.15)

**Key i18n strings:**
- "Add Variation", "Ticket Name", "Ticket Price", "Available Tickets"
- "Ticket ID", "Ticket Type", "Download Ticket", "Print Ticket"
- "Ticket is Valid. Successfully Checked in."

---

### 3. Attendee Scanner / QR Check-in

- Admin-side ticket scanner at `?post_type=etn-attendee&etn_action=ticket_scanner`
- URL-based QR code containing `ticket_id` + `attendee_id`
- Three-state validation: valid→check-in, already-used, invalid
- Nonce-gated AJAX verification
- Role-gated: requires `etn_manage_attendee`, `seller`, or `author` capability
- Supports two modes: info-display (show attendee info before check-in) and direct check-in

**Key i18n strings:**
- "Scan the QR code", "The Ticket is Valid. Successfully Checked in."
- "Ticket is already used.", "Invalid ticket ID.", "Event is already expired."
- "Want to let him in?", "Attendee Ticket Scanner"

---

### 4. Certificate System

Two delivery paths:
1. **Legacy:** WordPress page with `template-pdf-certificate.php` page template
2. **New (4.0.15+):** `etn-template` CPT with block-based certificate builder

- Admin can select certificate template per event (`certificate_template` meta)
- Bulk send certificates to all attendees via REST: `GET /events/{id}/send_certificate`
- Frontend download: `?etn_action=download_certificate&attendee_id=&event_id=&etn_info_edit_token=`
- Token-gated download (no login required if you have the token)
- PDF rendering via server-side template output

**Key i18n strings:**
- "Certificate Builder", "Certificate Template Shortcode", "Download Certificate"
- "Edit Template Design", "Certificate Editor Settings", "Choose a template"
- "Attendee Certificate for"

---

### 5. RSVP Module (optional — admin-activated)

- Separate from ticket purchase flow
- Form types: simple / advanced
- Invitation system with email notifications
- Going / Not Going tracking with reason capture
- RSVP limit per event (`etn_rsvp_limit_amount`)
- Minimum attendee threshold (`etn_rsvp_miminum_attendee_to_start`)
- REST endpoints: `GET/POST /eventin/v2/rsvp/{id}`, `/invitations`, `/clone`, `/status`

**Key i18n strings:**
- "RSVP", "Going", "Not Going", "Add not going reason here"
- "Chose an event to show RSVP form", "RSVP Settings"
- "Minimum Attendees to Start Event"

---

### 6. Recurring Events

- Toggle per event (`recurring_enabled` meta)
- Recurrence rule stored in `etn_event_recurrence` / `event_recurrence`
- Child/parent event relationship (child events can be shown/hidden in listings)
- Shortcode: `[etn_event_recurring single_event_ids="16"]`
- Block type: `RecurringEvent`
- Widget: `recurring-event/`

**Key i18n strings:**
- "Recurring Event", "Display 'recurring events' in any specific location"
- "Daily", "Weekly", "Monthly", "Do want to hide Recurring event thumbnail?"

---

### 7. Event Locations

- Location type: `online` / `physical` / `hybrid` (`etn_event_location_type`)
- Multiple location support (`etn_event_location_list`)
- Dedicated Elementor widget: `event-locations/`
- Ajax-powered location list: `Widgets\Event_Locations\Actions\Ajax_Action`
- Shortcode: `[etn_pro_event_location_list style='style-1' location_limit=5]`
- Block type: `EventVenue`

**Key i18n strings:**
- "Add New Location", "Back to Location", "Available Event Nearby:", "Create Location"

---

### 8. Google Meet Integration

- OAuth flow via `EventinPro\Integrations\Google\Auth`
- Meeting created/linked to event (`etn_google_meet`, `etn_google_meet_link`)
- Admin settings: connect/disconnect, authorize URL
- Registered as online meeting platform: `eventin_online_meeting_platforms` filter
- Block type: `EventVenue` (renders meeting link)

**Key i18n strings:**
- "Click Here to Configure Google Meet", "Google Meet Connected"
- "Click Here to Configure Google Meet and Zoom"

---

### 9. Payment Processing

**Stripe:**
- `EventinPro\Integrations\Stripe\StripePayment`
- Registered via `eventin_payment_methods` filter
- Double payment bug fixed in 4.0.19

**PayPal:**
- `EventinPro\Integrations\Paypal\PaypalPayment`  
- Registered via `eventin_payment_methods` filter
- Admin order handling: `Admin\PaypalOrder`

**WooCommerce Deposits:**
- Requires `WC_Deposits` class
- Deposit form injected before add-to-cart button
- Deposit metaboxes added to event editor

---

### 10. Webhook System

- Custom CPT `etn-webhook` stores webhook configs
- Admin UI to create, update, delete webhooks
- Topics: `event.created`, `event.updated`, `event.deleted`, etc.
- Delivery queued during request, flushed synchronously at `shutdown`
- Payload types: event, attendee, order, schedule, speaker, zoom-meeting
- 12-hour transient cache on webhook list

---

### 11. Role-Based Access Control

- `EventinPro\AccessControl\PermissionManager` + `Permission` class (from base plugin)
- Per-role permission assignment via admin UI
- REST API: full CRUD on role permissions
- Built-in Eventin capabilities: `etn_manage_attendee`, `etn_manage_license`, `manage_etn_attendee`
- Current user permissions returned via `/eventin/v2/permissions/current-user`

---

### 12. Template Builder (new in 4.0.15–4.0.19)

- `etn-template` CPT for certificate and ticket templates
- Gutenberg block-based editor
- Block types for template builder: EventTitle, EventDateTime, EventVenue, EventOrganizer, etc.
- Preview mode via `?action=etn-preview-template&template_id=`
- Templates can use block-rendered content: `$template->get_rendable_content($attendee_id)`

**Key i18n strings:**
- "Template Builder", "Edit Template", "Edit Template Design", "Choose Template"
- "Certificate Builder", "Couldn't update template", "Added event premade template"

---

### 13. Frontend Dashboard / Event Submission

- Shortcode `[etn_pro_dashboard]` — React-based frontend event management
- Requires author/seller/`etn_manage_attendee` role
- Built script: `build/js/script.js` + `build/js/i18n-loader.js`
- WP i18n integration via `wp-i18n` + `wp_set_script_translations`
- Multivendor event creation via Dokan integration

---

### 14. BuddyBoss Integration (module-gated)

- Group event management — create and assign events to BuddyBoss groups
- Custom group tab navigation
- Activity feed entries for event creation
- Group member access control for events
- Admin settings tab: `admin-tab.php`

---

### 15. Multi-Vendor / Dokan Integration (module-gated)

- Vendor event creation + management from Dokan dashboard
- Store event listing on vendor profile
- Attendee list visible to vendor
- Cart validation for multi-vendor cart scenarios

---

### 16. Elementor Widget Library

21 widget groups, all with multiple style variants:

| Widget | Styles |
|--------|--------|
| Events Pro listing | 4 (event-1 through event-4) |
| Events Slider | 3 |
| Events Tab | 1 |
| Events One Line | 1 |
| Schedule List | 3 |
| Schedule Tab | 3 |
| Organizers | 2 |
| Event Calendar | Standard + List |
| Speakers | Classic (3), Standard (1), Slider (5) |
| Countdown Timer | 1 |
| Add to Calendar | 1 |
| Attendee List | 1 |
| Event Ticket form | 1 |
| FAQ | 1 |
| Related Events | 1 |
| Recurring Event | 1 |
| Event Locations | 1 |

---

### 17. Shortcodes (25+)

| Shortcode | Purpose |
|-----------|---------|
| `[etn_pro_organizers]` | Organizer listing |
| `[etn_pro_speakers_classic]` | Speaker listing — classic style |
| `[etn_pro_speakers_standard]` | Speaker listing — standard style |
| `[etn_pro_speakers_sliders]` | Speaker listing — slider style |
| `[etn_pro_events_classic]` | Event listing — classic |
| `[etn_pro_events_standard]` | Event listing — standard |
| `[etn_pro_events_sliders]` | Event listing — slider |
| `[etn_pro_events_tab]` | Event listing — tab UI |
| `[etn_pro_events_one_line]` | Event listing — one-line compact |
| `[etn_pro_countdown]` | Event countdown timer |
| `[etn_pro_schedules_tab]` | Schedule tab display |
| `[etn_pro_schedules_list]` | Schedule list display |
| `[etn_pro_ticket_form]` | Ticket purchase form |
| `[etn_pro_related_events]` | Related events list |
| `[etn_pro_add_calendar]` | Add to calendar button |
| `[etn_pro_attendee_list]` | Attendee list |
| `[etn_event_recurring]` | Recurring event display |
| `[etn_pro_calendar_standard]` | FullCalendar-style calendar |
| `[etn_pro_calendar_list]` | Calendar list view |
| `[etn_pro_event_location_list]` | Location listing |
| `[etn_pro_event_title]` | Certificate: event title |
| `[etn_pro_event_date]` | Certificate: event date |
| `[etn_pro_attendee_name]` | Certificate: attendee name |
| `[etn_pro_ticket_id]` | Certificate: ticket ID |
| `[etn_pro_dashboard]` | Frontend event management dashboard |

---

### 18. Gutenberg Blocks (14 pro blocks)

| Block | Purpose |
|-------|---------|
| BuyTicket | Ticket purchase CTA |
| EventAddToCalendar | Add-to-calendar button |
| EventBanner | Event banner image/header |
| EventCategory | Event category display |
| EventCountDownTimer | Countdown timer |
| EventDateTime | Date and time display |
| EventDescription | Event description |
| EventFaq | FAQ accordion |
| EventLogo | Logo display |
| EventOrganizer | Organizer info |
| EventRSVP | RSVP form embed |
| EventSchedule | Schedule display |
| EventSocial | Social links |
| EventSpeaker | Speaker display |
| EventTag | Tags display |
| EventTitle | Title display |
| EventVenue | Venue / location / Google Meet |
| RecurringEvent | Recurring event pattern |
| RelatedEvents | Related events list |

---

## Feature Gaps vs Dateline Opportunity

| Eventin Pro limitation | Dateline opportunity |
|------------------------|----------------------|
| AI via separate `eventin-ai` plugin | Native AI built into core |
| No AI for attendee/schedule/discovery | AI across full event lifecycle |
| Webhook delivery synchronous at shutdown — unreliable | Reliable async delivery (Workers) |
| Dual-namespace codebase, postmeta typos, schema drift | Clean TypeScript schema from day 1 |
| WooCommerce required for paid tickets | Native payment (Stripe direct) without WC overhead |
| No natural language event search | Semantic search via embeddings |
| RSVP and tickets are separate parallel flows | Unified registration model |
| Certificate system split across two approaches | Single template builder |
| Frontend dashboard requires Dokan for multi-vendor | Native multi-organizer support |
| 14 blocks + 25 shortcodes + 21 Elementor widgets = maintenance surface | Single modern block/component surface |
