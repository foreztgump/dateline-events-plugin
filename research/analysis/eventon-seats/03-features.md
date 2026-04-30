---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON Seats — Features

## Admin Seat-Map Editor

The editor is triggered from within the eventon-tickets event metabox by clicking "Seat Map Editor" which opens a lightbox. It is available only for simple-product events with no repeat instances.

**Enabling seating:** A yes/no toggle (`_enable_seat_chart`) on the event edit page switches seating on. A second toggle enables one-click add-to-cart (`_allow_direct_add`).

**Editor lightbox content** (loaded via `evost_editor_content` AJAX): The lightbox renders an interactive drag-and-drop canvas using Handlebars templates and custom JS. The admin can:

- **Create sections** with a form: section name, letter index, section type (`def` = assigned seating, `una` = unassigned capacity area, `boo` = booth, `aoi` = area-of-interest decorative element), background color, font color, border, alignment, seat shape, icon, shape, capacity (for non-seat types), default price.
- **Create rows** within assigned sections: row letter, number of seats, row-level price override.
- **Create individual seats** within rows: seat number label, price, status (available/unavailable), handicap flag.
- **Drag sections** to canvas positions; bulk position save via `evost_editor_save_changes` AJAX.
- **Edit or delete** any section, row, or seat via inline form lightboxes.
- **Duplicate sections**: copies all rows and seats, offsets canvas position by 100px, appends " (copy)" to the name, resets all seat statuses to available.
- **Configure seat map settings**: background image upload, map area size (CSS class), seat size (CSS class), lightbox mode for the frontend picker.
- **Upload a seat map** from a JSON file (replaces existing data).
- **Clear the seat map** entirely.
- **Make all seats available** (bulk restock, useful after test orders).
- **View attendees** in the editor: attendee list is loaded alongside the seat map.

The editor also updates the WooCommerce product's managed-stock quantity to match the count of available seats after every save.

## Frontend Seat Picker

The frontend seat picker appears on the event card (inline or as a "Find Seats" lightbox button, depending on settings). It is rendered after EventON's standard ticket section via the `evotx_single_product_temp` filter.

**Initial load:** On page load the seat picker HTML skeleton is injected (a loading animation placeholder and empty containers). A JS call to `evost_get_seats_data` AJAX fetches the seat map JSON, cart state, and settings, then the Handlebars templates render the interactive seat canvas.

**Seat canvas interaction:**
- Seats are displayed as coloured spans. Hovering shows a tooltip with section/row/seat label and price (or availability count for unassigned areas).
- Status colours: available (default), `tuav` (temporarily unavailable — in someone's cart), `uav` (sold out), `selected` (user's current selection), `mine` (already in user's cart), `res` (reserved), `hand` (handicap accessible).
- Pan and zoom are provided by panzoom.js (bundled in assets/).
- Seat legends and zoom/reset controls are rendered from the `evost_seat_selection` view.

**Selecting a seat:** Clicking an available seat calls `evost_seat_cart_preview` AJAX, which returns a preview popup with seat info (section, row, seat number or section name for unassigned), price, quantity selector (only for unassigned/booth), and an Add to Cart button.

**One-click add:** If `_allow_direct_add` is enabled, clicking a seat calls `evost_seat_direct_add_cart` AJAX directly, skipping the preview step.

**Session timeout display:** A configurable timeout message is shown below the map (e.g., "Seats added to cart will expire in [time] minutes of inactivity in cart"). The timer is also shown on the WC cart and checkout pages via `woocommerce_before_cart` / `woocommerce_before_checkout_form`.

## Seat-Hold / Session Expiry

The hold mechanism is implemented entirely in `EVOST_Expirations` (which extends `EVOST_Seats`).

**Adding a hold:** When a ticket with a seat is successfully added to the WC cart (via `evotx_after_ticket_added_to_cart` hook), `add_seat_temphold()` is called. It:
1. Records `[event_id][seat_slug][cart_item_key] = {time: expiry_unix_ts, qty: qty}` in the `_evost_expiration` option.
2. For assigned seats: sets seat status to `tuav` (temporarily unavailable) in the postmeta.
3. For unassigned seats: increments the section's `sold` counter by the quantity.
4. Resets the expiry timer on all other seats already in the user's cart (keeping the timer consistent).

**Expiry duration:** Configurable via the `evost_session_time` option (minutes). Default is 10 minutes. The expiry timestamp is `time() + (minutes * 60)`.

**Checking expiry:** `run_all_seat_expiration_check()` is called every time `__j_get_all_sections()` builds the seat map JSON (i.e., on every seat map load and every AJAX refresh). For each held seat it checks:
- If the seat is `tuav` but has no expiration record: make it available (data inconsistency cleanup).
- If the hold has expired: mark seat as available, remove item from WC cart, show WC notice "Seat removed from cart, time expired!".
- If the seat is `av` but still has an expiration record: remove expiration record (cleanup).

**Cart validation:** On every WC cart/checkout page render, `evotix_cart_item_validation` fires `cart_validation()`, which re-checks seat availability and expiry for every seat in the cart. If expired, removes item and calls `restock_temphold_seat()`.

**Releasing a hold:** When an item is removed from cart (`evotx_cart_ticket_removed`), `restock_temphold_seat()` is called: deletes the expiration record and marks the seat as available (for assigned seats) or decrements `sold` (for unassigned).

**Cart timer reset:** Every time a new seat is added to the cart, the expiry timer for **all** seats already in the cart is reset to a fresh duration via `reset_all_cart_seat_expirations()`. This implements the "inactivity" rather than "fixed window" model.

**UX on expiry:** WC notices are used to communicate expiry ("Seat removed from cart, time expired!"). No custom page redirect occurs. The seat map is refreshed client-side to reflect the freed seat.

## Ticket Integration

Integration with eventon-tickets is handled entirely via hooks (no direct dependency coupling). The `evost_tickets` class intercepts the evotx lifecycle:

- **Pre-add-to-cart:** Verifies seat availability before allowing the cart add (`evotx_add_ticket_to_cart_before`).
- **Cart item data:** Attaches `evost_data` (slug, number, type) and `_evost_seat_price` to the WC cart item (`evotx_add_cart_item_meta`). The seat price overrides the base ticket price via `evotx_ticket_item_price_for_cart`.
- **Cart display:** Appends seat info HTML (Section/Row/Seat labels) to the cart item name. For unassigned seats, shows section name and quantity selector with an upper bound of available capacity.
- **Order creation:** At checkout, writes `Seat-Number`, `_evost_seat_slug`, and `_seat_type` to WC order line-item meta and to the `evo-tix` CPT post.
- **Stock adjustment:** On order status transitions (complete, cancel, refund), `adjust_ticket_item_stock()` sets the seat to sold (`uav`) or restocks it (`av`). For unassigned seats, only restocking is managed here (the initial reduction happens at cart-add time).
- **Attendee enrichment:** Adds `seat_type`, `seat_number`, and `seat_slug` to the attendee data array returned by `evotx_get_attendees_for_event`.
- **Confirmation email:** Appends a formatted seat block (Section, Row, Seat number and letter labels) to the ticket confirmation email body.

## QR Code Integration

The `EVO_Seats_QR` class hooks into the optional EventON QR code addon via `evoqr_data_output`. When a ticket has a seat number stored in its `evo-tix` postmeta, the hook appends two fields to the QR code's `otherdata` payload:
- `Seat-Number`: the raw seat number value.
- `Seat-Info`: a formatted human-readable string showing Section letter (with name in parentheses if available), Row letter, and Seat number.

This is only active when the QR code addon is present and its `evoqr_data_output` hook fires.

## i18n Feature Taxonomy

All strings use text domain `evost`. Localization is loaded only in admin context (`is_admin()`). Language file: `lang/evost.pot` (POT available; MO compiled).

| Group | Representative strings |
|---|---|
| Editor UI (admin) | "Enable Event Seating for this event", "Set up Seat Map in the editor below", "Seat Map Editor", "Configure Seat Map", "Enable one-click adding seats direct to cart" |
| Picker UI (frontend) | "Seat Legends", "Reset Map", "SEC", "ROW", "SEAT", "Section", "Row", "Seat", "Regular Seat", "Unassigned Seating", "Booth", "Find Seats", "Preview Seat", "Hover over a seat to see the pricing information" |
| Hold / Session messages | "Your Tickets In Cart", "Your seats will expire in", "Seats added to cart will expire in [time] minutes of inactivity in cart.", "Seat removed from cart, time expired!", "UNA Seat removed from cart, time expired!" |
| Status / Availability labels | "Unavailable (Sold Out)", "In someone's cart", "Seats in your cart", "Available", "Unavailable", "Your selected seats", "Reserved", "Handicap Accessible", "Seats available", "Seats not available", "Booth Still Available", "Booth Not Available" |
| Errors / Validation | "Seat not available at the moment", "Cannot add unassigned seats direct to cart", "Ticket removed from cart, seat no longer available for sale!", "Ticket removed from cart due to seat expiration time!" |
| Confirmation / Cart info | "Seat Information", "Seat Number", "Seat Type", "Ticket Price", "Total Price", "Buy Now", "Number of Seats", "Unassigned Seat Section ID", "Booth ID" |
| Admin settings | "Cart session timeout duration (time in minutes)", "Hide seat expiration time in all cart pages", "Enable copying seat status to duplicate event" |

## Assets Inventory

JavaScript files (in `assets/`):

| File | Role |
|---|---|
| `ST_script.js` | Frontend seat picker: seat map interaction, AJAX calls, Handlebars rendering, cart management |
| `ST_admin_script.js` | Admin seat-map editor: drag-and-drop canvas, section/row/seat CRUD forms, editor AJAX calls |
| `evost_map_draw.js` | Shared map drawing utilities used by both admin and frontend |
| `handlebars.js` | Handlebars 4.x templating library (vendor, bundled) |
| `panzoom.js` | Pan and zoom library for the seat canvas (vendor, bundled) |

CSS files:

| File | Role |
|---|---|
| `ST_styles.css` | Frontend seat picker styles: seat colours, status classes, tooltip, cart stub, legends |
| `ST_admin_styles.css` | Admin seat-map editor styles: canvas layout, form lightboxes, section/row/seat controls |

Image/media files:

| File | Role |
|---|---|
| `evo-loader.gif` | Loading spinner |
| `grid.png` | Editor canvas background grid |
