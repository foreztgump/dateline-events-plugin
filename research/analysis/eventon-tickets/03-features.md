---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON — Event Tickets: Features

## Admin Screens

### 1. Ticket Settings Tab (EventON > Tickets)

Registered via `add_submenu_page` under `eventon` (admin/class-admin.php:377). Uses EventON's settings framework to render a tabbed settings page stored under `evcal_options_evcal_tx`. Key setting groups include:

- **General Ticket Settings** — toggle guest-only sales, thank-you page display, sold-out tag suppression, auto-restock on refund/cancel/fail, WC product page redirect, add-to-cart redirect destination, stop-selling trigger (before event start or end)
- **WooCommerce Product Settings** — auto-update product name on event rename, product name structure template tokens
- **Email / Notification Settings** — from-address, from-name, email subject, email send trigger (order-completed vs. manual), BCC address
- **Inquiry Form Settings** — global default inquiry recipient email and subject
- **Additional Checkout Fields** — configurable per-field options for collecting ticket-holder names and emails
- **Appearance** — ticket button colour, hover states, remaining-stock label styling (delegated to EventON's appearance panel)

### 2. Ticket Orders Screen (WooCommerce > Ticket Orders)

Registered via `add_submenu_page` under `woocommerce` (admin/class-admin.php:382). Renders a filtered view of WC orders that contain `evo-tix`-type items. Provides a fast-access list of ticket purchases without exposing unrelated orders.

### 3. Event Edit — "Event Tickets" Meta Box

Registered via `add_meta_box('evotx_mb1', …, 'ajde_events')` (admin/class-meta_boxes.php:36). Appears on every EventON event (`ajde_events`) edit screen with the following sections:

- Toggle ticket selling on/off for this event
- Associate or auto-create a WC simple or variable product
- Set ticket price, sale price, SKU, and short description
- Name-your-price mode with minimum floor
- Stock management: total quantity, out-of-stock override, sold-individually flag
- Per-occurrence capacity for repeating events (one input per repeat occurrence)
- Show remaining tickets, with threshold trigger
- Show guest list on event card
- Ticket section subtitle and rich-text description
- Ticket image and image caption
- Post-purchase additional information (sent in confirmation email)
- Inquiry form toggle with override email/subject
- Stop-selling X minutes before event
- Show "next available" repeat occurrence when current is sold out
- Already-purchased notice for returning logged-in buyers
- Virtual-event gate options (show/hide virtual content behind ticket purchase)

### 4. evo-tix Post Edit — Meta Boxes

Three meta boxes are registered on the `evo-tix` custom post type edit screen:

- **Event Ticket Data** (`evo_mb1`, normal, high) — full attendee/ticket data view with editable name, email, and status fields; shows associated event title, order ID, and event time
- **Ticket Data** (`evotx_mb3`, side, default) — compact side panel with raw ticket postmeta (qty, cost, type, repeat interval)
- **Event Ticket Confirmation** (`evotx_mb2`, side, default) — button to manually re-send the ticket confirmation email for this specific ticket

### 5. WC Product Edit — "Associated Event Data" Meta Box

Registered via `add_meta_box('evotx_metaboxes_wcproduct', …, 'product')` (admin/class-meta_boxes.php:45). Shown on WooCommerce product edit screens for products created by this plugin. Displays a read-only back-link to the parent EventON event and ticket status summary.

### 6. WC Admin Order Screen — Ticket Info Panels

Two injections via `woocommerce_admin_order_data_after_payment_info` (admin/class-meta_boxes.php:30–31):
- Ticket-holder names and emails collected at checkout
- Per-ticket status summary with check-in state

### 7. Sales Insight Panel

Rendered by `admin/class-admin_sales_insight.php`. Accessible from the event edit screen; shows revenue, sold count, and attendee breakdown per event. Provides CSV export functionality for attendee data with configurable column headers.

### 8. Event List Table Column

Injected by `admin/class-admin-evo-tix.php` into the `ajde_events` list table. Adds a "Tickets" column showing stock status (in stock / out of stock / not enabled) for each event.

---

## i18n Feature Taxonomy

Translatable strings (from `evotx.pot` and inline `__()` / `_e()` calls) group into the following topics:

### Ticket Management
- "Sell tickets for this event"
- "Manage Ticket Stock", "Total Tickets in Stock"
- "Ticket Price (Required*)", "Sale Price", "Ticket SKU (Required*)"
- "Short Ticket Detail"
- "Enable name your price", "Minimum allowed price"
- "Manage capacity separate for each repeating event"
- "Show remaining tickets (Only for Woocommerce simple tickets)", "Show remaining count at"
- "Place ticket on out of stock"
- "Sold Individually"
- "Show next available repeating instance of event"
- "Stop selling tickets X minutes before event {start|end}"
- "Show a message if a loggedin customer has purchased a ticket already"
- "Show guest list for event on eventCard"
- "Ticket Section Subtitle", "Ticket Field Description"
- "Ticket Image", "Ticket Image Title"
- "Associated Woocommerce Product ID", "Ticket Price", "Product Type"

### Cart and Checkout
- "Ticket added to cart successfully"
- "Could not add ticket to cart, please try later!"
- "Your price is lower than minimum price"
- "Name your price is not enabled"
- "Full Name" (ticket-holder checkout field label)
- "IMPORTANT: Event must have current or future event date for ticket purchasing information to display on front-end!"
- "NOTE: The capacity above should match the total number of capacity…"

### Email Notifications
- "Event Ticket" (default email subject)
- "TICKET {date}" (auto-generated evo-tix post title prefix)
- "Additional Information visible to customer after ticket purchase."
- "Details typed in here will be sent to customers via confirmation email."
- "Virtual Event Access Information" (virtual events email label)

### Admin UI
- "Event Tickets", "Event Ticket Data", "Ticket Data", "Event Ticket Confirmation"
- "Associated Event Data"
- "Save Ticket Settings"
- "Associated Woocommerce Product ID"
- "EventON Tickets needs WooCommerce plugin to function properly. Please install WooCommerce"
- "Tickets addon require WooCommerce version %s or above to fully function!"
- "EventON %s is NOT active!"
- "Override Default Email Address to receive Inquiries"
- "Override Default Subject to receive Inquiries"
- "Allow customers to submit inquiries."
- "NOTE: Front-end fields for Inquiries form can be customized from EventON Languages"

### WooCommerce Integration
- "My Tickets" (WC My Account tab label)
- "SKU refers to a Stock-keeping unit…"
- "Setting this to yes would make tickets not available for sale anymore…"
- "When name your price is enabled, customer will be able to set his own price…"
- "NOTE: When refunding orders, you must NOT restock refunded items in woocommerce order…"
- "WC Block based cart and checkout are not supported at this moment…"

### Virtual Events Integration
- "User must purchase a ticket to view virtual event information"
- "User must purchase a ticket to view pre-event information"
- "User must purchase a ticket to view after event information"
- "Hide ticket guest count and checked-in count"
- "Content available for paid attendees only"
- "Purchase ticket now to join", "Ticket sales are closed now"
- "You have purchased a ticket for this event"

---

## Integrations Inventory

### WooCommerce
This is the core integration — the plugin exists to sell event tickets through WooCommerce. It creates a virtual WC simple (or variable) product for each event, attaches cart metadata to associate the product with a specific event occurrence, injects ticket-holder name/email fields at checkout, saves that data to WC order meta, listens to all relevant order-status transitions to create/update/refund `evo-tix` posts, adjusts inventory, and dispatches the ticket confirmation email when an order is marked completed.

### WooCommerce My Account
Adds a dedicated "My Tickets" endpoint and navigation item to WC's My Account area. Renders a table of the logged-in customer's tickets across all orders, grouped by order, with check-in status indicators.

### Virtual Events (EventON add-on)
Three-level content gate: pre-event info, live event link, and post-event content can each be independently restricted to paid ticket holders. The virtual event URL is appended to the ticket confirmation email. A sign-in flow records attendance on the `evo-tix` post (`signin=y`).

### Webhooks (EventON add-on)
Registers two outbound webhook triggers in EventON's webhook system: `tickets_created` (fires after all tickets for an order are generated; payload includes order ID and ticket-number array) and `ticket_stock_modified` (fires on any stock adjustment; payload includes order/item/event context and reduce-or-restock flag).

### Countdown (EventON add-on)
A minimal integration: when a countdown timer expires, the plugin immediately sets the linked WC product's stock status to `outofstock`, effectively closing ticket sales at the countdown target.

### ActionUser (EventON add-on)
Surfaces the full ticket configuration UI (enable/disable, pricing, capacity, repeat-cap) inside the ActionUser front-end event submission form, so event organizers can configure tickets without admin access. Saves ticket settings via the same `update_post_meta` path as the admin metabox.

---

## i18n Infrastructure

A compiled `.mo` file (`lang/evotx.mo`) and source `.pot` file (`lang/evotx.pot`) are present in the `lang/` directory. The text domain is `evotx`. Translations are loaded via `load_textdomain` and `load_plugin_textdomain` in the plugin's `load_plugin_textdomain()` method.
