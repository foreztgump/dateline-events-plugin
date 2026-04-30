---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  WooCommerce not installed on Site B. No variations UI rendered on frontend.
  Documentation from static analysis. Screenshots show WC-absent state.
---

# eventon-ticket-variations-options 1.1.4 — Frontend UX

> **WooCommerce + evonton-tickets dependency:** The frontend variations pricing UI requires evonton-tickets (WooCommerce). Without WC, no variations HTML is rendered on event cards.

---

## WC-Degraded State (Live Observation)

> Screenshots: `frontend-100-event-8.png` through `frontend-100-event-34.png`

No variations UI on any event page. No JS globals (`evovo_data` absent).

---

## Full Frontend UX (with WooCommerce + evonton-tickets)

### Rendering Mode

The variations UI is injected via the `evotx_single_product_temp` filter, replacing the default ticket section HTML. Two rendering modes are controlled by the admin settings:

1. **Dropdown mode (default):** Variation type = `<select>` dropdown; price options = checkbox/qty list below
2. **Separate-ticket mode:** Single variation type → each value rendered as independent qty adjuster

---

## 1. Dropdown Mode

The most common configuration. Multiple variation types can coexist.

### Layout

```
[Ticket Section Subtitle — configurable]
[Ticket Field Description — rich text]

--- Ticket Type ---
Section: [Floor ▼]   (variation type 1 dropdown)
Day:     [Saturday ▼] (variation type 2 dropdown)

Base Price: $45.00    (updates in real time as dropdowns change)

--- Optional Ticket Additions ---
○ Parking Pass      +$15.00    [Add]
  Secure parking at the venue
○ Meal Package      +$30.00    [Add]
  3-course dinner included
● T-Shirt           +$25.00    [2 ↑↓]  (already added — qty-adjuster style)

Your Total: $115.00   (base + sum of options)

Qty: [1 ↑↓]
[Add to Cart]

[3 remaining]  (when show-remaining-tickets is enabled)
```

### Dropdown Interaction

- Changing a variation dropdown updates the **Base Price** in real time via client-side JS (no AJAX)
- The price calculation reads from embedded `div.evovo_data` data attributes — all data is pre-baked into the page HTML
- If the selected combination has `sold_style = "outofstock"`, the Add to Cart button disables and shows "Out of Stock!"

### Option Add/Remove Toggle (Individually)

Each option with `sold_style = "one"` renders as:
```
[Add]  → becomes → [Added] [remove]
```

Single-click add; remove removes it from the total.

### Option Quantity Adjuster (Multiples)

Each option with `sold_style = "mult"` renders as:
```
[−] [2] [+]  Parking Pass  +$30.00 (2 × $15.00)
```

Quantity changes update the total in real time.

---

## 2. Separate-Ticket Mode (single variation type only)

When "Sell Variations as separate tickets" is enabled and there is exactly one variation type:

### Layout

```
[Ticket Section Subtitle]

Floor (General)         $25.00   [−] [0] [+]
Floor (Accessible)      $25.00   [−] [0] [+]
Balcony                 $35.00   [−] [1] [+]   ← selected 1
VIP                     $75.00   [−] [0] [+]

[Add to Cart]   (adds each non-zero qty as a separate WC line item)
```

Each row is an independent ticket at its own price. The user can select multiple types simultaneously (e.g., 2× Balcony + 1× VIP). Each non-zero qty adds a separate WC cart item.

---

## 3. Price Display Area

```
Base Price: $35.00
  Parking Pass × 1:  +$15.00
  T-Shirt × 2:       +$50.00
────────────────────────────
Your Total: $100.00
```

Updates in real time with every dropdown change or option adjustment. Calculated client-side from embedded data attributes.

---

## 4. Data Embedding

All variation and option data is serialized as HTML data attributes on a `div.evovo_data` element inside `div.evotx_addon_data`:

```html
<div class="evotx_addon_data">
  <div class="evovo_data"
       data-variations='[{"id":1,"types":{"section":"floor","day":"saturday"},"price":"45.00","stock":10},...]'
       data-options='[{"id":1,"name":"Parking Pass","price":"15.00","sold_style":"one"},...]'
       data-settings='{"sell_var_sep":"no","hide_sold":"yes",...}'>
  </div>
</div>
```

No AJAX call for price recalculation — all price logic runs client-side from this embedded data.

---

## 5. Add-to-Cart Behavior

**Standard (dropdown) mode:**
- Single WC `add_to_cart` call
- Cart item data: `evovo_variation_id`, `evovo_option_ids[]`, `evovo_price` (authoritative price computed server-side)
- Server-side re-computation: evovo reads variation price from postmeta, re-reads option prices, computes `evovo_price` and stores in cart item data
- WC product base price is overridden by `evotx_ticket_item_price_for_cart` filter returning `evovo_price`

**Separate-ticket mode:**
- Multiple `WC()->cart->add_to_cart()` calls — one per non-zero quantity row
- Each line item at its own variation price

**Security note:** The client-submitted price is ignored entirely — the server re-computes from postmeta. Client and server prices must agree (no validation that they do) because the server-side computation is authoritative.

---

## 6. Cart Display

Cart item name is augmented:
```
Annual Tech Conference — Ticket
  Section: Balcony / Day: Saturday
  Parking Pass, T-Shirt ×2
```

For separate-ticket mode:
```
Annual Tech Conference — Balcony Ticket     $35.00  Qty: 1
Annual Tech Conference — VIP Ticket         $75.00  Qty: 2
```

---

## 7. Sold-Out States

**Variation sold out:**
- Dropdown option greyed out (or hidden if `_evovo_op_hide_sold` is on)
- If the currently-selected combination goes out of stock: "Current selection is out of stock, please make new selection!"

**Option sold out:**
- Option row greyed out (or hidden if `_evovo_op_hide_op_sold` is on)
- Shows "Sold Out" label

---

## 8. JavaScript Architecture

**Enqueued scripts:**
- `evovo_script` — frontend price calculator, dropdown interactions, option add/remove

**No separate AJAX for price calculation** — all computed client-side.

**AJAX for cart:**
- Standard WC `add_to_cart` endpoint, augmented by evovo cart item data

**No expected JS global** — all data embedded via `div.evovo_data` data attributes.

---

## Dateline Design Notes

1. **Client-side price calculation with server-side re-validation** is the correct architecture. Dateline should embed variation data in the page and compute totals client-side, but always recompute server-side at the time of purchase (before the Stripe PaymentIntent amount is set).
2. **The separate-ticket mode** creates multiple independent purchases from a single frontend interaction. Dateline should support this as a "multi-tier" mode where each tier produces an independent attendee record.
3. **No percentage-based pricing** in v1.1.4 — only flat price overrides and flat additive options. This is a significant limitation. Dateline's pricing engine should support percentage fees, volume discounts, and promo codes from the start.
4. **The `div.evovo_data` embedding pattern** is a clean approach for avoiding AJAX on simple interactions. Dateline can use the same pattern (server-rendered JSON in a data attribute) for tier/option data.
5. **"Individually" vs "Multiples" sold style** = toggle vs qty-adjuster. Both are needed for real events (parking = single add; extra meal slots = quantity). Dateline's option pricing should support both modes.
6. **Matrix pricing** (Section × Day combinations) is the most complex pricing scenario in the EventON ecosystem. Dateline's tier model should support N-dimensional pricing matrices while keeping the UI comprehensible.
