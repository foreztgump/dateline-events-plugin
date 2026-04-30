---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  WooCommerce not installed on Site B. Frontend seat picker is entirely absent.
  This document describes the full frontend UX from static analysis and source
  code review. Screenshots show WC-absent state.
---

# eventon-seats 1.2.6 — Frontend UX

> **WooCommerce + eventon-tickets dependency:** The frontend seat picker requires evonton-tickets, which requires WooCommerce. Without WC, no seat picker HTML is rendered.

---

## WC-Degraded State (Live Observation)

> Screenshots: `frontend-100-event-8.png` through `frontend-100-event-34.png`

No seat picker, no "Find Seats" button, no seat map HTML on any event page. The event card renders only standard EventON sections.

**JS globals observed:** `evost_data` / `evost_sc` not present.

---

## Full Frontend UX (with WooCommerce + eventon-tickets)

### Seat Picker Placement

The seat picker is injected via the `evotx_single_product_temp` filter, **replacing** the default ticket section HTML entirely when seating is enabled for an event. The picker can render in two modes (configurable):

1. **Inline in event card** — seat canvas embedded directly below the event description
2. **Lightbox mode (default)** — "Find Seats" button opens a lightbox overlay

---

## 1. Seat Canvas Display

The seat canvas is a Handlebars-rendered interactive grid. Initial load sequence:

1. Skeleton HTML injected on page load (loading spinner, empty containers)
2. `evost_get_seats_data` AJAX call fetches seat map JSON, cart state, and settings
3. Handlebars templates render the interactive canvas

### Seat Status Colors

| CSS Class | Status | Visual |
|---|---|---|
| `av` (available) | Default | Section's default color |
| `tuav` | Temporarily unavailable (in someone's cart) | Muted / grey |
| `uav` | Sold out | Dark / strikethrough |
| `selected` | User's current selection | Highlight color |
| `mine` | Already in user's cart | Distinct highlight |
| `res` | Reserved (admin-set) | Red / reserved indicator |
| `hand` | Handicap accessible | Accessibility icon |

### Canvas Controls

```
[Seat Legends]  ─────────────────────────────  [Zoom +] [Zoom −] [Reset]
                                                                   ↑ pan/zoom via panzoom.js
  ┌────────────────────────────────────────────────────────────┐
  │                                                            │
  │  [Section A]                                               │
  │  A1  A2  A3  A4  A5  A6  ← assigned row                  │
  │  B1  B2  B3 [TUAV] B5    ← B4 in someone's cart          │
  │                                                            │
  │  [Section B — Unassigned]                                  │
  │  ████████████████████  47 / 100 available                  │
  │                                                            │
  └────────────────────────────────────────────────────────────┘
```

### Seat Hover Tooltip

```
Section: Floor
Row: B
Seat: 4
Price: $35.00
```

For unassigned areas:
```
Section: General Admission
47 seats available
Price: $25.00
```

---

## 2. Seat Selection Flow

### Assigned Seating

1. **Hover** → tooltip appears with seat details
2. **Click available seat** → one of two paths:
   - **Standard mode:** `evost_seat_cart_preview` AJAX returns a preview popup:
     ```
     Section: Floor, Row: B, Seat: 4
     Price: $35.00
     Qty: [1]   (fixed at 1 for assigned seats)
     [Add to Cart]
     ```
   - **One-click mode** (`_allow_direct_add` enabled): `evost_seat_direct_add_cart` AJAX called immediately, skipping preview
3. **Add to Cart** → seat status turns to `mine` (in user's cart), expiry timer starts
4. **Seat hold expires** → seat returns to `av`, WC cart item removed, notice shown

### Unassigned Area

1. **Hover** → tooltip shows available count and price
2. **Click** → preview popup shows:
   ```
   Section: General Admission
   47 seats available
   Qty: [1  ↑↓]   (adjustable up to available count)
   Price: $25.00 × qty
   [Add to Cart]
   ```
3. **Add to Cart** → `sold` counter incremented for section; expiry timer starts

### Booth

Similar to unassigned but sold as a unit or with a maximum occupancy cap.

---

## 3. Cart Session Hold & Expiry

**Hold duration:** Configured in seat map settings (default 10 minutes). The timer is an inactivity timer — adding more seats to the cart resets all existing holds to a fresh 10 minutes.

**Cart expiry notice (WC Cart/Checkout pages):**
```
Your seats will expire in [countdown] minutes of inactivity in cart.
```

**On expiry:**
- WC cart item is removed automatically
- Notice displayed: "Seat removed from cart, time expired!"
- Seat reverts to `av` status
- No page redirect (user must re-select)

**At checkout:**
Before order processing, `evotix_cart_item_validation` re-checks seat availability. If a seat expired between the hold and checkout, the order is blocked and the user must re-select.

---

## 4. Seat Information in Cart

Cart item name is augmented:
```
Annual Tech Conference — Ticket
  Section: Floor / Row: B / Seat: 4
```

For unassigned:
```
Annual Tech Conference — Ticket
  Section: General Admission  (Qty: 2 — with quantity adjuster)
```

---

## 5. Seat Information in Order Confirmation

WC order line-item meta shows:
```
Seat-Number: B4
```

Ticket confirmation email includes a seat block:
```
Seat Information
Section: Floor (F)
Row: B
Seat: 4
```

---

## 6. Seat Legends Panel

Rendered below the seat canvas:

```
Seat Legends
  ● Available         ● Unavailable (Sold Out)
  ● In someone's cart ● Your selected seats
  ● Seats in your cart● Reserved
  ♿ Handicap Accessible
```

---

## 7. QR Code Integration

When the QR Code addon is active, the QR scan display for a ticket appends:

```
Seat-Number: B4
Seat-Info: Floor (F), Row B, Seat 4
```

---

## JavaScript Architecture

**Enqueued scripts:**
- `evost_script` — seat picker JS (frontend interaction, AJAX calls, Handlebars rendering)
- `evost_map_draw` — shared map drawing utilities
- `handlebars` — Handlebars 4.x (vendor, bundled)
- `panzoom` — pan-and-zoom library (vendor, bundled)

**AJAX endpoints:**
| Action | Description |
|---|---|
| `evost_get_seats_data` | Load seat map JSON, cart state, and settings for frontend render |
| `evost_seat_cart_preview` | Preview popup for a selected seat |
| `evost_seat_direct_add_cart` | One-click add-to-cart (skips preview) |

**Expected JS global:**
```javascript
evost_sc = {
    ajaxurl: "...",
    nonce: "...",
    event_id: 8,
    timeout_min: 10,
    // ...
}
```

---

## Dateline Design Notes

1. **Seat map is a UX problem, not a data problem.** The complexity is in the interactive canvas (pan/zoom, hover states, hold timers). The data model (sections → rows → seats) is straightforward.
2. **panzoom.js + Handlebars** is a dated stack (2019-era). Dateline should consider a React-based seat canvas (e.g., react-canvas, Konva.js) for better maintainability and accessibility.
3. **Session-based holds via WC cart** create tight WC coupling. Dateline uses `hold:{cartId}` in KV with TTL 600s (per AGENTS.md) — this is architecturally cleaner.
4. **Seat types (def/una/boo)** map to three meaningfully different ticketing models. All three should be Dateline tier types: assigned, general-admission, and group/table.
5. **Expiry check on every seat-map load** (`run_all_seat_expiration_check` called inside `__j_get_all_sections`) is a synchronous O(n) operation. Dateline should use background cron (`ctx.cron.schedule()`) for hold expiry sweeps rather than inline checks.
6. **No accessibility** — keyboard navigation, screen reader support, and ARIA labels are absent. This is a known gap in the reference implementation. Dateline's seat picker should be keyboard-accessible from day one.
