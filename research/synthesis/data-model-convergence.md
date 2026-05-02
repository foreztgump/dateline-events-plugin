---
doc: data-model-convergence
phase: 5
generated: 2026-05-01
analyst: droid
---

# Data Model Convergence

> **Rule:** every field present in 2+ P0 plugins is a real requirement. Fields present in 2+ add-ons (P1/P2) are treated as strong signals for v0.2+.
>
> P0 = EventON core, The Events Calendar Pro, Eventin Pro  
> P1 = eventon-tickets, eventon-rsvp, eventon-seats, eventon-ticket-variations-options  
> P2 = eventon-rsvp-events-waitlist, eventon-rsvp-invitees, eventon-qrcode  
> P3 = eventon-slider, eventon-full-cal, eventon-weekly-view, eventon-csv-importer, eventon-wishlist-add-on

---

## 1. Event Core Identity

### 1.1 Title
- **Plugins:** All 14 (WP `post_title`)
- **Storage:** `VARCHAR` on events table / CMS content title
- **Dateline takeaway:** standard `title` field on event content type.

### 1.2 Description / Content
- **Plugins:** All 14 (WP `post_content`)
- **Storage:** Rich text / portable text
- **Dateline takeaway:** standard `description` field; PortableText for EmDash.

### 1.3 Event Status
- **Plugins:** EventON (`_status`: published, cancelled, rescheduled, postponed), TEC (post_status + `_EventNextPendingRecurrence`), Eventin (`publish_status` via CSV)
- **Variations:** EventON uses custom meta; TEC uses WP post_status + recurrence meta
- **Dateline takeaway:** enum `EventStatus` = `draft | published | cancelled | rescheduled | postponed | completed`. Reversible state transitions tracked explicitly.

### 1.4 Featured / Promoted
- **Plugins:** EventON (`_featured` yes/no), Eventin (implicit via `event_layout` / `event_type`)
- **Dateline takeaway:** boolean `isFeatured` + optional `featuredAt` timestamp for ordering.

### 1.5 Language / Locale
- **Plugins:** EventON (`_evo_lang`), Eventin (`lang` on attendee record), TEC (i18n via WP locale)
- **Dateline takeaway:** IETF BCP 47 locale tag on event (e.g. `en-US`). Separate from timezone.

### 1.6 Event Type / Category
- **Plugins:** All 3 P0
  - EventON: `event_type` taxonomy (hierarchical, up to N), `event_type_2`, ..., configurable count
  - TEC: `tribe_events_cat` (hierarchical) + `post_tag` (flat)
  - Eventin: `etn_category` (hierarchical) + `etn_tag` (flat)
- **Dateline takeaway:** category taxonomy with slug `event_category`; tags as flat `event_tag`. Support multiple category taxonomies per event (multi-track conferences).

---

## 2. Time & Date

### 2.1 Start Date & Time
- **Plugins:** All 3 P0
  - EventON: `evcal_srow` (unix UTC), `_unix_start_ev` (local)
  - TEC: `_EventStartDate` (Y-m-d H:i:s local), `_EventStartDateUTC` (UTC)
  - Eventin: `etn_start_date` (Y-m-d), `etn_start_time` (H:i)
- **Variations:** unix int vs. ISO string vs. split date+time
- **Dateline takeaway:** store as ISO-8601 `startAt` in UTC. Display per `timezone`. Never split date/time into separate columns.

### 2.2 End Date & Time
- **Plugins:** All 3 P0
  - EventON: `evcal_erow`, `_unix_end_ev`
  - TEC: `_EventEndDate`, `_EventEndDateUTC`
  - Eventin: `etn_end_date`, `etn_end_time`
- **Dateline takeaway:** same as start — `endAt` ISO-8601 UTC.

### 2.3 Timezone
- **Plugins:** All 3 P0
  - EventON: `_evo_tz` (IANA key, e.g. `America/Los_Angeles`); also `evo_event_timezone` (label like "PST")
  - TEC: `_EventTimezone` (IANA)
  - Eventin: `event_timezone` (IANA)
- **Dateline takeaway:** IANA timezone ID stored as `timezone`. Use for DST-correct recurrence materialisation (`rrule` `tzid`).

### 2.4 All-Day Flag
- **Plugins:** EventON (`_time_ext_type`: n, dl, ml, yl), TEC (`_EventAllDay` yes/no), Eventin (implicit by end == 23:59 or missing time)
- **Variations:** EventON encodes all-day vs. multi-day vs. month-long in one enum; TEC is boolean
- **Dateline takeaway:** boolean `isAllDay`. Multi-day events expressed via `startAt`/`endAt` range, not a flag.

### 2.5 Hide End Time
- **Plugins:** EventON (`evo_hide_endtime` yes/no)
- **Dateline takeaway:** boolean `hideEndTime` on event. Purely a display concern.

### 2.6 Date/Time Display Format
- **Plugins:** EventON (`_evo_date_format`, `_evo_time_format`), TEC (global `dateTimeSeparator`, `datePickerFormat` in options)
- **Dateline takeaway:** per-site display format in settings; per-event override possible but rare.

### 2.7 Span Until Hidden End
- **Plugins:** EventON (`evo_span_hidden_end` yes/no)
- **Dateline takeaway:** boolean `spanUntilEnd`. Controls whether the event occupies calendar cells through its end date.

---

## 3. Location (Venue)

### 3.1 Venue / Location Name
- **Plugins:** All 3 P0
  - EventON: `evcal_location_name` (legacy meta) + `event_location` taxonomy term
  - TEC: `tribe_venue` CPT (linked via `_EventVenueID`)
  - Eventin: `etn_event_location` (string or serialized), `etn_event_location_type`
- **Dateline takeaway:** location as either inline structured object (`{ name, address, lat, lng }`) or reference to a reusable `venue` content type.

### 3.2 Street Address, City, State, ZIP, Country
- **Plugins:** TEC (tribe_venue CPT: `_VenueAddress`, `_VenueCity`, `_VenueState`, `_VenueProvince`, `_VenueZip`, `_VenueCountry`), Eventin (in `etn_event_location` or `etn_event_location_list`), EventON (taxonomy term meta via `evo_et_taxonomy_{term_id}`)
- **Variations:** TEC splits province vs. state; Eventin uses flat string or list
- **Dateline takeaway:** structured address object with standard fields. `province` merged with `state` (one field, context-driven label).

### 3.3 Latitude / Longitude
- **Plugins:** TEC (`_VenueLat`, `_VenueLng`), EventON (taxonomy term meta), Eventin (in location data)
- **Dateline takeaway:** `lat`/`lng` decimals on location object. Geocode on save if missing.

### 3.4 Map Display Toggle
- **Plugins:** EventON (`evcal_gmap_gen` yes/no, `evcal_name_over_img`, `evo_gmap_iconurl`), TEC (`embedGoogleMaps` global option + zoom)
- **Dateline takeaway:** boolean `showMap` on event; map tile provider configurable at site level.

### 3.5 Location Type (physical / virtual / hybrid)
- **Plugins:** Eventin (`etn_event_location_type`: online, physical, hybrid), EventON/Tickets (`_vir_after_tix` etc. imply hybrid), TEC (`_tribe_virtual_events_type`: online, hybrid, in-person)
- **Dateline takeaway:** enum `locationType` = `physical | virtual | hybrid`.

---

## 4. Organizer

### 4.1 Organizer Name / ID
- **Plugins:** All 3 P0
  - EventON: `event_organizer` taxonomy term (linked via `evo_organizer_tax_id`)
  - TEC: `tribe_organizer` CPT (linked via `_EventOrganizerID`)
  - Eventin: `etn_event_organizer` (serialized array)
- **Dateline takeaway:** support multiple organizers per event. Reusable `organizer` content type preferred; inline object acceptable for MVP.

### 4.2 Organizer Contact / Social
- **Plugins:** EventON (taxonomy term meta for social links), Eventin (`etn_event_socials`), TEC (organizer CPT has default fields)
- **Dateline takeaway:** `socials` array of `{ platform, url }` on organizer object.

---

## 5. Appearance & Media

### 5.1 Event Color (Primary)
- **Plugins:** EventON (`evcal_event_color` hex), Eventin (`etn_event_calendar_bg` hex, `banner_bg_color`), TEC (no per-event color in data model)
- **Variations:** EventON stores hex without `#`; Eventin has multiple color fields
- **Dateline takeaway:** `color` string (hex, validated). Optional `colorSecondary` for gradients.

### 5.2 Text / Contrast Color
- **Plugins:** Eventin (`etn_event_calendar_text_color`, `calendar_text_color`)
- **Dateline takeaway:** auto-computed contrast from `color`; optional `colorText` override.

### 5.3 Featured Image
- **Plugins:** All 14 (WP `_thumbnail_id`)
- **Dateline takeaway:** standard `featuredImage` asset reference.

### 5.4 Gallery / Extra Images
- **Plugins:** EventON (`_evo_images` CSV of attachment IDs), Eventin (`etn_banner`, `event_banner`, `event_banner_id`, `etn_event_logo`, `event_logo`, `event_logo_id`)
- **Variations:** Eventin has persistent schema drift — same image under 3+ keys
- **Dateline takeaway:** `images` array of asset references. Single image per semantic role (banner, logo).

### 5.5 Subtitle / Short Description
- **Plugins:** EventON (`evcal_subtitle` HTML), Eventin (none explicit), TEC (none explicit in data model)
- **Dateline takeaway:** optional `subtitle` string (plain text, <= 160 chars).

---

## 6. Links

### 6.1 External Link / Event URL
- **Plugins:** EventON (`evcal_exlink` URL + `_evcal_exlink_target`), Eventin (`external_link`), TEC (`_EventURL`)
- **Variations:** EventON has 4 behaviour modes (`_evcal_exlink_option`: new window, same window, lightbox, event page)
- **Dateline takeaway:** `externalUrl` URL + `externalUrlTarget` enum (`_blank | _self`) + optional `externalUrlBehaviour`.

### 6.2 Learn More Link
- **Plugins:** EventON (`evcal_lmlink` URL + `evcal_lmlink_target`)
- **Dateline takeaway:** merged with `externalUrl` — one canonical external link per event is enough. Button label configurable.

---

## 7. Categories & Taxonomies

### 7.1 Event Categories
- **Plugins:** All 3 P0 (EventON: `event_type`, TEC: `tribe_events_cat`, Eventin: `etn_category`)
- **Dateline takeaway:** `eventCategory` taxonomy, hierarchical. Multiple per event.

### 7.2 Event Tags
- **Plugins:** EventON (`post_tag`), TEC (`post_tag`), Eventin (`etn_tag`)
- **Dateline takeaway:** `eventTag` taxonomy, flat. Multiple per event.

### 7.3 Multi-Data Type / Custom Taxonomies
- **Plugins:** EventON (`evo_mdt` pseudo-taxonomy, configurable N types)
- **Dateline takeaway:** out of scope for MVP; site-level custom fields cover this.

---

## 8. Recurrence

### 8.1 Recurrence Enable
- **Plugins:** All 3 P0
  - EventON: `evcal_repeat` (yes/no)
  - TEC: `_EventRecurrence` (legacy) / `rset` (CT1 column) / `_tribe_blocks_recurrence_rules`
  - Eventin: `recurring_enabled` (bool), `event_recurrence` (serialized)
- **Dateline takeaway:** boolean `isRecurring`.

### 8.2 Recurrence Rules / Frequency
- **Plugins:** EventON (`evcal_rep_freq`: daily, hourly, weekly, monthly, yearly, custom), TEC (`rset` iCalendar RRULE string, `_tribe_blocks_recurrence_rules` JSON), Eventin (`event_recurrence` serialized)
- **Variations:** EventON has custom interval list in `repeat_intervals`; TEC uses proper RRULE; Eventin has opaque serialized
- **Dateline takeaway:** store as RFC-5545 RRULE string in `recurrenceRule`. Use `rrule` library for materialisation. Lazy compute occurrences on read with 2-year forward cap. Cache per-range hash in KV (TTL 1 hr).

### 8.3 Repeat Gap / Count / End
- **Plugins:** EventON (`evcal_rep_gap`, `evcal_rep_num`), TEC (inside RRULE `rset`), Eventin (inside serialized)
- **Dateline takeaway:** encoded inside RRULE string (`FREQ=WEEKLY;INTERVAL=2;COUNT=5;UNTIL=...`). No separate columns.

### 8.4 Monthly Repeat Mode
- **Plugins:** EventON (`evp_repeat_rb`: dom | dow, `evo_repeat_wom`: CSV of week-of-month)
- **Dateline takeaway:** supported natively by RRULE (`BYDAY=2MO` for "second Monday").

### 8.5 Weekly Day Selection
- **Plugins:** EventON (`evo_rep_WK`, `evo_rep_WKwk`: CSV of day-of-week indices)
- **Dateline takeaway:** RRULE `BYDAY=MO,WE,FR`.

### 8.6 Show Repeat Series
- **Plugins:** EventON (`_evcal_rep_series`, `_evcal_rep_series_clickable`)
- **Dateline takeaway:** boolean `showSeries` + `seriesClickable`.

### 8.7 Per-Repeat-Instance Capacity (Tickets)
- **Plugins:** EventON (`_manage_repeat_cap` yes/no, `ri_capacity` serialized array keyed by repeat index)
- **Dateline takeaway:** `repeatCapacity` map `{ occurrenceId -> int }` on ticket tier.

### 8.8 Per-Repeat-Instance RSVP Counts
- **Plugins:** EventON (`ri_count_rs` serialized: `{ repeatIndex -> { y, m, n } }`)
- **Dateline takeaway:** derived field, computed from RSVP table on demand. No persistent denormalised counters.

---

## 9. Tickets

### 9.1 Ticket Enable
- **Plugins:** EventON (`evotx_tix` yes/no), Eventin (`etn_ticket_variations`, `etn_total_avaiilable_tickets`)
- **Dateline takeaway:** boolean `hasTickets` on event.

### 9.2 Ticket Price
- **Plugins:** All 3 P0
  - EventON: `evcal_paypal_item_price` (legacy PayPal) / variation `regular_price` / `_evotx_nyp_min` (name-your-price)
  - TEC: `_EventCost` (display string)
  - Eventin: `ticket_price` (float), `_etn_variation_total_price`
- **Variations:** TEC stores as string; EventON and Eventin store as decimals
- **Dateline takeaway:** `price` as integer cents (Stripe convention). Display currency handled site-level. Name-your-price = `minPrice` + `maxPrice` on tier.

### 9.3 Inventory / Capacity
- **Plugins:** EventON (`_stock`, `evors_capacity_count`, `ri_capacity`), Eventin (`etn_total_avaiilable_tickets`)
- **Variations:** EventON has 3 separate capacity systems (ticket stock, RSVP cap, repeat cap); Eventin has one
- **Dateline takeaway:** `capacity` integer per ticket tier. Atomically decremented via KV (`inventory:{tierId}`). Restore on rejection.

### 9.4 Sold Count
- **Plugins:** EventON (`total_sales`), Eventin (`etn_total_sold_tickets`)
- **Dateline takeaway:** derived from `attendee` count or order line items. Never authoritative — always recompute from source.

### 9.5 Sold Individually (One Per Customer)
- **Plugins:** EventON (`_sold_individually`)
- **Dateline takeaway:** boolean `isOnePerCustomer` on ticket tier.

### 9.6 Stock Status
- **Plugins:** EventON (`_stock_status`: instock/outofstock)
- **Dateline takeaway:** enum `stockStatus` = `available | low | sold_out | hidden`. Computed from `capacity - reserved`.

### 9.7 Name-Your-Price
- **Plugins:** EventON (`_name_yprice` yes/no, `_evotx_nyp_min`)
- **Dateline takeaway:** boolean `isNameYourPrice` + `minPrice` cents on tier.

### 9.8 Remaining Count Threshold / Display
- **Plugins:** EventON (`_show_remain_tix`, `remaining_count`)
- **Dateline takeaway:** boolean `showRemaining` + `remainingThreshold` (show "only X left" when below).

### 9.9 Sell Cutoff Time
- **Plugins:** EventON (`_xmin_stopsell`: minutes before event start/end)
- **Dateline takeaway:** `salesCloseAt` ISO timestamp on ticket tier. Defaults to event start.

### 9.10 Ticket Numbering
- **Plugins:** EventON (`_ticket_number_instance` start counter, `_ticket_number`: `{evotix_id}-{order_id}-{product_id}T{index}`)
- **Dateline takeaway:** `ticketNumberSequenceStart` integer on event. Ticket numbers generated at purchase: `{eventId}-{orderId}-{index}`.

---

## 10. Ticket Tiers & Variations (P1)

### 10.1 Variation Enable
- **Plugins:** eventon-ticket-variations-options (`_evovo_activate` yes/no)
- **Dateline takeaway:** boolean `hasVariations` on event.

### 10.2 Variation Types (Axes)
- **Plugins:** eventon-ticket-variations-options (`_evovo_variation_type` serialized: `{ id -> { name, options[] } }`)
- **Dateline takeaway:** `variationTypes` array of `{ id, name, options[] }` on event.

### 10.3 Variation Rows (Concrete Combinations)
- **Plugins:** eventon-ticket-variations-options (`_evovo_variation` serialized: `{ id -> { parent_id, variations{ typeId -> value }, regular_price, sales_price, stock, stock_status } }`)
- **Key insight:** no combinatorial lookup table. Admin pre-creates each desired row explicitly. `"All"` wildcard covers any value of an axis.
- **Dateline takeaway:** `ticketTiers` array, each with `variantSelections: { typeId -> value }`. Flat-list matching at runtime.

### 10.4 Price Options (Add-ons)
- **Plugins:** eventon-ticket-variations-options (`_evovo_option` serialized: `{ id -> { name, regular_price, stock, sold_style: one|mult } }`)
- **Dateline takeaway:** `addOns` array on ticket tier. `soldStyle` = `toggle | quantity`.

### 10.5 Per-Ticket Snapshot at Purchase
- **Plugins:** eventon-ticket-variations-options (`_evovo_data` on `evo-tix`)
- **Dateline takeaway:** `purchaseSnapshot` JSON on attendee/line-item: captures `tierId`, `variantSelections`, `addOns`, `basePrice` at purchase time (for refunds/accounting).

---

## 11. Seats (P1)

### 11.1 Seat Map Definition
- **Plugins:** eventon-seats (`_evost_sections` serialized PHP array: sections -> rows -> seats with status, price, handicap)
- **Dateline takeaway:** `seatMap` JSON on event. Structure: `{ sections: [ { id, name, type, position, rows: [ { id, index, seats: [ { id, number, status, price, isAccessible } ] } ] } ] }`. Support `assigned` and `unassigned` section types.

### 11.2 Seat Assignment on Ticket
- **Plugins:** eventon-seats (`Seat-Number`, `_evost_seat_slug`, `_seat_type` on `evo-tix`)
- **Dateline takeaway:** `seatSlug` on attendee record (format: `{sectionId}-{rowId}-{seatId}`).

### 11.3 Seat Hold Registry
- **Plugins:** eventon-seats (`_evost_expiration` option: `{ eventId -> { seatSlug -> { cartKey -> { time, qty } } } }`)
- **Dateline takeaway:** KV `hold:{cartId}` with TTL 600s. Hold sweeps via `cron` hook. No global option blob.

---

## 12. RSVP (P1)

### 12.1 RSVP Enable
- **Plugins:** EventON (`evors_rsvp` yes/no), Eventin (`rsvp_settings` serialized)
- **Dateline takeaway:** boolean `hasRsvp` on event.

### 12.2 RSVP Capacity
- **Plugins:** EventON (`evors_capacity` yes/no toggle + `evors_capacity_count` int), Eventin (`etn_rsvp_limit_amount` int)
- **Dateline takeaway:** `rsvpCapacity` int on event. `hasRsvpCap` boolean flag.

### 12.3 RSVP Status (yes / no / maybe)
- **Plugins:** EventON (`rsvp` on `evo-rsvp`: y/n/m), Eventin (`etn_rsvp_value`)
- **Dateline takeaway:** enum `RsvpStatus` = `yes | no | maybe | waitlist | invited`. Waitlist and invited from add-ons.

### 12.4 Attendee / Guest Count
- **Plugins:** EventON (`count` on `evo-rsvp`), Eventin (`number_of_attendee` on `etn-attendee`)
- **Dateline takeaway:** `guestCount` int on RSVP.

### 12.5 Attendee Name
- **Plugins:** EventON (`first_name`, `last_name` on `evo-rsvp`), Eventin (`etn_name` on `etn-attendee`)
- **Dateline takeaway:** `firstName` + `lastName` strings on RSVP. `displayName` derived.

### 12.6 Attendee Email
- **Plugins:** EventON (`email`), Eventin (`etn_email`)
- **Dateline takeaway:** `email` (validated) on RSVP. Unique key per event for dedupe.

### 12.7 Attendee Phone
- **Plugins:** EventON (`phone`), Eventin (`etn_phone`)
- **Dateline takeaway:** `phone` string on RSVP (optional).

### 12.8 RSVP Additional Notes
- **Plugins:** EventON (`additional_notes` on `evo-rsvp`)
- **Dateline takeaway:** `notes` string on RSVP.

### 12.9 Email Updates Opt-In
- **Plugins:** EventON (`updates` yes/no)
- **Dateline takeaway:** boolean `wantsUpdates` on RSVP.

### 12.10 Show Who's Coming / Public Attendee List
- **Plugins:** EventON (`evors_show_whos_coming` yes/no, `evors_whoscoming_after` count, `_evors_show_whos_notcoming`)
- **Dateline takeaway:** `showAttendeeList` enum = `none | yes | only_if_rsvped`.

### 12.11 Per-User Max Active RSVPs
- **Plugins:** EventON (`evors_max_active` toggle + `evors_max_count` int)
- **Dateline takeaway:** `maxRsvpsPerUser` int on event.

### 12.12 RSVP Close Time (Deadline)
- **Plugins:** EventON (`evors_close_time`: minutes before event start)
- **Dateline takeaway:** `rsvpCloseAt` ISO timestamp on event. Defaults to event start.

### 12.13 Denormalised RSVP Counts on Event
- **Plugins:** EventON (`_rsvp_yes`, `_rsvp_no`, `_rsvp_maybe` on `ajde_events`)
- **Dateline takeaway:** do NOT denormalise. Query RSVP table on demand. Denormalised counts create race conditions in concurrent RSVP environments.

---

## 13. Waitlist (P2)

### 13.1 Waitlist Enable
- **Plugins:** eventon-rsvp-events-waitlist (`_evorsw_waitlist_on` yes/no)
- **Dateline takeaway:** boolean `hasWaitlist` on event. Requires `hasRsvpCap` = true.

### 13.2 Waitlist Status
- **Plugins:** eventon-rsvp-events-waitlist (`rsvp_type='waitlist'`, `status='waitlist'` on `evo-rsvp`)
- **Dateline takeaway:** `RsvpStatus.waitlist`. Promotion to `yes` happens inside `ctx.waitUntil` when capacity frees.

### 13.3 Waitlist Capacity
- **Plugins:** None explicit — delegates to RSVP `remaining_rsvp()`
- **Dateline takeaway:** `waitlistCapacity` int on event (optional; unlimited if omitted).

---

## 14. Private Events / Invitees (P2)

### 14.1 Invitee-Only Mode
- **Plugins:** eventon-rsvp-invitees (`evorsi_invitees` yes/no)
- **Dateline takeaway:** boolean `isInviteOnly` on event.

### 14.2 Invite Token
- **Plugins:** eventon-rsvp-invitees (base64(email + '-' + rsvp_id))
- **Dateline takeaway:** signed JWT or opaque token in `inviteToken` on RSVP. Token must be signed — base64 alone is guessable.

### 14.3 Private Messaging / Wall
- **Plugins:** eventon-rsvp-invitees (`_evorsi_messaging`, `_evorsi_invitee_wall` yes/no; `msgs` array with visibility)
- **Dateline takeaway:** out of scope for MVP. v0.2 feature — `EventMessage` content type with `visibility` enum.

---

## 15. Virtual Events

### 15.1 Virtual Event URL
- **Plugins:** EventON (`_vir_url`), TEC (`_tribe_events_virtual_url`), Eventin (`etn_google_meet_link`, `zoom_join_url`, `meeting_link`)
- **Dateline takeaway:** `virtualUrl` string on event.

### 15.2 Virtual Event Password
- **Plugins:** EventON (`_vir_pass`)
- **Dateline takeaway:** `virtualPassword` string on event (store as secret type).

### 15.3 Gating: Show After RSVP / Ticket
- **Plugins:** EventON (`_vir_after_rsvp`, `_vir_after_tix` yes/no), TEC (`_tribe_events_virtual_show_on_event`, `_tribe_events_virtual_ticket_email_link`)
- **Dateline takeaway:** `virtualAccess` enum = `public | rsvped | ticket_holder | logged_in`.

### 15.4 Meeting Provider
- **Plugins:** TEC (`_tribe_events_virtual_video_source`: zoom, google-meet, ms-teams, etc.), Eventin (`etn_zoom_event`, `etn_google_meet`)
- **Dateline takeaway:** `meetingProvider` enum = `zoom | google_meet | ms_teams | webex | custom`. Provider-specific config stored as typed JSON.

### 15.5 Embed vs. Link-Out
- **Plugins:** TEC (`_tribe_events_virtual_embed_video`, `_tribe_events_virtual_linked_button`)
- **Dateline takeaway:** boolean `virtualEmbed` + optional `virtualButtonText`.

---

## 16. Check-in / QR Code (P2)

### 16.1 Check-in Status
- **Plugins:** EventON-qrcode (`status` on `evo-rsvp` and `evo-tix`: check-in -> checked; refunded for tickets)
- **Dateline takeaway:** enum `CheckInStatus` = `pending | checked_in | refunded`.

### 16.2 QR Code Image URL
- **Plugins:** EventON-qrcode (`_qrimg_{rsvp_id}_{ri}` on `evo-rsvp`, `_qrimg_{ticket_number}_` on `evo-tix`)
- **Dateline takeaway:** QR codes generated at runtime from `checkInToken` (signed JWT on attendee record). No persistent image storage.

### 16.3 Check-in Page
- **Plugins:** EventON-qrcode (`eventon_checkin_page_id`, `evoqr_001` roles, `evoqr_mode`)
- **Dateline takeaway:** standalone check-in PWA route (`/checkin`). Role-based access via EmDash permissions.

---

## 17. Custom Fields

### 17.1 Admin-Defined Event Custom Fields
- **Plugins:** EventON (settings-driven `_evomdt_subheader_{n}` + free-form meta), TEC (`custom-fields` option array defines labels/types), Eventin (`attendee_extra_fields` serialized)
- **Dateline takeaway:** `customFields` array on event: `{ key, label, type, options?, required? }`. Types: text, textarea, url, email, number, radio, checkbox, dropdown, date.

### 17.2 Admin-Defined RSVP/Ticket Custom Fields
- **Plugins:** EventON (`evors_addf{n}` on RSVP global settings, `evors_addf{n}_1` on `evo-rsvp`), Eventin (`etn_attendee_extra_field_{slug}` dynamic key generation from label — error-prone)
- **Dateline takeaway:** `attendeeFields` array on event, same schema as `customFields`. Dynamic key generation is a footgun — use stable IDs.

---

## 18. Settings & Global Options

### 18.1 Plugin Settings Blob
- **Plugins:** EventON (`evcal_options_evcal_1`, `evcal_options_evcal_2`, ...), TEC (`tribe_events_calendar_options`), Eventin (`etn_event_options`)
- **Dateline takeaway:** avoid monolithic settings blobs. Use typed KV keys with plugin-scoped prefixes. `ctx.kv` is auto-scoped — no collision risk.

### 18.2 Email Template Overrides
- **Plugins:** EventON-rsvp (global: sender name/address, subject templates with `{rsvp-id}` placeholders), EventON-tickets (global ticket email settings)
- **Dateline takeaway:** per-event email overrides stored as `{ fromName, fromAddress, subjectTemplate, bodyTemplate }` on event. Global defaults in site settings.

### 18.3 Cron / Scheduled Tasks
- **Plugins:** EventON (`evo_cron_logs` option, digest scheduler), Eventin (webhook transient TTL 12hr)
- **Dateline takeaway:** use EmDash 0.8.x `cron` hook + `ctx.cron.schedule()`. Examples: RSVP digest, seat-hold expiry sweep, waitlist promotion.

---

## 19. P3 / No-Data-Model Plugins

These plugins reuse the event data model without adding fields:

| Plugin | What it adds |
|--------|-------------|
| eventon-slider | Frontend rendering only |
| eventon-full-cal | Frontend rendering (`evofc_heat` flag in options) |
| eventon-weekly-view | Frontend rendering only |
| eventon-csv-importer | CSV-to-meta mapping (no new schema) |
| eventon-wishlist-add-on | Likely user-meta or cookie storage; no event-level meta |

---

## 20. Cross-Cutting Schema Patterns

### 20.1 Serialized PHP Arrays
**Every plugin except TEC (modern CT1 path) uses PHP `serialize()` for complex data.**
- `ri_capacity`: serialized indexed array
- `evors_data`: serialized user-to-RSVP map
- `_evost_sections`: serialized seat map
- `_evovo_variation`: serialized variation rows
- `etn_event_schedule`: serialized schedule entries

**Dateline rule:** all structured data is typed JSON. No serialized blobs in KV or content store.

### 20.2 Denormalised Counters
- EventON stores `_rsvp_yes`, `_rsvp_no`, `_rsvp_maybe` on the event post.
- Eventin stores `etn_total_sold_tickets`.

**Dateline rule:** counters are computed from canonical source (RSVP/ticket tables) on read. KV can cache the result (short TTL, stamped with max(attendeeUpdatedAt)). Atomic inventory uses KV `inventory:{tierId}` with Lua-like atomicity from Workers KV.

### 20.3 Custom Table Avoidance
**None of the 14 plugins create custom tables** (except TEC CT1: `tec_events`, `tec_occurrences`, `tec_series_relationships`).

**Dateline rule:** KV for session/temporary state (holds, counts). Content store for canonical data. D1 is not accessible from EmDash plugins — use `ctx.content`.

### 20.4 Taxonomy as Link Table
EventON uses taxonomies (`event_location`, `event_organizer`) to model one-to-many relationships. Term meta lives in `options` table (`evo_et_taxonomy_{term_id}`), not WP term meta API.

**Dateline rule:** content references (e.g. `venueId`, `organizerIds[]`) on the event object. Reuse EmDash's content relation system.

---

## 21. Full Requirements Table (2+ P0 plugins)

| Field | P0 Plugins | Dateline Field | Type |
|-------|------------|----------------|------|
| Title | all 3 | `title` | string |
| Description | all 3 | `description` | PortableText |
| Event Status | all 3 | `status` | enum |
| Start Date/Time | all 3 | `startAt` | ISO-8601 UTC |
| End Date/Time | all 3 | `endAt` | ISO-8601 UTC |
| Timezone | all 3 | `timezone` | IANA string |
| All-Day | EventON, TEC | `isAllDay` | boolean |
| Location Name | all 3 | `location.name` | string |
| Location Address | all 3 | `location.address` | object |
| Location Lat/Lng | all 3 | `location.lat`, `location.lng` | float |
| Location Type | Eventin, TEC | `location.type` | enum |
| Organizer | all 3 | `organizers[]` | content ref |
| Event Category | all 3 | `categories[]` | taxonomy ref |
| Event Tag | all 3 | `tags[]` | taxonomy ref |
| Featured Image | all 3 | `featuredImage` | asset ref |
| External URL | all 3 | `externalUrl` | URL |
| Event Color | EventON, Eventin | `color` | hex string |
| Featured Flag | EventON, Eventin | `isFeatured` | boolean |
| Recurrence Enable | all 3 | `isRecurring` | boolean |
| Recurrence Rules | all 3 | `recurrenceRule` | RRULE string |
| Ticket Enable | EventON, Eventin | `hasTickets` | boolean |
| Ticket Price | all 3 | `price` | int (cents) |
| Inventory / Capacity | EventON, Eventin | `capacity` | int |
| RSVP Enable | EventON, Eventin | `hasRsvp` | boolean |
| RSVP Capacity | EventON, Eventin | `rsvpCapacity` | int |
| RSVP Status | EventON, Eventin | `rsvpStatus` | enum |
| Attendee Name | EventON, Eventin | `firstName`, `lastName` | string |
| Attendee Email | EventON, Eventin | `email` | string |
| Attendee Phone | EventON, Eventin | `phone` | string |
| Check-in Status | EventON, Eventin | `checkInStatus` | enum |
| Virtual URL | EventON, TEC, Eventin | `virtualUrl` | URL |
| Virtual Gating | EventON, TEC | `virtualAccess` | enum |
| Custom Event Fields | all 3 | `customFields[]` | typed array |

**Total fields meeting "2+ P0" threshold: 34.**

---

## 22. Dateline Data Model (Proposed)

```typescript
// Event content type (stored in ctx.content)
interface Event {
  id: string;
  title: string;
  description: PortableTextBlock[];
  status: 'draft' | 'published' | 'cancelled' | 'rescheduled' | 'postponed' | 'completed';
  isFeatured: boolean;
  locale: string; // IETF BCP 47

  startAt: string; // ISO-8601 UTC
  endAt: string;   // ISO-8601 UTC
  timezone: string; // IANA tzid
  isAllDay: boolean;
  hideEndTime: boolean;

  location: {
    name: string;
    type: 'physical' | 'virtual' | 'hybrid';
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    lat?: number;
    lng?: number;
    showMap: boolean;
  };

  organizers: string[]; // content IDs
  categories: string[]; // taxonomy IDs
  tags: string[];       // taxonomy IDs

  color?: string;
  featuredImage?: string; // asset ID
  images?: string[];      // asset IDs
  subtitle?: string;

  externalUrl?: string;
  externalUrlTarget?: '_blank' | '_self';

  isRecurring: boolean;
  recurrenceRule?: string; // RFC-5545 RRULE
  showSeries: boolean;

  hasTickets: boolean;
  hasRsvp: boolean;
  isInviteOnly: boolean;
  hasWaitlist: boolean;

  virtualUrl?: string;
  virtualPassword?: string; // secret type
  virtualAccess: 'public' | 'rsvped' | 'ticket_holder' | 'logged_in';
  meetingProvider?: 'zoom' | 'google_meet' | 'ms_teams' | 'webex' | 'custom';

  customFields: CustomField[];
  attendeeFields: CustomField[];
  rsvpCapacity?: number;
  maxRsvpsPerUser?: number;
  rsvpCloseAt?: string;

  // Ticket tiers (defined on event, stored inline)
  ticketTiers?: TicketTier[];
}

interface TicketTier {
  id: string;
  name: string;
  price: number; // cents
  minPrice?: number; // for name-your-price
  capacity: number;
  isOnePerCustomer: boolean;
  salesCloseAt?: string;
  showRemaining: boolean;
  remainingThreshold?: number;

  // Variations
  variationTypes?: VariationType[];
  variantTiers?: VariantTier[];
  addOns?: AddOn[];
}

interface VariationType {
  id: string;
  name: string;
  options: string[];
}

interface VariantTier {
  id: string;
  variantSelections: Record<string, string>; // { typeId -> optionValue }
  price: number;
  capacity?: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  capacity?: number;
  soldStyle: 'toggle' | 'quantity';
}

interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'email' | 'number' | 'radio' | 'checkbox' | 'dropdown' | 'date';
  options?: string[];
  required?: boolean;
}

// RSVP / Attendee (separate content type)
interface Attendee {
  id: string;
  eventId: string;
  occurrenceId?: string; // for recurring instances

  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  rsvpStatus: 'yes' | 'no' | 'maybe' | 'waitlist' | 'invited';
  guestCount: number;
  notes?: string;
  wantsUpdates: boolean;

  // Ticket fields (if hasTickets)
  ticketTierId?: string;
  seatSlug?: string;
  purchaseSnapshot?: {
    tierId: string;
    variantSelections: Record<string, string>;
    addOns: Record<string, number>; // { addonId -> qty }
    basePrice: number;
  };

  checkInStatus: 'pending' | 'checked_in' | 'refunded';
  checkInToken?: string; // signed JWT for QR
  inviteToken?: string;  // signed JWT for private events
}
```

---

## 23. Anomalies & Typos to Avoid

| Source Plugin | Typo | Dateline Correction |
|---------------|------|---------------------|
| Eventin | `etn_total_avaiilable_tickets` (double-i) | `capacity` |
| Eventin | `etn_attendeee_ticket_status` (triple-e) | `checkInStatus` |
| Eventin | `etn_rsvp_miminum_attendee_to_start` | `minAttendeesToStart` |
| Eventin | Dynamic attendee field keys from label | Stable UUID keys |
| EventON | `_evors_whoscoming_after` vs `_evors_whoscoming_after` (conflicting keys) | `showAttendeeList` enum |
| EventON | `evors_notfiemailto` (missing 'c') | `notificationEmail` |
| EventON-tickets | `_tx_subtiltle_text` (triple-l) | `ticketSubtitle` |
| EventON-seats | `_evost_expiration` global option blob | KV-per-cart holds |

---

## 24. License Reminder

This document was authored via clean-room analysis of 14 GPL-licensed WordPress plugins. No PHP source code was copied. Identifiers, field names, and data structures were independently derived from the semantic patterns observed across all sources. The Dateline TypeScript interfaces above are original work.
