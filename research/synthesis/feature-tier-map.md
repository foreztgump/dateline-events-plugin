# Feature Tier Map

Generated from Phase 2 research (`03-features.md` + `04-admin-ux.md` + `05-frontend-ux.md`) across 15 plugins.

**Tiering rule:**
- **MVP** — feature observed in ≥2 P0 plugins (eventon, events-calendar-pro, eventin-pro)
- **v0.2** — feature observed in ≥1 P0 plugin but <2 (or supported only by add-ons)
- **v0.3+** — feature observed only in P1/P2/P3 add-ons with <1 P0 native support

---

## MVP Features (≥2 P0 plugins)

### Core Event Data
| Feature | P0 Evidence |
|---------|-------------|
| Event title, slug, status (draft/published) | eventon, ECP, eventin-pro |
| Event start/end date + time | eventon, ECP, eventin-pro |
| All-day toggle | eventon, ECP |
| IANA timezone per event | eventon, eventin-pro |
| Event description / excerpt / body | eventon, ECP, eventin-pro |
| Featured image / event banner | eventon, ECP, eventin-pro |
| Event categories / type taxonomy | eventon, ECP, eventin-pro |
| Event tags | eventon, ECP |
| Event status: Cancelled / Rescheduled / Postponed / Moved Online | eventon, ECP |
| Event visibility: Featured, Exclude from listings, Logged-in-only | eventon, ECP |
| Event colors per event | eventon, ECP |
| Language variation per event | eventon |
| External link / event website URL | eventon, ECP |

### Location & Organizers
| Feature | P0 Evidence |
|---------|-------------|
| Venue / Location: name, address, city, state, zip, country, lat/lon | eventon, ECP, eventin-pro |
| Organizer / Speaker: name, bio, social links | eventon, ECP, eventin-pro |
| Google Maps embed on event card + venue page | eventon, ECP, eventin-pro |
| Multiple location support | eventin-pro |
| Online / physical / hybrid location type | eventin-pro |

### Recurring Events
| Feature | P0 Evidence |
|---------|-------------|
| Recurrence rule builder (daily, weekly, monthly, yearly, custom) | eventon, ECP, eventin-pro |
| Recurrence interval / gap | eventon, ECP, eventin-pro |
| Day-of-week selection | eventon, ECP |
| Day-of-month vs day-of-week-of-month | eventon, ECP |
| EXDATE / exception date exclusion | ECP |
| End conditions: never, after N occurrences, on date | eventon, ECP |
| Child/parent event relationship | eventin-pro |
| Recurring event shortcode display | eventon, eventin-pro |

### Custom Fields & Taxonomies
| Feature | P0 Evidence |
|---------|-------------|
| Custom meta / extra fields (text, textarea, URL, dropdown, radio, checkbox) | eventon, ECP, eventin-pro |
| Taxonomy color coding | eventon, ECP |
| Configurable taxonomy labels | eventon |
| Customizable singular/plural event labels | eventon |

### Calendar Display Views
| Feature | P0 Evidence |
|---------|-------------|
| Month grid calendar view | eventon (accordion), ECP, eventin-pro |
| List / agenda view | eventon, ECP, eventin-pro |
| Day view | ECP |
| Photo view (image-dominant grid) | ECP |
| Map view (geographic scatter) | ECP |
| Summary / dense chronological view | ECP |
| Week view grid (7-column hourly) | ECP |
| Heat map / event density coloring | eventon (full-cal add-on) |

### Event Detail / Single Page
| Feature | P0 Evidence |
|---------|-------------|
| Single event page template | eventon, ECP, eventin-pro |
| EventTop / event card with title, date, location chips | eventon, ECP |
| EventCard expanded view with configurable sections | eventon |
| Schema.org JSON-LD structured data | eventon, ECP |
| Facebook Open Graph meta tags | eventon |

### Navigation, Search & Filtering
| Feature | P0 Evidence |
|---------|-------------|
| Keyword search | eventon, ECP, eventin-pro |
| Event type / category filter | eventon, ECP, eventin-pro |
| Past events filter | eventon, ECP |
| Featured events filter | eventon, ECP |
| Previous / Next month navigation | eventon, ECP |
| Month / date jumper dropdown | eventon, ECP |
| Number of months display | eventon |
| Show upcoming count (N events regardless of month) | eventon |
| Show limit with "View more" | eventon |
| Fixed month/year | eventon |
| Hide empty months | eventon, eventin-pro |
| View switcher (List / Grid / Month / Week tabs) | eventon, ECP, eventin-pro |
| Tribe Bar / search bar with live filter chips | ECP |

### Social & Communication
| Feature | P0 Evidence |
|---------|-------------|
| Add to calendar (iCal, Google, Outlook, Apple) | eventon, ECP, eventin-pro |
| Social share buttons | eventon, ECP |

### Admin & Settings
| Feature | P0 Evidence |
|---------|-------------|
| Events CPT list table with taxonomy/date filters | eventon, ECP, eventin-pro |
| New/Edit event admin screen with metaboxes | eventon, ECP, eventin-pro |
| Admin settings framework (multi-tab settings) | eventon, ECP, eventin-pro |
| Welcome/getting started screens | eventon, ECP |
| Bulk edit / quick edit | eventon, ECP, eventin-pro |
| Duplicate / Clone event | eventon, eventin-pro |
| Shortcode builder / generator | eventon, ECP, eventin-pro |

### Widgets, Embeds & Page Builders
| Feature | P0 Evidence |
|---------|-------------|
| Gutenberg blocks | eventon, ECP, eventin-pro |
| Elementor widgets | eventon, ECP, eventin-pro |
| Other page builder integrations (Beaver, Avada, Brizy, SiteOrigin) | ECP |
| Calendar embed (iframe) | ECP |
| Shortcodes for list, grid, single event, search, tabs, slider | eventon, ECP, eventin-pro |
| Sidebar widget | eventon, ECP |

### Virtual Events
| Feature | P0 Evidence |
|---------|-------------|
| Zoom integration (meeting creation + virtual event) | eventon, ECP, eventin-pro |
| Google Meet integration | ECP, eventin-pro |
| Virtual event link embed | ECP, eventin-pro |
| Per-event virtual event toggle | eventon, ECP, eventin-pro |

### i18n & Localization
| Feature | P0 Evidence |
|---------|-------------|
| Frontend string overrides per language | eventon |
| Text domain loading | eventon, eventin-pro |
| RTL layout support | eventon |

### REST API & Webhooks
| Feature | P0 Evidence |
|---------|-------------|
| REST endpoint for calendar data | eventon |
| Outgoing webhooks on event triggers | eventon, eventin-pro |

---

## v0.2 Features (1 P0 plugin evidence)

### Calendar Views (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Week view (7-column grid) | ECP (native), eventon (weekly-view add-on) |
| Live "Now" / happening-now view | eventon (`[add_eventon_now]`) |
| Schedule / timeline view | eventon (`[add_eventon_sv]`) |
| Countdown timer / widget | ECP, eventin-pro |

### Organizer & Venue Deep Features
| Feature | P0 Evidence |
|---------|-------------|
| Venue archive page with upcoming events | ECP |
| Organizer archive page with upcoming events | ECP |
| Venue widget | ECP |
| Featured venue widget | ECP |
| Geocoding via Google Maps Geocoding API | ECP |
| Geofence radius search | ECP, eventin-pro |

### Event Options (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Sticky / pinned event in month view | ECP |
| Hide from listings | eventon, ECP |
| Completed event marker | eventon |
| Comments on single event | ECP |
| Multi-day event display (spanning cells) | ECP |

### SEO
| Feature | P0 Evidence |
|---------|-------------|
| Yoast SEO sitemap customization (recurring instances) | ECP |
| Calendar caching via transients | ECP |
| Recurring instance materialization | ECP |

### RSVP (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| RSVP form: Going / Not Going | eventin-pro |
| RSVP limit per event | eventin-pro |
| RSVP minimum threshold | eventin-pro |
| Simple vs advanced RSVP form types | eventin-pro |

### Ticketing (single P0 or add-on bridge)
| Feature | P0 Evidence |
|---------|-------------|
| Ticket selling with WooCommerce | eventin-pro (native), eventon (via add-on) |
| Multiple ticket tiers per event | eventin-pro |
| Ticket inventory / stock management | eventin-pro |
| Per-occurrence ticket capacity | eventon (ticket add-on) |
| Name-your-price tickets | eventon (ticket add-on), eventin-pro |
| Sold-out display with "next available occurrence" | eventon (ticket add-on) |
| Stop-selling N minutes before event | eventon (ticket add-on) |
| Inquiry form per event | eventon (ticket add-on) |
| Ticket confirmation email | eventon (ticket add-on), eventin-pro |
| Attendee name/email per ticket | eventon (ticket add-on), eventin-pro |
| Ticket holder management (name, email, check-in status) | eventon (ticket add-on), eventin-pro |
| Manual resend confirmation email | eventon (ticket add-on) |
| WC My Account "My Tickets" tab | eventon (ticket add-on), eventin-pro |
| Sales insight / revenue panel | eventon (ticket add-on) |

### Attendee / Check-in (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| QR code generation for tickets | eventin-pro |
| QR check-in with scanner | eventin-pro |
| Attendee list with CSV export | eventin-pro |
| Attendee check-in status management | eventin-pro |

### Seat Selection (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Seat map editor (drag-and-drop) | eventon (seats add-on) |
| Frontend seat picker (interactive canvas) | eventon (seats add-on) |
| Seat hold / cart session expiry | eventon (seats add-on) |
| Seat types: assigned, unassigned area, booth | eventon (seats add-on) |
| Pan/zoom on seat map | eventon (seats add-on) |

### Ticket Variations (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Variation type axes (e.g., Section, Size) | eventon (variations add-on) |
| Cartesian matrix pricing | eventon (variations add-on) |
| Additive price options | eventon (variations add-on) |
| Real-time client-side price calculation | eventon (variations add-on) |
| Seat / booking integration with variations | eventon (variations add-on) |

### Waitlist (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Auto-redirect to waitlist when capacity reached | eventon (waitlist add-on) |
| FIFO space offer on cancellation | eventon (waitlist add-on) |
| Party-size-aware waitlist matching | eventon (waitlist add-on) |
| Self-removal from waitlist | eventon (waitlist add-on) |
| Waitlist badge in event card | eventon (waitlist add-on) |

### Invite-only RSVP (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Token-based invitation URLs | eventon (invitees add-on) |
| Invitee-only RSVP gate | eventon (invitees add-on) |
| Invitation email with pre-filled form | eventon (invitees add-on) |
| Attendance stats per invitee | eventon (invitees add-on) |
| Private / public message wall | eventon (invitees add-on) |

### Virtual Event Advanced (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Microsoft Teams OAuth | ECP |
| Webex OAuth (bundled with Teams) | ECP |
| YouTube Live embed (Channel ID) | ECP |
| Facebook Live embed (Page/Group) | ECP |
| Auto-detect meeting provider from URL | ECP |
| Conditional content visibility (everyone/logged-in/ticket holders/timing) | ECP |

### Frontend / Community (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Frontend event submission dashboard | ECP (Community Events), eventin-pro (React SPA) |
| Frontend Dashboard: My Events, My Tickets, My RSVPs | eventin-pro |
| Multi-vendor event creation (Dokan) | eventin-pro |
| BuddyBoss group integration | eventin-pro |

### Builder / Template (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Elementor widget library (21 widgets) | eventin-pro |
| Certificate template builder (Gutenberg block-based) | eventin-pro |
| Ticket template builder | eventin-pro |
| Template preview mode | eventin-pro |

### Communication / Email (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Email templates: confirmation, notification, digest, custom | eventon (RSVP add-on), eventin-pro |
| Daily digest email per event | eventon (RSVP add-on) |
| Custom notification emails per RSVP | eventon (RSVP add-on) |

### Advanced Settings (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| Custom CSS injection | eventon, eventin-pro |
| Google Fonts loading | eventon |
| Visual Designer (point-and-click color/font) | eventon |
| Dynamic CSS generation from settings | eventon |
| Featured image height control | eventon |
| Google Map style customization | eventon |

### API & Infrastructure (single P0)
| Feature | P0 Evidence |
|---------|-------------|
| REST API for RSVPs, invitations, webhooks | eventin-pro |
| Webhook system with topic-based delivery | eventon, eventin-pro |
| Role-based permission manager | eventin-pro |
| REST API key management | eventin-pro |
| License activation (EDD SL) | eventin-pro |
| Dashboard stats widget | eventin-pro |

---

## v0.3+ Features (<1 P0 plugin — P1–P3 add-ons only)

### UI & Display Enhancements
| Feature | Add-on Evidence |
|---------|-----------------|
| Event slider / horizontal carousel | eventon-slider (P3), eventin-pro (shortcode) |
| Wishlist / bookmarks (heart toggle, wishlist manager page) | eventon-wishlist (P3) |
| Heat map coloring on month grid | eventon-full-cal (P2) |
| Full-bleed image backgrounds | eventon-slider (P3) |
| Autoplay with pause-on-hover | eventon-slider (P3) |
| EventTop style variations (5+) | eventon (core settings) |
| EventTop progress bar / "Live Now" blinking icon | eventon (core settings) |
| EventTop date style variations | eventon (core settings) |
| Hide end time option | eventon (core settings) |
| Virtual visible end time | eventon (core settings) |
| EventTop tags display | eventon (core settings) |
| Event type colour override | eventon (core settings) |
| "View in my time" (visitor timezone localization) | eventon (core settings) |
| Tabbed calendar (multiple calendars in tabs) | eventon (core shortcode) |
| Single event embed (`[add_single_eventon]`) | eventon (core shortcode) |
| Event anywhere / sidebar mini-display | eventon (core shortcode) |
| Event list without calendar (`[add_eventon_list]`) | eventon (core shortcode) |
| "Anywhere" minimal event display | eventon (core shortcode) |
| Separate months visual separator | eventon (core settings) |
| Hide month headers | eventon (core settings) |
| RTL layout | eventon (core settings) |
| Custom month name format | eventon (core settings) |
| Accordion calendar (month expand/collapse) | eventon (core settings) |
| Tile/Grid layout on event list | eventon (core shortcode) |

### Calendar Advanced
| Feature | Add-on Evidence |
|---------|-----------------|
| Full Calendar grid (FullCalendar.js month grid) | eventon-full-cal (P2) |
| Lightbox event list on day click | eventon-full-cal (P2) |
| Side-by-side layout (grid + list) | eventon-full-cal (P2) |
| Week view (7-column day grid, AJAX navigation) | eventon-weekly-view (P2) |
| Week picker dropdown with 101 ranges | eventon-weekly-view (P2) |
| Fixed day / increment navigation | eventon-full-cal (P2) |
| Full month load vs lazy per-day | eventon-full-cal (P2) |

### RSVP Advanced (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| RSVP via event card lightbox or inline | eventon-rsvp (P1) |
| Yes / No / Maybe RSVP choices | eventon-rsvp (P1) |
| Per-event RSVP capacity with sync | eventon-rsvp (P1) |
| Per-repeat-instance RSVP capacity | eventon-rsvp (P1) |
| Additional form fields (up to 5 configurable) | eventon-rsvp (P1) |
| File upload in RSVP form | eventon-rsvp (P1) |
| Party size / guest count | eventon-rsvp (P1) |
| Update existing RSVP (pre-populated form) | eventon-rsvp (P1) |
| Guest list display on event card (initials / names) | eventon-rsvp (P1) |
| One-click RSVP from event top (logged-in users) | eventon-rsvp (P1) |
| RSVP close timing before event | eventon-rsvp (P1) |
| RSVP Manager shortcode (user's own RSVPs) | eventon-rsvp (P1) |
| Logged-in-only RSVP restriction | eventon-rsvp (P1) |
| Auto-create WordPress account on RSVP | eventon-rsvp (P1) |
| Capacity sync button (force recount) | eventon-rsvp (P1) |
| CSV export of RSVP guest list | eventon-rsvp (P1) |

### Check-in & QR (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| QR code generation via external API (qrserver.com) | eventon-qrcode (P3) |
| QR embedded in RSVP confirmation email | eventon-qrcode (P3) |
| QR embedded in ticket purchase email | eventon-qrcode (P3) |
| Dedicated check-in page with role gate | eventon-qrcode (P3) |
| Scanner gun mode (auto-focus input) | eventon-qrcode (P3) |
| Un-check / revert check-in | eventon-qrcode (P3) |
| Check-in REST API (4 endpoints) | eventon-qrcode (P3) |
| Media isolation (random filenames in hidden folder) | eventon-qrcode (P3) |

### Seat Advanced (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| Seat map JSON import/export | eventon-seats (P1) |
| Duplicate section with offset | eventon-seats (P1) |
| Seat section types: assigned, unassigned, booth, area-of-interest | eventon-seats (P1) |
| Row-level price override | eventon-seats (P1) |
| Individual seat price override | eventon-seats (P1) |
| Handicap accessible seat flag | eventon-seats (P1) |
| Seat status: available, tuav (in cart), uav (sold), selected, mine | eventon-seats (P1) |
| Seat legend panel | eventon-seats (P1) |
| One-click add-to-cart | eventon-seats (P1) |
| Cart hold timer reset on every add | eventon-seats (P1) |
| WC product stock sync on map save | eventon-seats (P1) |

### Variations Advanced (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| "Sell as separate tickets" mode (single variation type) | eventon-variations (P1) |
| Quantity adjuster per variation value | eventon-variations (P1) |
| Sold style: individually vs multiples | eventon-variations (P1) |
| Hide sold-out variations/options | eventon-variations (P1) |
| Logged-in-only purchase restriction | eventon-variations (P1) |
| Seat/B booking integration (variation scoped to parent) | eventon-variations (P1) |

### Wishlist / Social (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| Heart toggle on event cards | eventon-wishlist (P3) |
| AJAX add/remove without reload | eventon-wishlist (P3) |
| Wishlist manager page filtered to saved events | eventon-wishlist (P3) |
| Wishlist count per event in admin table | eventon-wishlist (P3) |
| Anonymous wishlist (session) → merge on sign-in | eventon-wishlist (P3) |
| Icon pickers (selected vs unselected) | eventon-wishlist (P3) |

### CSV & Import (add-on only)
| Feature | Add-on Evidence |
|---------|-----------------|
| CSV upload with 30+ mapped columns | eventon-csv-importer (P2) |
| Upsert by event_id | eventon-csv-importer (P2) |
| Taxonomy auto-creation on import | eventon-csv-importer (P2) |
| Image sideloading from remote URL | eventon-csv-importer (P2) |
| Repeat rule computation from CSV | eventon-csv-importer (P2) |
| Custom meta field import | eventon-csv-importer (P2) |
| Chunked AJAX processing for large imports | eventon-csv-importer (P2) |
| No preview / dry-run step | eventon-csv-importer (P2) |

---

## Cross-Tier Feature Matrix

### Registration & Ticketing (all tiers)
| Feature | Tier | Evidence |
|---------|------|----------|
| Basic RSVP (Going/Not Going) | v0.2 | eventin-pro |
| Full RSVP with yes/no/maybe + form | v0.3+ | eventon-rsvp (P1) |
| RSVP with capacity + sync | v0.3+ | eventon-rsvp (P1) |
| RSVP waitlist | v0.3+ | eventon-rsvp-waitlist (P2) |
| Invite-only RSVP | v0.3+ | eventon-rsvp-invitees (P2) |
| Basic ticket selling | v0.2 | eventin-pro |
| Ticket with WooCommerce | v0.2 | eventin-pro, eventon (P1 add-on) |
| Ticket with Stripe/PayPal direct | v0.3+ | eventin-pro |
| Multiple ticket tiers | v0.3+ | eventin-pro |
| Ticket variations (size/color/options) | v0.3+ | eventon-variations (P1) |
| Seat selection / seat map | v0.3+ | eventon-seats (P1) |
| QR code check-in | v0.3+ | eventon-qrcode (P3) |
| Name-your-price | v0.2 | eventin-pro, eventon (P1) |
| Deposit payments | v0.3+ | eventin-pro |

### Display & Views (all tiers)
| Feature | Tier | Evidence |
|---------|------|----------|
| Accordion month calendar | MVP | eventon |
| Full month grid | MVP | ECP, eventin-pro |
| List / agenda view | MVP | all 3 P0 |
| Day view | MVP | ECP |
| Week view (7-column) | v0.2 | ECP |
| Photo view (image-dominant) | v0.2 | ECP |
| Map view (geographic) | v0.2 | ECP |
| Summary view (dense text) | v0.2 | ECP |
| Slider / carousel | v0.3+ | eventon-slider (P3), eventin-pro |
| Heat map on grid | v0.3+ | eventon-full-cal (P2) |
| "Now" / live events | v0.2 | eventon |
| Schedule / timeline | v0.2 | eventon |
| Countdown widget | v0.2 | ECP, eventin-pro |
| Full Calendar grid (standalone) | v0.3+ | eventon-full-cal (P2) |
| Weekly view grid (standalone) | v0.3+ | eventon-weekly-view (P2) |

### Attendee & Check-in (all tiers)
| Feature | Tier | Evidence |
|---------|------|----------|
| Attendee list | v0.2 | eventin-pro |
| Attendee CSV export | v0.2 | eventin-pro |
| Attendee check-in status | v0.2 | eventin-pro |
| QR code generation | v0.3+ | eventon-qrcode (P3) |
| QR scanner interface | v0.3+ | eventon-qrcode (P3) |
| QR in confirmation email | v0.3+ | eventon-qrcode (P3) |
| REST API check-in endpoints | v0.3+ | eventon-qrcode (P3) |
| Check-in role gating | v0.3+ | eventon-qrcode (P3) |

---

## Tier Summary

| Tier | Count (approx) | Description |
|------|----------------|-------------|
| **MVP** | ~75 features | Universal across 2+ P0 plugins: core event CRUD, multiple calendar views, location/organizer, recurring, custom fields, search/filter, shortcodes, builder integrations, Zoom virtual events, iCal export |
| **v0.2** | ~70 features | Supported by 1 P0 plugin or add-on: week view, advanced virtual providers (Meet/Teams/YouTube), ticketing, RSVP, seating, variations, waitlist, invite-only, deposit payments, permissions, frontend dashboard, template builder |
| **v0.3+** | ~60 features | Add-on only or thin P0 evidence: slider, wishlist, full-cal/week-view standalone, heat map, QR code scanner, CSV importer, visual designer, eventTop customizations, tabbed calendars |

## Strategic Observations

1. **MVP is well-defined**: the three P0 plugins converge heavily on core event data, month/list views, and recurring events. This is the uncontroversial baseline.

2. **Ticketing/RSVP fragmentation**: No P0 plugin does both ticketing and RSVP natively without add-ons (eventon requires add-ons; eventin-pro does both natively but with WooCommerce dependency). This is a Dateline opportunity: unified registration model.

3. **Virtual events as MVP**: All three P0 plugins support Zoom natively. Google Meet and Teams appear in v0.2. YouTube/Facebook Live in v0.3+.

4. **Seat selection is add-on only**: Only eventon's `eventon-seats` + eventin-pro's Seat Plan tab provide evidence. Seat maps are complex (canvas editor, hold timers, stock sync). Viable as v0.2 (eventin-pro evidence) but seat map editor is v0.3+ (add-on only).

5. **Wishlist is P3-only**: Only eventon-wishlist + Eventin's location listing. Very low priority.

6. **Frontend dashboard is v0.2**: eventin-pro has the most mature evidence (React SPA with My Events, My Tickets, My RSVPs). ECP's Community Events and eventon's ActionUser are secondary.

7. **AI is v0.3+**: Only eventin-pro has AI generation (and as a separate plugin dependency). This is a clear Dateline differentiator for a later release.
