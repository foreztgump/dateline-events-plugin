---
plugin: eventin-pro
version: 4.0.19
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough attempted on Site A (dateline-site-a.ddev.site, WP 6.9.4).
  Base plugin (eventin free 4.0.x) has a boot-timing incompatibility on WP 6.9.4:
  CPT registration hooked to after_setup_theme (priority 11) but registers AFTER
  plugins_loaded priority 999, so after_setup_theme has already fired.
  Admin screens documented from static analysis of source code (eventin-pro 4.0.19
  + wp-event-solution 4.0.x) supplemented by i18n strings, REST endpoint mapping,
  and React build artifact analysis.
---

# Eventin Pro 4.0.19 — Admin UX

---

## Navigation & Menu Structure

Eventin Pro adds the following top-level and sub-level menu entries to the WordPress admin:

```
Eventin (top-level, Dashicons calendar icon)
├── Events                    → /wp-admin/edit.php?post_type=etn
├── Add New Event             → /wp-admin/post-new.php?post_type=etn
├── Speakers                  → /wp-admin/edit.php?post_type=etn-speaker
├── Add New Speaker           → /wp-admin/post-new.php?post_type=etn-speaker
├── Attendees                 → /wp-admin/edit.php?post_type=etn-attendee
├── Ticket Scanner            → /wp-admin/edit.php?post_type=etn-attendee&etn_action=ticket_scanner
├── Template Builder          → /wp-admin/edit.php?post_type=etn-template
├── Webhooks                  → /wp-admin/edit.php?post_type=etn-webhook
├── Permissions               → /wp-admin/admin.php?page=eventin_permission
├── Shortcodes                → /wp-admin/admin.php?page=eventin_shortcode
└── License                   → /wp-admin/admin.php?page=eventin_license
```

Settings accessed via: `Settings → Eventin` or via the Eventin menu → Settings gear.

---

## 1. Events List Table (`/wp-admin/edit.php?post_type=etn`)

**What it shows:**
- Standard WordPress list table with event posts
- Columns: Title, Category, Start Date, End Date, Ticket Status, Actions
- Bulk actions: Move to Trash
- Filter by category, date

**Quick actions per row:**
- Edit — opens event editor
- Quick Edit — inline title/status edit
- Trash — soft delete
- View — frontend single event page
- Attendee List — jumps to attendees filtered by event
- Clone — duplicates event with `is_clone = 1` meta

**Top-of-list filters:**
- All / Published / Draft / Trash tabs
- Category dropdown filter
- Date filter (month/year)
- Text search (searches title + ticket ID via custom SQL join)

**Admin notices:**
- "Events require WooCommerce for paid tickets" (if WC not active and `sell_tickets = on`)

---

## 2. New / Edit Event Screen (`/wp-admin/post-new.php?post_type=etn`)

The event editor is the richest admin screen. It uses the **classic WordPress metabox layout** (not Gutenberg FSE), giving full control over a dense metabox arrangement.

### Title & Content Area
- **Title field** — event title (standard WordPress title)
- **Content / Description** — classic TinyMCE editor
- **Excerpt** — short description field

### Metaboxes — Left Column

#### Event Details (top metabox)
A tabbed React-powered settings panel with tabs:

| Tab | Contents |
|-----|----------|
| **General** | Start date/time, End date/time, Timezone (IANA), Registration deadline, Event type (physical/online/hybrid), Location selection |
| **Tickets** | Enable tickets toggle, ticket tier builder (add/remove variations), per-tier name/price/capacity/description, WooCommerce product link, ticket template selector |
| **RSVP** | Enable RSVP toggle, RSVP form type (simple/advanced), going/not-going options, RSVP limit, minimum attendee threshold |
| **Schedule** | Day-based session builder; per-day, per-session: time, title, topic list, speaker assignments |
| **Speakers** | Select speakers from etn-speaker CPT; ordering |
| **Organizer** | Organizer name, email, phone, website, logo |
| **FAQ** | Add/remove Q&A pairs |
| **Social** | Social link URLs (Facebook, Twitter, LinkedIn, etc.) |
| **Certificate** | Certificate template selector, delivery preference (auto-send / manual / disabled) |
| **AI Generator** | "Generate with AI" panel (visible only if eventin-ai plugin is active) — keyword/prompt input, generate buttons for Title / Description / Image / FAQ |
| **Recurring** | Enable recurrence toggle, recurrence rule builder (daily / weekly / monthly / yearly), child event display option |
| **Extra Fields** | Custom attendee form fields: add fields (text, select, checkbox, radio), required/optional toggle, label, placeholder |
| **Event Banner** | Banner image upload + background color/type selector, content alignment |
| **Online Meeting** | Select platform (Google Meet / Zoom / custom), configure meeting link |
| **Seat Plan** | Enable seat plan toggle, seat plan builder (if seat plan module active) |

#### Publish Metabox (sidebar)
- Status, Visibility, Publish date (standard WP)
- Template selector: default / event-two / event-three (for single event page layout)

#### Categories Metabox (sidebar)
- `etn_category` taxonomy assignment

#### Tags Metabox (sidebar)
- `etn_tag` taxonomy assignment

#### Featured Image (sidebar)
- Event thumbnail / cover image

### Field Inventory by Meta Key (cross-referenced from `01-data-model.md`)

| Admin label | Meta key | Type |
|-------------|----------|------|
| Start Date | `etn_start_date` | date string |
| End Date | `etn_end_date` | date string |
| Start Time | `etn_start_time` | time string |
| End Time | `etn_end_time` | time string |
| Timezone | `event_timezone` | IANA string |
| Registration Deadline | `etn_registration_deadline` | date string |
| Ticket Variations | `etn_ticket_variations` | serialized array |
| Total Available Tickets | `etn_total_avaiilable_tickets` | int (note: typo in key) |
| Total Sold Tickets | `etn_total_sold_tickets` | int |
| Event FAQ | `etn_event_faq` | serialized array |
| Event Schedule | `etn_event_schedule` | serialized array |
| Event Speaker | `etn_event_speaker` | serialized array |
| Event Organizer | `etn_event_organizer` | serialized array |
| Social Links | `etn_event_socials` | serialized array |
| Location Type | `etn_event_location_type` | string |
| Locations | `etn_event_location_list` | serialized array |
| Google Meet Link | `etn_google_meet_link` | string |
| Event Logo | `etn_event_logo` | attachment ID |
| Banner | `etn_banner` | attachment ID |
| Recurring Enabled | `recurring_enabled` | bool |
| Recurrence Rule | `etn_event_recurrence` | serialized |
| Certificate Template | `certificate_template` | int |
| Ticket Template | `ticket_template` | int |
| Extra Attendee Fields | `attendee_extra_fields` | serialized |
| Calendar BG Color | `etn_event_calendar_bg` | hex string |
| External Link | `external_link` | URL string |

---

## 3. Attendees List Table (`/wp-admin/edit.php?post_type=etn-attendee`)

**Columns:**
- Attendee Name (with edit link)
- Email
- Phone
- Ticket Name
- Ticket Price
- Ticket ID
- Event Name
- Check-in Status (used / unused)
- Payment Status (success / failed)
- Date

**Bulk actions:**
- Mark as Published (change payment status to success)
- Download CSV — exports filtered attendees list

**Filters:**
- Filter by event (dropdown)
- Filter by ticket status (used / unused)
- Search by text (searches name + email + ticket ID via SQL join)

**Per-row actions:**
- Edit attendee (opens standard metabox editor with attendee fields)
- View ticket (frontend download)
- Trash

**Admin notices:**
- After bulk publish: "X attendees marked as published"
- After CSV download: "CSV exported"

---

## 4. Speaker New/Edit Screen (`/wp-admin/post-new.php?post_type=etn-speaker`)

**Fields:**
- Title = speaker name
- Content = speaker bio (TinyMCE)
- Featured image = speaker photo

**Speaker Metaboxes:**
- Designation / role
- Company / organization
- Social links (same fields as event social links)
- Speaker group taxonomy assignment

---

## 5. Template Builder (`/wp-admin/edit.php?post_type=etn-template`)

**Two template types** (selected on creation):
- Certificate template
- Ticket template

**Editor:**
- Full Gutenberg block editor
- Custom block toolbar with Eventin template blocks:
  - EventTitle
  - EventDateTime
  - EventVenue
  - EventOrganizer
  - AttendeeeName
  - TicketId
  - EventLogo
  - EventBanner
  - QRCode (ticket type only)

**Preview:**
- `?action=etn-preview-template&template_id=X` URL opens a preview window
- Renders the template with sample data

**Usage:**
- Templates appear in the event edit screen's Certificate and Ticket selectors
- Can be sent to all attendees via bulk certificate REST endpoint

---

## 6. Ticket Scanner (`/wp-admin/edit.php?post_type=etn-attendee&etn_action=ticket_scanner`)

**Interface:**
- Dedicated full-page scanner UI (replaces normal list table)
- Camera access for QR scanning OR manual ticket ID entry field
- Two scan modes (configurable):
  - **Check-in mode**: scan → validate → immediate check-in
  - **Info display mode**: scan → show attendee info → confirm check-in button

**Validation states:**
- ✅ Valid — "Ticket is Valid. Successfully Checked in."
- ⚠️ Already used — "Ticket is already used."
- ❌ Invalid — "Invalid ticket ID."
- ⛔ Expired — "Event is already expired."

**Role gate:**
- Requires `etn_manage_attendee`, `seller`, or `author` capability

**Implementation:**
- AJAX-based nonce-gated requests
- QR codes contain `ticket_id` + `attendee_id` URL parameters

---

## 7. Webhooks List (`/wp-admin/edit.php?post_type=etn-webhook`)

**List columns:**
- Webhook name
- Delivery URL (truncated)
- Topic (event.created / event.updated / etc.)
- Status (active / inactive)
- Last triggered date

**New webhook form:**
- Name — display label
- Topic — dropdown: event.created, event.updated, event.deleted, event.restored, attendee.created, attendee.updated, speaker.created, zoom-meeting.created, etc.
- Delivery URL — HTTPS endpoint
- Secret — signing key (note: key stored as `secrete` — typo in source)
- Status — active/inactive toggle

---

## 8. Settings Pages

All under `Eventin → Settings` or `admin.php?page=eventin_settings`.

### General Tab
| Setting | Description |
|---------|-------------|
| Event Slug | URL slug for event archive (`/etn` default) |
| Event Archive | Archive page title |
| Events Per Page | Pagination limit |
| Exclude from Search | Toggle to exclude events from WP search |
| Event Calendar BG Color | Default calendar event background |
| Event Currency | Currency code for ticket prices |
| Date Format | Display date format |
| Time Format | 12h / 24h |
| Hide Attendee Email | Toggle to mask emails in attendee list |
| Delete Data on Uninstall | GDPR-style data cleanup toggle |

### Ticket Tab
| Setting | Description |
|---------|-------------|
| Sell Tickets | Master toggle; requires WooCommerce |
| WooCommerce Product Type | Simple / Variable (for ticket products) |
| Ticket Availability Text | Customizable sold-out text |
| Show Ticket on Homepage | Toggle for homepage ticket widget |
| Max Tickets Per Order | Global per-order limit |
| Confirmation Email | Enable/disable purchase confirmation |
| Admin Email | Address to receive booking notifications |
| Email Subject | Customizable subject line |
| Email Body | HTML email content with placeholders |

### Email Tab
Templates for: booking confirmation, RSVP notification, certificate delivery, reminder emails.

Each template:
- Subject line (with placeholders: `{event_name}`, `{attendee_name}`, `{ticket_id}`, etc.)
- HTML body editor (TinyMCE)
- Enable/disable toggle per email type

### Payments Tab
| Payment Method | Settings |
|----------------|----------|
| Stripe | API Key (test/live), Webhook Secret, Enable toggle |
| PayPal | Client ID, Secret, Mode (sandbox/live), Enable toggle |

Both gated by "Sell Tickets" master toggle.

### Zoom Tab
| Setting | Description |
|---------|-------------|
| Zoom API Key | JWT app API Key |
| Zoom API Secret | JWT app secret |
| Connect status | Shows connected email and connection health |

### Google Meet Tab
| Setting | Description |
|---------|-------------|
| Client ID | Google OAuth app Client ID |
| Client Secret | OAuth secret |
| Redirect URI | Callback URL for OAuth (auto-generated) |
| Authorize button | Opens Google OAuth consent screen |
| Connected status | Shows authorized account email |

### Certificate Tab
| Setting | Description |
|---------|-------------|
| Certificate background | Default background image/color |
| Certificate logo | Default logo image |
| Certificate signature | Default signature image |
| Auto-send certificate | Toggle: send on event completion / never |

### RSVP Tab
| Setting | Description |
|---------|-------------|
| Enable RSVP | Module activation toggle |
| Default form type | Simple / Advanced |
| RSVP button label | "Going" button text |
| Not going button label | "Not Going" button text |
| Confirmation email | RSVP confirmation template |

### AI Generator Tab
| Setting | Description |
|---------|-------------|
| AI Plugin status | Status of eventin-ai companion plugin (linked install) |
| OpenAI API Key | Entered in the eventin-ai plugin, shown here for reference |
| Generation model | GPT-3.5 / GPT-4 selector (in eventin-ai plugin) |

*Note: Actual API key configuration happens in the separate eventin-ai plugin, not here.*

### Advanced Tab
| Setting | Description |
|---------|-------------|
| Load Google Maps | Toggle for maps API loading |
| Google Maps API Key | For venue maps |
| Custom CSS | Inline CSS injected on event pages |
| Event Permalink Flush | Manual rewrite flush button |

### API Keys Tab
REST API key management for third-party integrations (read-only in free version).

---

## 9. Permissions Manager (`admin.php?page=eventin_permission`)

**Interface:**
- Role list (WordPress roles + any custom roles)
- Per-role toggle matrix for Eventin capabilities:
  - Manage Events
  - Manage Attendees
  - Manage Speakers
  - Manage Schedules
  - Manage Tickets
  - Manage Webhooks
  - Manage Permissions (admin only)

**Implementation:**
- `EventinPro\AccessControl\PermissionManager` handles read/write
- REST API CRUD: `GET/PUT/DELETE /eventin/v2/permissions/{role}`
- Built-in caps: `etn_manage_attendee`, `manage_etn_attendee`, `etn_manage_license`

---

## 10. Shortcode Builder (`admin.php?page=eventin_shortcode`)

**Interface:**
- Visual shortcode configurator (tabbed by shortcode category)
- Each shortcode has a form with its available parameters
- "Copy Shortcode" button generates the final tag string

**Categories:**
- Events Listing (6 styles)
- Calendar
- Schedule
- Speaker
- Organizer
- Countdown Timer
- RSVP Form
- Ticket Form
- Attendee List
- Recurring Event

For each shortcode, documented parameters include style, limit, category filter, specific event ID, and display options.

---

## 11. License Activation (`admin.php?page=eventin_license`)

**Interface:**
- License key input field
- Activate / Deactivate buttons
- License status display (active / inactive / expired)
- Registered email
- Site count used vs. allowed

**Implementation:**
- EDD SL (Easy Digital Downloads Software Licensing) API
- REST: `POST /eventin/v2/licenses/activate` and `/deactivate`
- License data stored in `_etn_license_user` option

---

## 12. WordPress Dashboard Widget

The base Eventin plugin adds a **Dashboard widget** showing:
- Total events this month
- Total upcoming events
- Total attendees
- Recent event list with links

---

## AI Generator Admin Surface ⭐

When the `eventin-ai` companion plugin is active, the event edit screen gains:

**"AI Generator" tab** in the event settings panel with:

| Button | What it generates | Meta key populated |
|--------|-------------------|--------------------|
| Generate Event Title | A title from keyword | `post_title` |
| Generate Event Description | Full event description | `post_content` |
| Generate Event Image | DALL·E image suggestion | featured image |
| Generate FAQ | Multiple Q&A pairs | `etn_event_faq` |

**Interaction flow:**
1. Admin enters a keyword/topic in the prompt field
2. Clicks a "Generate with AI" button
3. JavaScript POSTs to a REST endpoint (in eventin-ai plugin)
4. Response populates the corresponding field
5. Admin can regenerate or accept

**No streaming** — single response after a loading indicator.

**Gating:** Only available if `eventin-ai` plugin is installed and active. The main Eventin Pro plugin delegates all LLM calls to `EventinAi\Core\Ai` class.

---

## UX Observations & Dateline Implications

| Observation | Impact |
|-------------|--------|
| All settings tabs are on a single page with URL fragment navigation | Deep-linking to a specific setting requires knowing the tab param |
| Event edit metaboxes are heavily React-powered but in classic WP layout | Feels modern in content areas but the surrounding chrome is WP 4.x classic |
| The AI Generator requires a second plugin install | User friction; hidden capability |
| No bulk event import from the admin UI (CSV import is a paid add-on) | Barrier for large orgs migrating to the plugin |
| Webhook configuration is CPT-based (no dedicated admin page) | Power users find this confusing; it's a list table, not a clean form |
| Template builder opens in Gutenberg block editor | Inconsistent with rest of admin (classic metaboxes elsewhere) |
| QR scanner is a dedicated page that replaces the attendee list table | Scanner UX is reasonable but requires navigating away from normal admin flow |
| Permission system UI is simple toggle matrix | Sufficient for most use cases; lacks fine-grained per-event override |
| Settings spread across 10 tabs | Discoverability problem for infrequent admin tasks |
| No guided onboarding / setup wizard | First-time setup experience requires reading documentation |
