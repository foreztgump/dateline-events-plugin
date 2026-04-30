# EventON 4.8 — Data Model

---

## Post Types

### `ajde_events` — Events (core)
- **Registered by:** `EVO_post_types::register_post_types()` on `init` (priority 5)
- **Slug:** configurable via `evcal_options_evcal_1['evo_event_slug']`; default `events`
- **Capability type:** `eventon` (custom; mapped via `map_meta_cap`)
- **Public:** yes; **REST:** yes; **Archive:** yes
- **Supports:** `title`, `author`, `editor`, `custom-fields`, `thumbnail`, `page-attributes`, `comments` (filterable via `eventon_event_post_supports`)
- **Taxonomies:** `post_tag` (plus custom taxonomies registered separately)
- **Exclude from search:** configurable (default `true` via `evo_cpt_search_visibility` filter)

### `evo-rsvp` — RSVP Records (eventon-rsvp add-on)
- **Registered by:** `EventON_rsvp::register_rsvp_post_type()`
- **Publicly queryable:** no; **Archive:** yes; **Exclude from search:** yes
- **Show in menu:** under Events admin menu
- **Capability type:** `eventon`
- **Supports:** `title`, `custom-fields`

### `evo-tix` — Ticket Records (eventon-tickets add-on)
- **Registered by:** `evotx::class-post-types`
- **WooCommerce product linked** via `tx_woocommerce_product_id` postmeta

---

## Postmeta Keys — `ajde_events`

### Time & Date
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_srow` | int (Unix) | Event start timestamp (UTC) |
| `evcal_erow` | int (Unix) | Event end timestamp (UTC) |
| `_unix_start_ev` | int (Unix) | Start in event's local timezone |
| `_unix_end_ev` | int (Unix) | End in event's local timezone |
| `_evo_virtual_erow` | int (Unix) | Virtual visible end time timestamp |
| `_evo_virtual_endtime` | `yes`/`no` | Enable virtual end time display |
| `_time_ext_type` | string | Time extension type: `n`=none, `dl`=day long, `ml`=month long, `yl`=year long |
| `evo_hide_endtime` | `yes`/`no` | Hide end time from calendar display |
| `evo_span_hidden_end` | `yes`/`no` | Span event until hidden end time |
| `_evo_date_format` | string | Date format (e.g. `Y/m/d`) saved at edit time |
| `_evo_time_format` | string | Time format (`12h`/`24h`) saved at edit time |
| `evo_event_timezone` | string | Optional timezone text label (e.g. `PST`) |
| `_evo_tz` | string | IANA timezone key for event (e.g. `America/Los_Angeles`) |

### Repeating Events
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_repeat` | `yes`/`no` | Is this a repeating event |
| `evcal_rep_freq` | string | Frequency: `daily`, `hourly`, `weekly`, `monthly`, `yearly`, `custom` |
| `evcal_rep_gap` | int | Gap between repeats (e.g. every 2 weeks) |
| `evcal_rep_num` | int | Number of repeat occurrences |
| `evp_repeat_rb` | string | Monthly repeat mode: `dom`=day of month, `dow`=days of week |
| `evp_repeat_rb_wk` | string | Weekly repeat mode: `sing`=single day, `dow`=days of week |
| `evo_repeat_wom` | string (CSV) | Week-of-month for monthly repeats (1–5, -1=last) |
| `evo_rep_WK` | string (CSV) | Day-of-week for monthly dow repeats (0=Sun…6=Sat) |
| `evo_rep_WKwk` | string (CSV) | Day-of-week for weekly dow repeats |
| `repeat_intervals` | array | Serialised array of `[start_unix, end_unix]` pairs for custom/computed repeats |
| `_evcal_rep_series` | `yes`/`no` | Show other future repeat instances on event card |
| `_evcal_rep_endt` | `yes`/`no` | Show end time of repeat instances on event card |
| `_evcal_rep_series_clickable` | `yes`/`no` | Make repeat dates clickable |
| `_evcal_rep_series_ux` | string | How to open repeat: `def`, `defA`, `lb` |
| `_evo_rep_series` | `yes`/`no` | Show current instance position (e.g. "Event 1 / 5") |
| `_evo_rep_no_nosort` | `yes`/`no` | Disable auto-sort of custom repeat intervals |

### Status & Visibility
| Key | Type | Purpose |
|-----|------|---------|
| `_status` | string | Event status: `published`, `cancelled`, `rescheduled`, `postponed` |
| `_cancel_reason` | string | Reason text for cancelled events |
| `_rescheduled_reason` | string | Reason text for rescheduled events |
| `_postponed_reason` | string | Reason text for postponed events |
| `_featured` | `yes`/`no` | Featured event flag |
| `_completed` | `yes`/`no` | Event is completed |
| `evo_exclude_ev` | `yes`/`no` | Exclude from all calendars |
| `_onlyloggedin` | `yes`/`no` | Visible to logged-in users only |
| `_evo_lang` | string | Language variation key (e.g. `L1`) |

### Colours & Appearance
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_event_color` | hex string | Primary event colour (hex without #) |
| `evcal_event_color_n` | int/`1` | `1` = no colour set |
| `evcal_event_color2` | hex string | Secondary/gradient event colour |
| `evcal_event_color_n2` | int | `1` = no secondary colour |
| `_edata` | serialised array | Packed event data sub-fields (see below) |

### `_edata` — Packed JSON sub-fields
Stored as a serialised array under the `_edata` postmeta key. Accessed via `EVO_Event::get_eprop($key)`.
| Sub-key | Purpose |
|---------|---------|
| `hide_progress` | Hide live event progress bar |
| (extensible) | Add-ons can add sub-keys via `evo_event_metafields` filter |

### Location & Map
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_location_name` | string | (legacy) location name — superseded by `event_location` taxonomy |
| `evo_location_tax_id` | int | Linked `event_location` taxonomy term ID (deleted on save; use taxonomy) |
| `evcal_hide_locname` | `yes`/`no` | Hide location name display |
| `evcal_gmap_gen` | `yes`/`no` | Override: generate Google Map for this event |
| `evcal_name_over_img` | `yes`/`no` | Show location name over map image |
| `evo_access_control_location` | string | Location access control |
| `evo_gmap_iconurl` | string URL | Custom Google Maps marker icon URL |

### Organizer
| Key | Type | Purpose |
|-----|------|---------|
| `evo_organizer_tax_id` | int | Linked `event_organizer` taxonomy term ID (deleted on save; use taxonomy) |
| `evo_evcrd_field_org` | string | Organizer display name override |
| `evo_event_org_as_perf` | `yes`/`no` | Show organizer as performer (schema) |

### Links
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_exlink` | URL | External link for "More Info" / redirect |
| `_evcal_exlink_target` | string | `_blank`/`_self` |
| `_evcal_exlink_option` | string | Link behaviour: `1`=new window, `2`=same window, `3`=lightbox, `4`=event page |
| `evcal_lmlink` | URL | "Learn More" link |
| `evcal_lmlink_target` | string | `_blank`/`_self` |
| `evcal_subtitle` | HTML string | Event subtitle / description snippet |
| `evcal_mu_id` | string | Multi-use event ID reference |

### Images
| Key | Type | Purpose |
|-----|------|---------|
| `_evo_images` | string (CSV of attachment IDs) | Extra event images gallery (comma-separated) |
| (WP standard) | int | Featured image via `_thumbnail_id` (WP standard) |

### Virtual Events (Zoom integration)
| Key | Type | Purpose |
|-----|------|---------|
| `_vir_url` | URL | Virtual event URL |
| `_vir_pass` | string | Virtual event password |
| (zoom fields) | various | Set by Zoom integration class |

### PayPal (built-in, legacy)
| Key | Type | Purpose |
|-----|------|---------|
| `evcal_paypal_item_price` | decimal string | Price for PayPal Buy Now button |
| `evcal_paypal_text` | string | Text above PayPal button |
| `evcal_paypal_email` | email | Override PayPal recipient email |

### Custom Meta Fields (CMF)
- Defined in settings; stored as `_evomdt_subheader_{n}` and free-form `_` prefixed keys
- Count controlled by `evo_max_cmd_count` filter

### Related Events
| Key | Type | Purpose |
|-----|------|---------|
| `ev_releated` | string/array | Related event IDs |

### Goals / Attendance
- Stored via `class-meta_boxes-goals.php` / `class-meta_boxes-attendance.php`
- Keys include health/goal tracking fields (COVID-era feature)

---

## Postmeta Keys — `evo-rsvp` (RSVP Records)

Each `evo-rsvp` post represents one guest's RSVP submission.

| Key | Type | Purpose |
|-----|------|---------|
| `e_id` | int | Parent `ajde_events` post ID |
| `repeat_interval` | int | Which repeat instance this RSVP is for |
| `first_name` | string | Guest first name |
| `last_name` | string | Guest last name |
| `email` | email | Guest email |
| `phone` | string | Guest phone |
| `rsvp` | string | RSVP choice: `y`=yes, `m`=maybe, `n`=no |
| `updates` | `yes`/`no` | Wants email updates |
| `count` | int | Number of guests in this RSVP |
| `additional_notes` | string | Guest notes |
| `signin` | `y` | Set when guest checks in (virtual events) |
| `evors_addf{n}_1` | string | Custom additional form field values |

### `ajde_events` — RSVP Event-level settings (on the parent event)
| Key | Type | Purpose |
|-----|------|---------|
| `evors_rsvp` | `yes`/`no` | Enable RSVP for this event |
| `evors_capacity` | `yes`/`no` | Enable capacity limit |
| `evors_capacity_count` | int | Maximum RSVP capacity |
| `evors_capacity_show` | `yes`/`no` | Show remaining capacity on card |
| `evors_show_bars` | `yes`/`no` | Show capacity progress bars |
| `evors_show_rsvp` | `yes`/`no` | Show RSVP section on event card |
| `evors_show_whos_coming` | `yes`/`no` | Show attendee list on card |
| `evors_whoscoming_after` | int | Number of attendees to show |
| `_evors_show_whos_notcoming` | `yes`/`no` | Show "not coming" list |
| `_evors_whosnotcoming_after` | int | Number of "not coming" to show |
| `evors_only_loggedin` | `yes`/`no` | Require login to RSVP |
| `_evors_incard_form` | `yes`/`no` | Show RSVP form inline in event card |
| `evors_max_active` | int | Max active RSVPs per user |
| `evors_add_emails` | email | Additional notification emails |

---

## Postmeta Keys — `evo-tix` (Ticket Records, eventon-tickets)

Each `evo-tix` post is a ticket definition linked to a WooCommerce product.

| Key | Type | Purpose |
|-----|------|---------|
| `_eventid` | int | Parent `ajde_events` post ID |
| `_orderid` | int | WooCommerce order ID |
| `_order_type` | string | Order type |
| `qty` | int | Ticket quantity purchased |
| `status` | string | Ticket status |
| `_stock` | int | Stock level |
| `_stock_status` | string | `instock`/`outofstock` |
| `ticket_ids` | array | Associated ticket IDs |
| `_ticket_number_instance` | int | Unique ticket number within event |
| `tid` | string | Ticket type ID |
| `total_sales` | int | Total sold (mirrored from WC product) |
| `tx_woocommerce_product_id` | int | Linked WooCommerce product ID |
| `wcid` | int | WooCommerce product ID (alternate key) |
| `type` | string | Ticket type slug |
| `signin` | string | Check-in status |

### `ajde_events` — Ticket Event-level settings
| Key | Type | Purpose |
|-----|------|---------|
| `evotx_tix` | `yes`/`no` | Enable ticket selling for this event |
| `tx_woocommerce_product_id` | int | Primary WC product for ticket |
| `_manage_repeat_cap` | `yes`/`no` | Manage capacity per repeat instance |
| `_name_yprice` | `yes`/`no` | Name-your-price tickets |
| `_evotx_nyp_min` | decimal | Minimum price for NYP tickets |
| `_evotx_show_next_avai_event` | `yes`/`no` | Show next available event for sold-out events |
| `_ticket_number_instance` | int | Ticket numbering start |

---

## Custom Tables

**None.** EventON core and all 12 analysed add-ons use exclusively WordPress's postmeta, options, and term meta APIs. No `CREATE TABLE` / `dbDelta` calls found in any source file.

---

## Taxonomies

### Core Taxonomies (registered by `EVO_post_types`)

| Taxonomy Slug | Label | Hierarchical | Linked to | Notes |
|---------------|-------|-------------|-----------|-------|
| `event_location` | Event Location | No | `ajde_events` | Non-hierarchical; has custom location meta (address, lat/lng) stored in options (see below). Slug: `event-location` (filterable via `evotax_slug_loc`) |
| `event_organizer` | Event Organizer | No | `ajde_events` | Has social media meta. Slug: `event-organizer` (filterable via `evotax_slug_org`) |
| `event_type` | Event Type (configurable label) | Yes | `ajde_events` | Up to N taxonomies (`event_type`, `event_type_2`, `event_type_3`…) — count controlled by `evcal_options_evcal_1['evo_ettCount']`; labels configurable per taxonomy. Slugs: `event-type`, `event-type-2`, etc. Shown in REST (`show_in_rest: true`) |

**Taxonomy term meta:** stored in `options` table using key `evo_et_taxonomy_{term_id}` (not WordPress term meta API). Contains extended metadata: location address, lat/lng, organizer social links, etc.

### MDT — Multi Data Type (pseudo-taxonomy, core)
- Registered dynamically via `evo_mdt` class
- Slug: `evo_mdt` (filterable via `eventon_taxonomy_objects_mdt`)
- Configured in settings; acts as additional event type categorisation
- Count controlled by `evo_multi_data_type_count` filter

---

## Options & Transients

### Core Options
| Option Key | Contents |
|-----------|---------|
| `evcal_options_evcal_1` | Primary settings array (general, maps, time, event display — ~200 keys) |
| `evcal_options_evcal_2` | Language/translation strings |
| `evcal_styles` | Custom CSS injected into frontend |
| `evcal_php` | Custom PHP code (legacy) |
| `eventon_plugin_version` | Installed plugin version string |
| `_eventon_create_pages` | Whether default pages have been created |
| `eventon_events_page_id` | Post ID of main events page |
| `evo_event_archive_page_id` | Post ID of event archive page |
| `evo_dyn_css` | Cached dynamic CSS (generated from appearance settings) |
| `eventon_addon_styles_version` | Version token for add-on CSS cache busting |
| `_evo_products` | Array of registered product/add-on metadata |
| `_evo_licenses` | License activation data per product slug |
| `_evo_prods_last_check` | Timestamp of last remote license check |
| `_evo_needs_update` | Flag: plugin needs update |
| `evo_cron_logs` | Array of cron execution log entries |
| `evo_data_log` | Debug/error log array |
| `evo_tax_meta` | Aggregated taxonomy term meta cache |
| `evo_et_taxonomy_{term_id}` | Per-term extended metadata (location address, organizer social, etc.) |

### Transients
| Transient Key | TTL | Purpose |
|--------------|-----|---------|
| `_evo_activation_redirect` | 1 hour | Redirect to welcome page after first activation |

### Add-on Options
| Option Key | Add-on | Contents |
|-----------|--------|---------|
| `evcal_options_evcal_rs` | RSVP | RSVP global settings (digest email, roles, form fields, capacity defaults) |
| `evcal_options_evcal_tx` | Tickets | Ticket global settings (WC integration, email, autocomplete, sell-stop rules) |

---

## Add-on Data Model Additions

### eventon-rsvp
- **New CPT:** `evo-rsvp` (one record per guest per event/occurrence)
- **Event-level meta:** `evors_*` keys on `ajde_events` (see above)
- **Global options:** `evcal_options_evcal_rs`

### eventon-tickets
- **New CPT:** `evo-tix` (one record per ticket type; linked to WC product)
- **Event-level meta:** `evotx_tix`, `tx_woocommerce_product_id`, `_ticket_number_instance` on `ajde_events`
- **Global options:** `evcal_options_evcal_tx`
- **WooCommerce product meta:** `_eventid`, `evotx_tix`, and cart session data

### eventon-seats
- Adds seat map configuration postmeta to `ajde_events`; seat data linked to `evo-tix` records
- Requires both `evotx` and `evors`

### eventon-rsvp-events-waitlist (EVORSW)
- Waitlist entries as sub-records of `evo-rsvp` CPT; no new CPT
- Event-level meta: `evorsw_waitlist` flag on `ajde_events`

### eventon-rsvp-invitees (EVORSI)
- Invitee email list stored as event postmeta; no new CPT
- Blocks non-invitee RSVP submissions

### eventon-ticket-variations-options (EVOVO)
- Variation definitions stored as WC product attributes linked to `evo-tix` products
- Option selections stored in WC cart/order item meta

### eventon-csv-importer
- No data model additions; reads CSV → writes `ajde_events` posts + postmeta

### eventon-slider, eventon-full-cal, eventon-weekly-view, eventon-wishlist-add-on, eventon-qrcode
- No new CPTs or custom tables
- Add frontend-visible features via existing `ajde_events` data
- Wishlist: stores wishlist in user meta or cookie
- QR Code: check-in state written to `signin` meta on `evo-rsvp` records
