---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  WooCommerce not installed on Site B. Frontend ticket UI is entirely absent
  in the live capture. This document describes the full frontend UX derived
  from static analysis and i18n string inventory. Live screenshots show the
  WC-absent state (no ticket section rendered on event cards).
---

# eventon-tickets 2.4.7 — Frontend UX

> **WooCommerce dependency:** The entire frontend ticket UX requires WooCommerce. Without WC, zero ticket HTML is rendered on the frontend — not even a placeholder. The event card shows only the standard EventON sections (date/time, location, organizer, description).

---

## WC-Degraded State (Live Observation)

> Screenshots: `frontend-100-event-8.png`, `frontend-100-event-9.png`, `frontend-100-event-28.png`

Single event pages and the calendar event cards show no ticket section, no "Buy Tickets" button, and no stock indicator. The three WC-missing admin notices appear in the backend but nothing surfaces on the frontend (no user-facing error or placeholder).

**JS globals observed:** None — `evotx_data` / `evo_tx` are not enqueued without WooCommerce.

---

## Full Frontend UX (with WooCommerce)

### Ticket Section in EventON Event Card

The ticket section renders inside the EventON event card after the event description, injected via the `evotx_single_product_temp` filter. The section is structured as:

```
[Ticket Section Subtitle — configurable]
[Ticket Field Description — rich text]
[Ticket Image — optional]

--- Ticket Selector ---
[Ticket price]                     e.g. "$25.00"
[Short ticket detail]              e.g. "General Admission"
[Quantity adjuster: − [1] +]
[Remaining: 47 left]               (when show-remaining is enabled)
[Add to Cart]

[Show guest list — optional]
[Inquiry form button — optional]
```

#### Name-Your-Price Mode

When enabled, the quantity adjuster is replaced with a price input:
```
Your Price: $[____] (minimum $15.00)
[Add to Cart]
```

#### Sold-Out State

When stock reaches zero:
```
[SOLD OUT]                         (or configured sold-out text)
[Show next available occurrence]   (for recurring events, when configured)
```

#### Already-Purchased Notice

For logged-in users who have already bought a ticket:
```
✓ You have purchased a ticket for this event
```

---

### Ticket Add-to-Cart Flow

**Standard add-to-cart:**
1. User selects quantity (or enters price for name-your-price) and clicks "Add to Cart"
2. AJAX call to WC cart endpoint: `/?wc-ajax=add_to_cart`
3. Cart item data: `event_id`, `event_date`, `evotx_ticket_id`, optional seat data
4. Ticket-holder name/email fields collected at WC checkout (not at add-to-cart time)
5. WC checkout → order created → order completes → ticket confirmation email sent

**Redirect on add-to-cart:**
Configurable via `evotx_add_cart_redirect`:
- Direct to cart page
- Direct to checkout
- Stay on page (default WC behavior)

---

### WooCommerce Cart Page

Ticket appears as a standard WC cart line item with augmented display:

```
[Ticket name: auto-generated "Annual Tech Conference — Ticket"]
[Event date: May 2, 2026]
[Price: $25.00]
[Qty: 1]
[Remove ×]
```

The cart item name is built from `evotx_product_name_template` tokens configured in the settings.

---

### WooCommerce Checkout

Additional fields injected at checkout (configurable):

```
--- Attendee Information ---
Attendee Name: [________________]
Attendee Email: [________________]
```

These are WC order form fields, not RSVP-style pre-submission. Field quantity and labels configurable in Tickets settings → Additional Checkout Fields.

**WC Block Checkout:** Not supported (static analysis confirmed `// WC Block based cart and checkout are not supported at this moment` in source code). Classic WC checkout only.

---

### WooCommerce My Account — "My Tickets" Tab

A dedicated "My Tickets" endpoint is added to WC's My Account navigation:

```
WC My Account
├── Dashboard
├── Orders
├── Tickets        ← new tab
├── Addresses
└── Account details
```

**Tickets tab content:**

```
My Tickets
─────────────────────────────────────────────────────
Order #1234 — May 2, 2026
  ┌─────────────────────────────────────────────────┐
  │ Annual Tech Conference 2026                     │
  │ Ticket #001        Status: Active  [✓ Checked In]│
  └─────────────────────────────────────────────────┘
─────────────────────────────────────────────────────
Order #1189 — Past event
  ┌─────────────────────────────────────────────────┐
  │ Kubernetes Workshop                             │
  │ Ticket #002        Status: Used                 │
  └─────────────────────────────────────────────────┘
```

Tickets grouped by order, showing event name, ticket ID, check-in status.

---

### Ticket Confirmation Email

Triggered when WC order status transitions to "completed" (configurable: can be set to manual trigger).

**Template:** `templates/email/ticket-confirmation.php`; overrideable by placing copy in active theme under `eventon/templates/email/`.

**Content:**
- EventON email header
- Event name, date/time, location
- Ticket number(s)
- Ticket holder name
- "Post-purchase additional information" field (configured per-event)
- For virtual events: the virtual event access link
- EventON email footer

---

### Inquiry Form

Optional per-event "ask a question" form. Renders below the ticket section when enabled.

```
[Override Email button / "Ask about this event"]
  → Opens lightbox with:
     Subject: [Auto-filled from event name]
     Message: [__________________________]
     [Send Inquiry]
```

Inquiry is emailed to the configured recipient (global or per-event override). No WC order involved.

---

### Stop-Selling Logic

Configured via `evotx_stop_selling`:
- **Before event start:** Ticket section becomes "purchase closed" N minutes before `evcal_srow`
- **Before event end:** Ticket section becomes "purchase closed" N minutes before `evcal_erow`

When closed, the Add to Cart button is replaced with:
```
Ticket sales are closed now.
```

---

## JavaScript Architecture

**Enqueued scripts (WC-dependent, not observed on live site):**
- `evotx_script` — cart add, form validation, success/error messages

**Expected JS global:**
```javascript
evotx_data = {
    ajaxurl: "...",
    nonce: "...",
    event_id: 8,
    ticket_price: "25.00",
    max_qty: 10,
    // ...
}
```

**No custom REST API endpoints** — uses WC AJAX (`wc-ajax`) and standard WC cart/checkout flow.

---

## Frontend i18n Strings (Key)

- "Ticket added to cart successfully"
- "Could not add ticket to cart, please try later!"
- "Your price is lower than minimum price"
- "Full Name" (checkout field label)
- "Purchase ticket now to join" (virtual event gate)
- "You have purchased a ticket for this event" (already-purchased notice)
- "Ticket sales are closed now"
- "SOLD OUT" (sold-out state)

---

## Dateline Design Notes

1. **WC is the entire checkout engine.** Dateline's ticket module needs its own checkout stack: cart → checkout → payment → ticket generation. The complexity is in the WC integration, not the ticket data model.
2. **Ticket = WC product** means tickets have no independent identity without WC. Dateline should invert this — tickets are first-class entities, payments are an integration.
3. **Block checkout not supported** is a significant gap. Dateline should target block-based checkout from day one.
4. **`evotx_single_product_temp` filter** is the extension point for seats and variations — they both inject UI by replacing the default ticket section HTML. Dateline's ticket module should provide a similar hook architecture.
5. **Confirmation email trigger = order-complete** creates a dependency on WC order status transitions. Dateline should use its own event-driven pipeline (Stripe webhook → ticket created → email dispatched via `ctx.waitUntil`).
