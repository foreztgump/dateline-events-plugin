---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-seats 1.2.6 — Integrations

---

## Integration Architecture

eventon-seats integrates with evonton-tickets via hooks exclusively. It does not call WooCommerce functions directly — all WC interaction is mediated through evotx filter/action hooks. The plugin is designed as a transparent overlay on top of the tickets lifecycle.

---

## 1. EventON Core (Required Transitively)

Through the evonton-tickets dependency. Seats does not hook EventON core directly.

---

## 2. eventon-tickets (Required)

**Type:** Hard dependency (though not checked via `require` — seats hooks fire only when evotx is active).

All integration is via the `evotx_*` hook family:

| Hook | Direction | Purpose |
|---|---|---|
| `evotx_single_product_temp` | Filter | Replace ticket template HTML with seat picker |
| `evotx_add_ticket_to_cart_before` | Action | Verify seat availability before cart add |
| `evotx_add_cart_item_meta` | Filter | Attach `evost_data` (seat slug, number, type) and `_evost_seat_price` to cart item |
| `evotx_ticket_item_price_for_cart` | Filter | Override base ticket price with seat-specific price |
| `evotx_cart_item_name` | Filter | Append "Section / Row / Seat X" to cart item display |
| `evotx_after_ticket_added_to_cart` | Action | Create hold record in `_evost_expiration` option |
| `evotx_cart_ticket_removed` | Action | Release hold when item removed from cart |
| `evotx_adjust_orderitem_ticket_stock` | Action | Set seat to `uav` on order complete; restore on refund/cancel |
| `evotx_get_attendees_for_event` | Filter | Add seat data (type, number, slug) to attendee array |
| `evotx_ticket_confirmation_email` | Filter/Action | Append seat block to confirmation email body |

### Cart Item Hold Implementation

On `evotx_after_ticket_added_to_cart`:
1. `add_seat_temphold()` writes `[event_id][seat_slug][cart_item_key] = {time: expiry_ts, qty}` to the `_evost_expiration` WP option
2. For assigned seats: postmeta updated → `tuav` status
3. For unassigned seats: section's `sold` counter incremented
4. All other seats in the user's cart have their expiry timer reset

### Expiry Mechanism

- Check runs synchronously inside `__j_get_all_sections()` on every seat map load
- Expired holds: seat freed, WC cart item removed, notice queued
- No background cron — expiry only happens when the seat map is next loaded

---

## 3. WooCommerce (Indirect — via evotx hooks)

eventon-seats never calls WC functions directly. All WC interaction flows through evotx hooks. The one indirect WC integration:

- **Stock sync:** After every seat map editor save, the associated WC product's managed-stock quantity is updated to match the count of available seats (`WC_Product::set_stock_quantity()`).
- **Cart/Checkout notices:** `woocommerce_before_cart` / `woocommerce_before_checkout_form` hooks are used by `EVOST_Expirations` to inject the session timeout notice.

---

## 4. eventon-ticket-variations-options (Optional)

When variations addon is active, seat sections can have variation/option pricing attached. The integration is managed from evonto-ticket-variations-options side:

- Variations are scoped to a `parent_type = 'seat'`, `parent_id = section_id`
- The VO editor is embedded inside the seat section edit form
- Seat section duplication clones all VO items
- Seat section deletion cascades to delete VO items
- Stock for seat-parented variations is derived from seat capacity (not variation's own stock field)

---

## 5. QR Code (eventon-qrcode — Optional)

**File:** `class-evo-seats-qrcode.php` (within evonton-seats).
**Hook:** `evoqr_data_output` filter.

Appends to QR scan display when a ticket has a seat:
- `Seat-Number`: raw seat number
- `Seat-Info`: formatted "Section Letter (Name), Row Letter, Seat Number"

Seat data is read from `evo-tix` postmeta set at checkout time.

---

## Integration Summary Table

| Integration | Required? | Type | Primary Hooks |
|---|---|---|---|
| EventON Core | Yes (transitive) | Transitive | Through evotx |
| eventon-tickets | Yes | Extends lifecycle | `evotx_*` hook family |
| WooCommerce | Yes (transitive) | Indirect | Stock sync, cart notices |
| Ticket Variations | Optional | Bidirectional | Seat section → VO parent |
| QR Code | Optional | Outbound | `evoqr_data_output` |

---

## Dateline Design Notes

1. **Hook-based extension is the right pattern.** Seats extends tickets without coupling to WC internals. Dateline's seating module should hook into the ticket module's lifecycle contract (e.g., `ticket:beforeAdd`, `ticket:confirm`, `ticket:refund`) rather than directly into Stripe or the DB.
2. **The hold model is the core complexity.** The entire session expiry system (`_evost_expiration` option + inlined expiry check) is what makes seats architecturally hard. Dateline's KV-based hold (`hold:{cartId}` + TTL 600s + cron sweep) solves this more cleanly.
3. **Seat price overrides base product price.** This is the `evotx_ticket_item_price_for_cart` pattern — the seat price completely replaces the WC product price. Dateline's pricing model should support section-level, row-level, and seat-level price overrides with a clear precedence chain.
4. **Section types map to Dateline tier types:** `def` = assigned seating, `una` = general admission pool, `boo` = table/booth. All three are needed for a full venue management feature.
5. **No concurrent capacity protection.** Two users grabbing the last seat simultaneously could both succeed at the `add_seat_temphold()` level because there's no atomic check-and-set. Dateline must use KV atomic operations for this.
