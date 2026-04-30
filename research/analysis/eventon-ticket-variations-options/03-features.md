---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-ticket-variations-options — Features

## Admin Variant Configurator

The admin-facing configuration flow is entirely driven by AJAX lightboxes injected into the evotx event metabox.

**Entry point:** On the event edit screen, the evotx metabox renders a "Enable ticket variations & options" yes/no toggle (`_evovo_activate`). When enabled, a "Variations & Options Settings" link appears. Clicking it fires `evovo_get_settings` AJAX, which renders a settings panel inside a lightbox.

**Settings panel (`evovo_get_settings` / `evovo_save_settings`):** Contains four toggles:
1. Sell Variations as separate tickets (only when a single variation type exists)
2. Sell Price Options as separate tickets (disables variation display)
3. Hide sold-out variations
4. Hide sold-out price options

The settings panel also renders the current list of all variation types, variations, and price options, with **"+ New Variation Type"**, **"+ New Variation"**, and **"+ New Price Option"** trigger buttons.

**Variation Type form (`evovo_get_vo_form` with method=`variation_type`):** A lightbox form with two fields: Name (the axis label, e.g., "Section") and Options (a comma-separated list of allowed values, e.g., "Floor, Balcony, VIP"). Saved via `evovo_save_vo_form`.

**Variation form (`evovo_get_vo_form` with method=`variation`):** A lightbox form that first requires at least one variation type to exist. For each existing variation type, a dropdown field is shown listing all the type's option values plus "All". Additional fields: Ticket Variation Price, Stock Quantity (blank = unlimited), Stock Status (in/out), and Who can purchase (everyone / logged-in members only). The combination of dropdown selections defines which matrix cell this variation row covers.

**Price Option form (`evovo_get_vo_form` with method=`option`):** A lightbox form with fields: Name, Price, Description, Stock, Stock Status, and Sold Style (Individually = toggle add/remove; Multiples = quantity adjuster).

**Drag-drop reorder:** The admin JS sends `evovo_save_neworder` after the user reorders items via jQuery UI Sortable.

**Delete:** Each VO item has a delete trigger that fires `evovo_delete_item` AJAX, which removes the item from postmeta and returns the refreshed list HTML.

**Seat section integration:** When the seats addon is active, the VO editor is also embedded inside the seat section edit form (`evost_admin_formfields`). Variation forms for seat parents omit the stock/stock_status fields since stock is derived from seat capacity.

**Booking block integration:** When the booking addon is active, the VO editor is embedded in the booking block edit form and auto-generator form. When booking block slots are auto-generated, the VO template defined for the generator is cloned to each new slot.

---

## Frontend Tier-Option Pricing Display

The frontend rendering is handled by `EVOVO_Var_opts::print_frontend_html()`, which is injected via the `evotx_single_product_temp` filter, replacing the default ticket template HTML.

**Variation type dropdowns:** If variation rows exist and "sell as separate tickets" is not active, one `<select>` dropdown is rendered per variation type. Changing a dropdown triggers the JavaScript to find the matching variation row and update the displayed price and stock maximum. The initial selection defaults to the first variation row that matches the first option value of each type.

**Single-variation-type "separate tickets" mode:** When there is exactly one variation type and "sell variations as separate tickets" is enabled, each variation value is rendered as an individual quantity adjuster (`+/-` spinner) rather than a dropdown. Each spinner's value becomes the quantity of that tier added to the cart as a separate WooCommerce product.

**Price options list:** Rendered as a list of items below the variation dropdowns. Each item shows the name and price. Items with `sold_style = "one"` render an Add/Added/Remove toggle; items with `sold_style = "mult"` render a `+/-` quantity adjuster. Options respect the out-of-stock settings (hidden or shown as "Sold Out" depending on the `_evovo_op_hide_sold` flag).

**Price display area:** Below the selectors:
- **Base price** field — updates in real time via JS when the user changes a variation dropdown
- **Price options prices container** — a JavaScript-managed area where each selected price option's contribution is listed
- **Total price** field — updated in real time: `base_price + sum(option_price × qty)`
- **Quantity adjuster** — disabled in separate-ticket mode; otherwise the ticket quantity that applies to the base variation
- **Remaining stock display** — shown if the event has `_show_remain_tix` enabled

**Data embedding:** All variation and option data is serialized as HTML data attributes on a `div.evovo_data` element inside `div.evotx_addon_data`. The JavaScript reads this on page load to build the client-side price calculator. No AJAX call is needed for price recalculation — all data is pre-baked into the page.

---

## Price Computation Pattern

**Formula:** `total = selected_variation.regular_price + Σ(option.regular_price × option.qty)`

The selected variation's price fully replaces the WooCommerce product's base price. Price options are **purely additive** — each one contributes its own fixed price multiplied by the user's chosen quantity.

**Client-side calculation:** The JavaScript reads the embedded VO data JSON and performs the computation locally whenever the user changes a dropdown or adjusts an option quantity. The displayed total is updated without any server round-trip.

**Server-side enforcement:** At add-to-cart time, `EVOVO_tx::add_to_cart()` re-reads the variation price from postmeta (`EVOVO_Var_opts::get_item_prop('regular_price')`), re-reads each option price from postmeta, and computes the authoritative `evovo_price` that is stored in the cart item data. The WooCommerce product price is overridden by filtering `evotx_ticket_item_price_for_cart` to return `$values['evovo_price']`. This means client-side and server-side prices must agree — there is no validation that the client-submitted price matches the server-computed one, because the server ignores the client-submitted price and recomputes from postmeta.

**"Sell as separate tickets" variant:** In this mode, each option or variation is added to the WooCommerce cart as a completely independent line item via `WC()->cart->add_to_cart()`. The price for each separate item is the variation's or option's individual price, not an additive sum.

**No percentage-based or multiplicative pricing:** There is commented-out code for a `fees` field (flat fee or percentage) in the admin form, but it is disabled in v1.1.4. All active pricing is flat.

---

## Integrations

### evotx (Event Tickets) — Core Integration

The plugin is non-functional without evotx. `EVOVO_tx` uses 20+ evotx filter/action hooks to inject VO behavior at every stage of the ticket lifecycle:

- **Frontend template:** replaces the ticket selector HTML with VO UI
- **Add to cart:** intercepts cart item data to inject variation choice and price
- **Cart display:** augments cart item names and quantity fields
- **Cart validation:** checks variation and option stock before allowing checkout
- **Checkout / order:** saves `_evovo_data` snapshot to order item meta
- **Stock management:** decrements variation and option stock when order completes; restores on refund via `evotx_adjust_orderitem_ticket_stockother`
- **Attendee list / CSV / email:** surfaces variation and option selections in all downstream reporting

### evost (Seats) — Optional Integration

`EVOVO_Seats` detects `class_exists('EVO_seats')` and activates if true. When active:
- Variations are scoped to individual seat sections (by `parent_type = 'seat'`, `parent_id = section_id`)
- The seat map UI takes priority over the standalone VO selector on the frontend
- Stock for seat-parented variations is derived from seat capacity rather than the variation's own stock field
- Seat section duplication clones all VO items to the new section with new IDs
- Seat section deletion cascades to delete all its VO items

### evobo (Booking) — Optional Integration

`EVOVO_BO` detects `class_exists('EVOBO_Blocks')` and activates if true. When active:
- Variations are scoped to individual booking time slots (by `parent_type = 'booking'`, `parent_id = block_index`)
- The booking UI takes priority over the standalone VO selector on the frontend
- Booking block capacity is automatically synced from the total stock across all its variation rows
- Auto-generated booking slots receive cloned VO items from a generator template
- Block deletion cascades to delete all its VO items

### evoqr (QR Code) — Optional Integration

A trivial data-passthrough: `class-integration-qr.php` hooks `evoqr_data_output` to append the `_evovo_data` variation/option snapshot to the QR code scanning display.

---

## i18n Feature Taxonomy

Text domain: `evovo`. POT file present in `lang/evovo.pot`.

### Variation Configuration (Admin)

- "Enable ticket variations & options"
- "Create ticket variations and options for this event."
- "Variations & Options Settings"
- "New Variation Type", "New Variation", "New Price Option"
- "Ticket Variation Name", "Ticket Variation Options (separated by comma)"
- "Ticket Variation Price", "Ticket Variation Stock Quantity (Leave blank for unlimited)"
- "Ticket Variation Stock Status" / "In Stock" / "Out of Stock"
- "Who can purchase this variation" / "Everyone" / "Only loggedin members"
- "Ticket Price Option Name", "Ticket Option Price", "Ticket Option Description"
- "Sold Style" / "Individually" / "Multiples"
- "NOTE: Variations stock must be less than block capacity" (booking integration)
- "Variation options are not available for repeating events!"

### Option Selection UI (Frontend)

- "Optional Ticket Additions"
- "Add" / "Added" / "remove"
- "Sold Out"
- "Variations for ticket"
- "Optional Additions"
- "Base Price"

### Pricing Display (Frontend + Cart)

- "Your Total"
- "Base Price"
- "Out of Stock!" (error string `tvo1`)
- "Selected options not available for sale!" (`tvo2`)
- "Current selection is out of stock, please make new selection!" (`tvo3`)
- "Ticket added to cart successfully!"
- "Could not add ticket to cart, please try later!"

### Admin Settings & Reporting

- "Sell Variations as separate ticket (Only when you have single variation type)"
- "Sell Price Options as Separate Tickets"
- "Hide variations that are out of stock"
- "Hide options that are out of stock"
- "Sales by Ticket Variations & Options"
- "Settings Successfully Saved"
- "Successfully Added!" / "Successfully Updated!" / "Successfully Deleted!"
- "New Order Saved"
- "Member Only"
