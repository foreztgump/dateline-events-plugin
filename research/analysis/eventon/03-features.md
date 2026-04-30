# EventON 4.8 — Features & i18n Seed

---

## Feature Inventory

### Core Calendar Display

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Accordion Calendar** | Month-by-month accordion; events expand inline when clicked | `accord=yes` shortcode | No |
| **Tile/Grid Layout** | Display events as a grid of tiles instead of list rows | `tiles=yes`, `tile_count`, `tile_height`, `tile_style`, `tile_bg` shortcode params | No |
| **Schedule View** | Chronological timeline-style display | `[add_eventon_sv]` shortcode | No |
| **"Now" / Live Events View** | Shows currently-happening events | `[add_eventon_now]` shortcode | No |
| **Single Event Box** | Embed one specific event anywhere | `[add_single_eventon]` shortcode | No |
| **Event List** | Simple list of events (no calendar) | `[add_eventon_list]` shortcode | No |
| **Tabbed Calendar** | Multiple calendars in tabs | `[add_eventon_tabs]` shortcode | No |
| **Anywhere Event** | Minimal event display anywhere | `[eventon_anywhere]` shortcode | No |
| **Full Calendar Grid** | Monthly grid calendar (FullCalendar.js) | `[add_eventon_fc]` shortcode | `eventon-full-cal` |
| **Weekly View** | Week-grid calendar | `[add_eventon_wv]` shortcode | `eventon-weekly-view` |
| **Event Slider** | Horizontal slider of events | `[add_eventon_slider]` shortcode | `eventon-slider` |
| **Search** | Keyword search across events | `[add_eventon_search]` shortcode; `search=yes` on main calendar | No |
| **Calendar View Switcher** | Button to toggle between list/full-cal/weekly views | `view_switcher=yes` | Depends on active view add-ons |

---

### Calendar Filtering & Sorting

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Event Type Filtering** | Filter by up to 5 event type taxonomies | `filters=yes`, `event_type=` shortcode params | No |
| **Filter Dropdowns or Buttons** | Switch between dropdown and button-style filter UI | `filter_type=dropdown\|select` | No |
| **Filter Side-panel Style** | Filter on side vs. on top of calendar | `filter_style=default\|side` | No |
| **AND/OR Filter Logic** | Multi-filter relationship | `filter_relationship=AND\|OR` | No |
| **Show-only-set-filters** | Only show filters that have events | `filter_show_set_only=yes` | No |
| **Sort Options** | Sort by date, title, or random | `sort_by=sort_date\|sort_title\|sort_rand` | No |
| **Hide Sort Options** | Remove sorting UI | `hide_so=yes` | No |
| **Keyword Search in Calendar** | Pre-filter calendar by keywords | `s=keyword` | No |
| **Past Events Filter** | Show/hide past events | `hide_past=yes`, `pec=` (past event cut-off) | No |
| **Featured Events Only** | Show only featured events | `only_ft=yes` | No |
| **Hide Featured Events** | Exclude featured events | `hide_ft=yes` | No |
| **Members Only** | Hide calendar from non-logged-in users | `members_only=yes` | No |
| **Event Status Filter** | Show only certain statuses | `event_status=all\|cancelled\|rescheduled` | No |
| **Virtual Event Filter** | Filter in/out virtual events | `event_virtual=all\|virtual\|non-virtual` | No |
| **Tag Filter** | Filter by WordPress post tags | `event_tag=` | No |
| **Cancel Events Toggle** | Show/hide cancelled events | `hide_cancels=yes` | No |

---

### Event Card (Expanded View)

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Event Image** | Featured image displayed in event card | WP featured image | No |
| **Extra Images Gallery** | Multiple images per event | `_evo_images` postmeta | No |
| **Location with Google Map** | Embedded Google Map in event card | `event_location` taxonomy term; `evcal_gmap_gen` | No |
| **Organizer Information** | Organizer name, bio, social links | `event_organizer` taxonomy | No |
| **External Link / More Info** | "More Info" / redirect button | `evcal_exlink`, `_evcal_exlink_option` | No |
| **Learn More Link** | Additional "Learn More" button | `evcal_lmlink` | No |
| **Event Subtitle** | Secondary description text | `evcal_subtitle` postmeta | No |
| **Add to Calendar** | iCal / Google / Outlook download buttons | Settings: Add to Calendar Options section | No |
| **Social Share** | Share event on social media | `social_share=yes` shortcode | No |
| **Event Schema / JSON-LD** | Structured data for search engines | Settings: `evo_schema`, `evo_remove_jsonld` | No |
| **Facebook OG Meta Tags** | Open Graph metadata for Facebook sharing | Settings: `evo_header_meta_data` | No |
| **Custom Meta Fields (CMF)** | Admin-defined extra fields displayed on event card | Settings > Custom Meta Fields tab | No |
| **Multi Data Types (MDT)** | Multiple data type taxonomy displays | MDT taxonomy system | No |

---

### Event Top (Collapsed List View)

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **EventTop Style Selector** | Choose eventtop visual style (1–5+) | `eventtop_style` shortcode; `evo_eventtop_style_def` option | No |
| **EventTop Date Style** | Choose date display format in eventtop | `eventtop_date_style` | No |
| **Live Now Progress Bar** | Progress bar showing event is in progress | `livenow_bar=yes`; `evo_eventtop_progress_hide` option | No |
| **"Live Now" Blinking Icon** | Blinking dot for currently-live events | `evo_hide_live` option | No |
| **Hide End Time** | Do not show event end time in calendar | `evo_hide_endtime` event meta; `hide_end_time` shortcode | No |
| **Virtual Visible End Time** | Show a different (later) visible end time while keeping actual duration | `_evo_virtual_endtime`, `_evo_virtual_erow` | No |
| **EventTop Tags** | Type/category tags on event row | `hide_et_tags=yes` to hide | No |
| **Event Colour** | Per-event colour on event row | `evcal_event_color` / `evcal_event_color2` postmeta | No |
| **Event Type Colour Override** | Use taxonomy colour instead of event colour | `etc_override=yes` | No |
| **View in My Time** | Localise event time to visitor timezone | `evo_vimt` option | No |

---

### Event Data & Administration

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Repeating Events** | Daily/hourly/weekly/monthly/yearly/custom repeat schedules | `evcal_repeat`, `evcal_rep_freq`, `repeat_intervals` | No |
| **Event Status** | Mark events as published/cancelled/rescheduled/postponed | `_status` postmeta | No |
| **Featured Event** | Mark/filter events as featured | `_featured` postmeta | No |
| **Completed Event** | Mark events as completed | `_completed` postmeta | No |
| **Exclude from Calendar** | Hide specific events from all calendar displays | `evo_exclude_ev` postmeta | No |
| **Logged-in Only Events** | Restrict event visibility to registered users | `_onlyloggedin` postmeta | No |
| **Event Timezone** | Per-event timezone with IANA zone support | `_evo_tz` postmeta | No |
| **Language Corresponding Events** | Multi-language event variations | `_evo_lang`, `evo_lang_corresp` option | No |
| **Bulk Edit / Quick Edit** | Edit multiple events from the list table | WP quick edit integration | No |
| **Duplicate Event** | Copy an event with all its metadata | Duplicate post action | No |
| **CSV Export** | Export events to CSV file | Admin AJAX handler | No |
| **ICS Export** | Export events as iCal file(s) | `ics=yes` shortcode; `evo_event_ics_content` hook | No |
| **Webhooks** | Outgoing HTTP webhooks on event triggers | Settings > Webhooks; `evo_webhook_triggers` | No |
| **Zoom Integration** | Built-in Zoom meeting creation and virtual events | Integration > Zoom settings | No (built-in) |
| **Elementor Widget** | Drag-and-drop calendar widget for Elementor | Auto-detected | No (built-in) |
| **Gutenberg Block** | Native WP block for calendar embed | Block editor | No (built-in) |
| **Visual Composer / WPBakery** | WPBakery calendar element | Auto-detected | No (built-in) |
| **WPML Support** | Multi-language via WPML plugin | `wpml_l1/l2/l3` shortcode params | No (WPML required) |
| **WP Widget** | Sidebar widget for events | `widgets_init` | No |

---

### Navigation & UX

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Month Jumper** | Dropdown to jump to a specific month/year | `jumper=yes` shortcode | No |
| **Bottom Navigation** | Navigation arrows at bottom of calendar | `bottom_nav=yes` | No |
| **Show Upcoming Count** | Display N upcoming events regardless of month | `show_upcoming=N` | No |
| **Show Limit** | Show first N events, then "View more" | `show_limit=yes`, `show_limit_redir` | No |
| **Number of Months** | Show events spanning multiple months | `number_of_months=N` | No |
| **Fixed Month/Year** | Lock calendar to specific month | `fixed_month`, `fixed_year` | No |
| **Hide Empty Months** | Skip months with no events | `hide_empty_months=yes` | No |
| **Separate Months** | Visual separator between months | `sep_month=yes` | No |
| **Hide Month Headers** | Remove month labels | `hide_month_headers=yes` | No |
| **RTL Support** | Right-to-left layout for all calendars | `evo_rtl` option | No |
| **Month Name Format** | Customise header month/year format | `evcal_cal_header` option | No |
| **Accordion Effect** | Expand event cards in place | `accord=yes` | No |

---

### Appearance & Styling

| Feature | Description | Key setting/meta | Add-on required |
|---------|-------------|-----------------|-----------------|
| **Visual Designer** | Point-and-click colour/font design tool | Admin > EventON > Appearance | No |
| **Custom CSS** | Free-form CSS injection | Settings > Styles tab; `evcal_styles` option | No |
| **Dynamic CSS** | Generated CSS from design settings | `evo_dyn_css` option | No |
| **Google Fonts** | Load Google Fonts for calendar text | Appearance settings | No |
| **Map Style** | Custom Google Maps visual style | `evcal_gmap_style` option | No |
| **Featured Image Height** | Control event image height | `evo_ftimgheight` / `evo_ftimg_height_sty` | No |
| **Event Type Colourful** | Colour-coded event type categories | `evo_ett_colorful_color` | No |

---

### Add-on Features

| Feature | Description | Add-on |
|---------|-------------|--------|
| **RSVP / Event Registration** | Guests RSVP (yes/maybe/no) with form; capacity management; email confirmation; digest emails; "who's coming" list | `eventon-rsvp` |
| **RSVP Waitlist** | Automatic waitlist when RSVP capacity reached | `eventon-rsvp-events-waitlist` |
| **RSVP Invitees** | Restrict RSVP to invited email addresses | `eventon-rsvp-invitees` |
| **Event Tickets (WooCommerce)** | Sell event tickets via WooCommerce products; ticket-specific stock; ticket email; check-in | `eventon-tickets` |
| **Ticket Variations & Options** | Add size/type variations and options to tickets | `eventon-ticket-variations-options` |
| **Seat Selection** | Choose specific seats on a seat map at checkout | `eventon-seats` |
| **QR Code Check-in** | Generate QR codes for tickets/RSVPs; scan to check in | `eventon-qrcode` |
| **Event Wishlist** | Logged-in users save events to a wishlist | `eventon-wishlist-add-on` |
| **CSV Importer** | Bulk import events from CSV files | `eventon-csv-importer` |
| **Full Calendar Grid** | Monthly grid view powered by FullCalendar.js | `eventon-full-cal` |
| **Event Slider** | Horizontal/animated event carousel | `eventon-slider` |
| **Weekly View** | 7-day week grid view | `eventon-weekly-view` |

---

## Settings Pages

| Page slug | Tab | Label | What it controls |
|-----------|-----|-------|-----------------|
| `admin.php?page=eventon` | `evcal_1` | Settings | General, Google Maps, Time & Date, Sorting, Shortcode defaults, EventTop, EventCard, Paypal, Appearance |
| `admin.php?page=eventon` | `evcal_2` | Language | Frontend text strings (month names, button labels, messages) |
| `admin.php?page=eventon` | `evcal_3` | Styles | Custom CSS; custom PHP (legacy) |
| `admin.php?page=eventon` | `evcal_4` | Licenses | Product license activation |
| `admin.php?page=eventon` | `evcal_5` | Support | Troubleshooting tools, system info |
| `admin.php?page=eventon` | `evcal_rs` | RSVP (add-on) | Global RSVP settings (form, emails, roles, capacity defaults) |
| `admin.php?page=eventon` | `evcal_tx` | Tickets (add-on) | WooCommerce integration, ticket email, autocomplete, selling rules |

Settings are stored in `evcal_options_evcal_1` (general) and `evcal_options_evcal_2` (language). Add-on tabs store in their own option keys (`evcal_options_evcal_rs`, `evcal_options_evcal_tx`).

---

## i18n String Mining Seed

### Text Domains
| Domain | Plugin |
|--------|--------|
| `eventon` | EventON core |
| `evors` | RSVP add-on |
| `evorsw` | RSVP Waitlist add-on |
| `evorsi` | RSVP Invitees add-on |
| `evotx` | Event Tickets add-on |
| `evost` | Seats add-on |
| `evovo` | Ticket Variations add-on |

### Top 50 UI-Facing Strings (domain: `eventon`)

```
// Calendar UI
"Event"
"Events"
"Add New Event"
"Edit Event"
"All Events"
"No Events"
"View All Events"
"View More"
"Load More"
"Search Events"
"Filter Events"
"Sort Events"

// Dates / Times
"All Day"
"Event Start"
"Event End"
"Today"
"January" / "February" / ... (all 12 months)
"Monday" / "Tuesday" / ... (all 7 days)

// Event Card Actions
"Add to your calendar"
"Get Directions"
"More Info"
"Learn More"
"Share This"
"View Event"
"Download ICS"
"Add to Google Calendar"
"Add to Outlook Calendar"

// Event Status Labels
"Cancelled"
"Rescheduled"
"Postponed"
"Live Now"
"Virtual Event"

// Navigation
"Previous Month"
"Next Month"

// Admin
"EventON Settings"
"Save Settings"
"Settings Saved"
"Activate EventON License"
"Enter License Key"
"Deactivate License"
"Event Custom Meta Fields"
"Main Event Details"
"Event Options"
"Featured Event"
"Event Completed"
"Repeating Event - Enable repeating instances for this event"
"Event Start" / "Event End" (metabox labels)
"New Repeat Start" / "New Repeat End"
"Add New Repeat Interval"

// Error / Notice
"Action failed. Please refresh the page and retry."
"Address Missing"
"EventON is not activated, it must be activated to use"
```

### Strings Revealing Hidden Features
```
"Login required to see the information"  — access-controlled event sections
"View in my time"                        — user timezone localisation feature
"Only show events for loggedin users"    — member-gating
"Healthcare Guidelines"                  — health event compliance feature
"Autonomous Functions"                   — background processing settings
"Event Indexing"                         — custom search indexing
"Webhook"                                — outgoing webhook system
"PayPal Buy Now button"                  — built-in PayPal integration (legacy)
"Zoom"                                   — Zoom meeting integration
"Name Your Price"                        — NYP ticket type
"Multiple Events per repeat"             — repeat instance count display
"Custom Repeat Times"                    — custom repeat intervals
"Virtual Visible Event End"              — two-layer end-time feature
"Day Long" / "Month Long" / "Year Long"  — time extension types
"QR Code"                                — check-in feature (from qrcode add-on strings)
```

### Month & Day Names (localisation seed)
All month names (`january`–`december`) and day names (`monday`–`sunday`) are declared as bare `__()` calls in `lang/strings.php` with domain `eventon`. These are used client-side (JS receives them via `evo_lang_values`) to render localised calendar headers.

### Event Type Taxonomy Names (configurable)
The taxonomy label strings are configurable per site (stored in `evcal_options_evcal_1['evo_etl']` as an array). The defaults are:
```
event_type   → "Event Type"
event_type_2 → "Event Type 2"
event_type_3 → "Event Type 3"
event_type_4 → "Event Type 4"
event_type_5 → "Event Type 5"
```
Similarly singular/plural event names are configurable via `evo_textstr_sin` / `evo_textstr_plu` (default: "Event" / "Events").
