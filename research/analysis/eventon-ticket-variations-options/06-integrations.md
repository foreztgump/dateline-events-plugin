---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-ticket-variations-options 1.1.4 — Integrations

---

## Integration Architecture

evento-ticket-variations-options is a pure extension of evonton-tickets — it adds a pricing layer on top of the ticket without replacing any WC interaction. All WC communication still flows through evotx hooks. The variation module intercepts prices and cart data; WC and evotx handle the rest.

---

## 1. eventon-tickets (Required)

**Type:** Hard dependency. The plugin is non-functional without evotx. Self-disables with admin notice if evotx is absent.

Uses 20+ evotx filter/action hooks:

### Frontend Template

| Hook | Purpose |
|---|---|
| `evotx_single_product_temp` | Replace default ticket selector HTML with variation/option UI |

### Cart & Checkout

| Hook | Purpose |
|---|---|
| `evotx_add_ticket_to_cart_before` | Validate variation and option stock before cart add |
| `evotx_add_cart_item_meta` | Inject `_evovo_variation_id`, `_evovo_option_ids[]`, `_evovo_price` into cart item data |
| `evotx_ticket_item_price_for_cart` | Override WC product price with `evovo_price` |
| `evotx_cart_item_name` | Augment cart item name with selected variation/option labels |
| `evotx_cart_quantity_input` | Disable default qty input in separate-ticket mode |
| `evotx_cart_item_validation` | Re-check variation and option stock before checkout |
| `evotx_checkout_item_meta_save` | Write `_evovo_data` snapshot to WC order line-item meta |

### Stock Management

| Hook | Purpose |
|---|---|
| `evotx_adjust_orderitem_ticket_stock` | Decrement variation and option stock when order completes |
| `evotx_adjust_orderitem_ticket_stockother` | Restore variation and option stock on refund |

### Reporting & Email

| Hook | Purpose |
|---|---|
| `evotx_get_attendees_for_event` | Add variation/option data to attendee array |
| `evotx_attendees_csv_headers` | Add variation/option columns to attendee CSV |
| `evotx_attendees_csv_row` | Add variation/option values per row |
| `evotx_ticket_confirmation_email` | Append selected variation/option summary to email |

---

## 2. WooCommerce (Indirect — via evotx hooks)

No direct WC function calls. All WC interaction flows through evotx.

---

## 3. evonton-seats (Optional)

**Detection:** `class_exists('EVO_seats')` inside `EVOVO_Seats`.
**Integration class:** `EVOVO_Seats`.

When active, variations are scoped to seat sections rather than the whole event:

| Feature | Seat-scoped behavior |
|---|---|
| Parent scope | `parent_type = 'seat'`, `parent_id = section_id` |
| Frontend priority | Seat map picker takes over; VO per-section pricing applied when seat is selected |
| Stock | Derived from seat capacity; variation's own stock field hidden in admin |
| Section duplication | All VO items cloned to new section with new IDs |
| Section deletion | Cascades to delete all VO items |
| Auto-generated seats | VO template cloned to each new seat slot |

---

## 4. evonton-booking (Optional)

**Detection:** `class_exists('EVOBO_Blocks')` inside `EVOVO_BO`.
**Integration class:** `EVOVO_BO`.

When active, variations are scoped to booking time slots:

| Feature | Booking-scoped behavior |
|---|---|
| Parent scope | `parent_type = 'booking'`, `parent_id = block_index` |
| Frontend priority | Booking block UI; VO pricing applied per slot |
| Capacity sync | Booking block capacity auto-set from total stock across all variation rows |
| Auto-generated slots | VO template cloned to each new slot |
| Slot deletion | Cascades to delete VO items |

---

## 5. QR Code (Optional)

**Detection:** Via `evoqr_data_output` hook.
**Integration class:** `class-integration-qr.php`.

Appends the `_evovo_data` snapshot to the QR scan display — the full variation/option selection for the ticket appears in the scanner output.

---

## 6. EventON Core (Optional — Language Settings)

Variation strings are registered in EventON's Language Settings panel via the standard `eventon_language_settings` filter, though in v1.1.4 the VO language strings are primarily controlled through the admin form labels rather than the language settings panel.

---

## Integration Summary Table

| Integration | Required? | Type | Primary Touch Points |
|---|---|---|---|
| EventON Core | Yes (transitive) | Transitive | Through evotx |
| evonton-tickets | Yes | Extends | 20+ `evotx_*` hooks |
| WooCommerce | Yes (transitive) | Indirect | Through evotx hooks |
| evonton-seats | Optional | Bidirectional | Section-scoped VO items, seat lifecycle hooks |
| evonton-booking | Optional | Bidirectional | Slot-scoped VO items, block lifecycle hooks |
| QR Code | Optional | Outbound | `evoqr_data_output` |

---

## Dateline Design Notes

1. **Price override via filter at cart time** is the correct pattern. Dateline's tier pricing module should compute `tieredPrice` from the selected tier combination server-side and return it as the authoritative line item price to the payment module.
2. **N-dimensional variation matrix** is the hardest part of the data model. A variation row is essentially a sparse matrix cell: `{typeA: valueA1, typeB: valueB2} → price`. Dateline's DB schema should represent this as a `tiers` table with FK relations rather than serialized postmeta.
3. **Option pricing is additive and independent of the variation.** This is a clean design — the base variation sets the floor price, options stack on top. Dateline should preserve this separation (tier price ≠ option price).
4. **Separate-ticket mode creates N cart items** from one form submission. This maps to N Stripe PaymentIntent line items or N attendee records. The UX is clean; the backend plumbing requires careful handling of partial failures (what if item 2 of 3 goes out of stock during checkout?).
5. **`_evovo_data` snapshot on order** is the audit trail for what was purchased. Dateline should store a pricing snapshot (tier + options + prices at purchase time) on the attendee record for dispute resolution and reporting.
6. **Flat pricing only in v1.1.4.** The commented-out `fees` field (percentage support) shows intent but no implementation. Dateline should build percentage-based fees into the pricing engine from the start (e.g., service fee, venue surcharge).
