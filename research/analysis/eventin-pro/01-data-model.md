# Eventin Pro 4.0.19 — Data Model

All storage is via WordPress `postmeta` on standard CPTs. No custom tables found in the pro plugin (the base Eventin plugin handles any schema extensions). Options stored via `get_option` / `update_option`.

---

## Custom Post Types

Eventin Pro operates on CPTs registered by the **base Eventin plugin**. Pro adds hooks and metaboxes on top of them.

| CPT slug | Purpose |
|----------|---------|
| `etn` | Events |
| `etn-attendee` | Attendees (one per ticket purchase) |
| `etn-speaker` | Speakers / panelists |
| `etn-webhook` | Outbound webhook configurations |
| `etn-zoom-meeting` | Zoom meeting records |
| `etn-template` | Certificate / ticket templates (added ~4.0.15) |
| `page` | Certificate pages (legacy path — page template `template-pdf-certificate.php`) |

---

## Taxonomies

| Taxonomy slug | Attached to | Purpose |
|---------------|-------------|---------|
| `etn_category` | `etn` | Event categories |
| `etn_tag` | `etn` (inferred) | Event tags |

---

## Postmeta Keys — Events (`etn`)

### Core event fields (set by base Eventin, read by Pro)

| Key | Type | Notes |
|-----|------|-------|
| `etn_start_date` | string (Y-m-d) | Event start date |
| `etn_end_date` | string (Y-m-d) | Event end date |
| `etn_start_time` | string (H:i) | Start time |
| `etn_end_time` | string (H:i) | End time |
| `etn_ticket_variations` | serialized array | Ticket tier definitions |
| `etn_total_avaiilable_tickets` | int | Total ticket inventory (note typo in key) |
| `etn_total_sold_tickets` | int | Running sold count |
| `etn_ticket_availability` | string | Availability status |

### Pro-added event fields

| Key | Type | Notes |
|-----|------|-------|
| `etn_event_faq` | serialized array | FAQ items `[{question, answer}]` |
| `etn_event_schedule` | serialized array | Schedule entries |
| `etn_event_speaker` | serialized array | Speaker associations |
| `etn_event_organizer` | serialized array | Organizer data |
| `etn_event_socials` | serialized array | Social link array |
| `etn_event_location` | string/serialized | Location text or structured data |
| `etn_event_location_list` | serialized array | Multiple location entries |
| `etn_event_location_type` | string | `online` / `physical` / `hybrid` |
| `etn_event_logo` | int | Logo attachment ID |
| `etn_event_logo_url` | string | Logo URL |
| `etn_event_recurrence` | serialized | Recurrence rule data |
| `event_recurrence` | serialized | Alternate recurrence key |
| `recurring_enabled` | bool (0/1) | Whether recurrence is active |
| `event_timezone` | string | IANA timezone identifier |
| `etn_registration_deadline` | string (Y-m-d) | Registration cutoff date |
| `etn_banner` | int | Banner attachment ID |
| `event_banner` | int | Alt banner key |
| `event_banner_id` | int | Alt banner key 2 |
| `event_logo` | int | Alt logo key |
| `event_logo_id` | int | Alt logo key 2 |
| `event_layout` | string | Single page layout selector |
| `event_type` | string | Event type flag |
| `attendee_extra_fields` | serialized array | Custom attendee form fields config |
| `certificate_template` | int | Page/template ID for certificates |
| `certificate_preference` | string | Certificate delivery preference |
| `ticket_template` | int | Ticket template ID |
| `seat_plan` | serialized | Seat plan data (4.0.x) |
| `external_link` | string | External registration URL |
| `is_clone` | bool | Marks cloned event |

### Google Meet / Online meeting

| Key | Type | Notes |
|-----|------|-------|
| `etn_google_meet` | serialized | Google Meet meeting object |
| `etn_google_meet_link` | string | Meet join URL |
| `etn_google_meet_short_description` | string | Meeting description |
| `google_meet` | string | Alt key |
| `google_meet_description` | string | Alt description key |
| `google_meet_link` | string | Alt link key |
| `meeting_link` | string | Generic meeting link |

### Zoom

| Key | Type | Notes |
|-----|------|-------|
| `etn_zoom_event` | bool | Is Zoom event |
| `etn_zoom_id` | string | Zoom meeting ID |
| `zoom_event` | bool | Alt key |
| `zoom_id` | string | Alt Zoom ID key |
| `zoom_join_url` | string | Join URL |
| `zoom_meeting_host` | string | Host email/ID |
| `zoom_meeting_id` | string | Meeting ID (alt) |
| `zoom_start_time` | string | Zoom start time |
| `zoom_timezone` | string | Zoom timezone |
| `zoom_topic` | string | Meeting topic |

### RSVP (module-gated)

| Key | Type | Notes |
|-----|------|-------|
| `etn_rsvp_value` | string | RSVP status for current user |
| `etn_rsvp_form_type` | string | Form type (simple/advanced) |
| `etn_rsvp_limit_amount` | int | Max RSVP count |
| `etn_rsvp_miminum_attendee_to_start` | int | Min attendees threshold (note typo) |
| `rsvp_settings` | serialized | Full RSVP config |

### Calendar display

| Key | Type | Notes |
|-----|------|-------|
| `etn_event_calendar_bg` | string (hex) | Calendar background color |
| `etn_event_calendar_text_color` | string (hex) | Calendar text color |
| `calendar_bg` | string | Alt key |
| `calendar_text_color` | string | Alt key |

### Banner display

| Key | Type | Notes |
|-----|------|-------|
| `banner_bg_color` | string (hex) | Banner background color |
| `banner_bg_image` | int | Banner bg image ID |
| `banner_bg_image_url` | string | Banner bg URL |
| `banner_bg_type` | string | `color` / `image` |
| `alignment` | string | Banner content alignment |

### Integrations — BuddyBoss

| Key | Type | Notes |
|-----|------|-------|
| `etn_bp_group_{group_id}` | int | Group ID assigned to event (dynamic key) |
| `_etn_buddy_group_id` | int | Primary buddy group ID |
| `organizer_group` | string | Group organizer type |
| `organizer_type` | string | Organizer type |

---

## Postmeta Keys — Attendees (`etn-attendee`)

| Key | Type | Notes |
|-----|------|-------|
| `etn_event_id` | int | Parent event post ID |
| `etn_name` | string | Attendee full name |
| `etn_email` | string | Attendee email |
| `etn_phone` | string | Attendee phone |
| `etn_status` | string | Payment status: `success` / `failed` |
| `etn_attendeee_ticket_status` | string | Usage status: `used` / `unused` (note typo) |
| `etn_unique_ticket_id` | string | Unique ticket identifier (QR/scanner target) |
| `ticket_name` | string | Ticket tier name |
| `ticket_price` | float | Price paid |
| `_ticket_price` | float | Display price (read-only) |
| `_etn_variation_total_price` | float | Variation total price |
| `_etn_variation_total_quantity` | int | Variation total quantity |
| `etn_info_edit_token` | string | Token for certificate download auth |
| `etn_notification_activity_id` | int | BuddyBoss activity ID |
| `rsvp_not_going_reason` | string | Reason text when declining RSVP |
| `number_of_attendee` | int | Seats reserved (multi-seat purchase) |
| `etn_attendee_extra_field_{slug}` | mixed | Dynamic custom field values (generated from label) |

---

## Postmeta Keys — Schedules (`etn-schedule`, inside event meta)

Schedules are stored as serialized arrays within the `etn_event_schedule` key on the event. Individual schedule item keys (used in templates/blocks):

| Key | Type | Notes |
|-----|------|-------|
| `etn_schedule_date` | string | Schedule session date |
| `etn_schedule_day` | string | Day label |
| `etn_schedule_title` | string | Session title |
| `etn_schedule_topics` | serialized | Topic entries within session |
| `etn_select_speaker_schedule_type` | string | Speaker display type |

---

## Postmeta Keys — Webhooks (`etn-webhook`)

| Key | Type | Notes |
|-----|------|-------|
| `name` | string | Webhook name |
| `topic` | string | Trigger topic (e.g., `event.created`) |
| `delivery_url` | string | Target URL |
| `status` | string | `active` / `inactive` |
| `secrete` | string | Signing secret (note typo) |

---

## Options Table Keys

| Option key | Notes |
|------------|-------|
| `_etn_license_user` | License data array (name, email, key) — set on boot |
| `etn_event_options` | Plugin-wide settings array |
| `etn_webhook` transient | Cached webhook post IDs (12 hr TTL) |

---

## Key Observations for Dateline

1. **Dual key problem** — Many fields exist under 2–3 alternate keys (`etn_event_logo` / `event_logo` / `event_logo_id`). Indicates historical schema drift, not deliberate design.
2. **Two persistent typos** — `etn_total_avaiilable_tickets` (double-i) and `etn_attendeee_ticket_status` (triple-e). Any Dateline data-model comparison must account for these.
3. **No custom tables** — All data is `postmeta`. Heavy queries on attendees will hit the meta table hard at scale — opportunity for Dateline to offer better data architecture.
4. **Certificate system** — Dual path: legacy page-template approach and new `etn-template` CPT (4.0.15+). Templates render via a PDF-capable page.
5. **Dynamic attendee fields** — Custom field keys generated from label text via `generate_name_from_label()`. This makes schema introspection difficult and migration error-prone.
6. **RSVP vs tickets** — Two parallel registration paths. RSVP is a module; tickets are core. Eventin doesn't unify them.
