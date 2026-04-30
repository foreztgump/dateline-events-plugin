---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-tickets 2.4.7 — Integrations

---

## Integration Architecture

eventon-tickets is fundamentally a WooCommerce extension — its entire lifecycle is built on WC order states. Every other integration (Virtual Events, Seats, Variations, ActionUser) hooks into the ticket lifecycle via evotx action/filter hooks rather than calling WC directly.

---

## 1. WooCommerce (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded`; plugin self-disables with admin notice if WC ≥ 6.0 is not present.

### Data Model Integration

| evotx entity | WC entity | Relationship |
|---|---|---|
| Ticket configuration | WC Product (simple or variable) | 1:1, auto-created / auto-updated |
| Purchase | WC Order | 1:many (one order → many tickets) |
| `evo-tix` post | WC Order Line Item | 1:1, created on order status transition |

### Hooks Used

| Hook | Direction | Purpose |
|---|---|---|
| `woocommerce_add_cart_item_data` | Filter | Attach event/ticket metadata to cart item |
| `woocommerce_add_to_cart_validation` | Filter | Validate ticket availability before cart add |
| `woocommerce_get_cart_item_from_session` | Filter | Restore ticket meta from session |
| `woocommerce_cart_item_name` | Filter | Append event date to cart item display name |
| `woocommerce_order_item_meta_end` | Action | Show ticket data in WC order admin panel |
| `woocommerce_order_status_*` | Action | Create / update / void `evo-tix` posts on status change |
| `woocommerce_checkout_fields` | Filter | Inject attendee name/email fields at checkout |
| `woocommerce_checkout_order_processed` | Action | Save attendee fields to order meta |
| `woocommerce_before_cart` | Action | Cart session expiry notice (if seats active) |
| `woocommerce_before_checkout_form` | Action | Checkout session expiry notice (if seats active) |
| `woocommerce_account_menu_items` | Filter | Add "My Tickets" tab to My Account |
| `woocommerce_account_tickets_endpoint` | Action | Render My Tickets tab content |
| `woocommerce_admin_order_data_after_payment_info` | Action | Inject ticket info panels in order edit |

### Order Status → Ticket State Mapping

| WC Order Status | Ticket Action |
|---|---|
| `pending` → `processing` | `evo-tix` post created; stock decremented |
| `processing` → `completed` | Ticket confirmation email sent |
| `completed` → `refunded` | Stock restored (if `evotx_auto_restock` enabled); `evo-tix` post trashed |
| `processing` → `cancelled` | Stock restored; `evo-tix` post trashed |
| `processing` → `failed` | Stock restored; `evo-tix` post trashed |

**Important:** Static analysis found a warning: "When refunding orders, you must NOT restock refunded items in WooCommerce order." The plugin handles restocking itself via the hooks above — double-restocking via WC's built-in restock mechanism would cause inventory errors.

---

## 2. Virtual Events (EventON Virtual — Optional)

**Detection:** `class_exists` guard.

Three-level content gate controlled per event:

| Gate | When applied |
|---|---|
| Pre-event content | Event has not started; non-buyers see placeholder |
| Live event link | Event is live; non-buyers see "Purchase ticket now to join" |
| Post-event content | Event has ended; non-buyers see placeholder |

**Virtual event link delivery:** Appended to the ticket confirmation email via the evotx email template hooks.

**Sign-in attendance:** When a paid attendee "joins" the virtual event, `evo-tix` post is updated with `signin=y` timestamp.

---

## 3. EventON Seats (evonton-seats — Optional)

**Detection:** `class_exists('EVO_seats')` guard within evonton-seats itself. Integration hooks are registered by evonton-seats, not evonton-tickets.

The seat integration extends the ticket lifecycle:

| Phase | Seats integration |
|---|---|
| Cart add | Attaches `evost_data` (seat slug, number, type) to cart item; seat status set to `tuav` (temporarily unavailable) |
| Cart display | Appends "Section / Row / Seat X" to cart item name |
| Checkout | Writes seat data to WC order line-item meta and `evo-tix` post |
| Order complete | Seat status set to `uav` (sold) |
| Refund / cancel | Seat status reset to `av` (available) |
| Confirmation email | Seat block (Section, Row, Seat) appended to email body |

The seat price **overrides** the WC product base price via the `evotx_ticket_item_price_for_cart` filter.

---

## 4. Ticket Variations & Options (eventon-ticket-variations-options — Optional)

Similar integration pattern — evonto-ticket-variations-options hooks into evotx lifecycle:

| Phase | Variations integration |
|---|---|
| Frontend template | Replaces default ticket HTML with variation UI |
| Cart add | Injects `evovo_price` (variation + options total) into cart item data |
| Cart item price | `evotx_ticket_item_price_for_cart` filter returns `evovo_price` |
| Order complete | Variation/option stock decremented |
| Refund | Variation/option stock restored |

---

## 5. EventON Webhooks (Optional)

Two outbound webhook triggers registered in EventON's webhook system:

### `tickets_created`

| Attribute | Value |
|---|---|
| Trigger | After all tickets for a WC order are generated |
| Hook | Post-order-processing evotx action |
| Payload | `order_id`, `ticket_numbers[]` (array of `evo-tix` post IDs) |

### `ticket_stock_modified`

| Attribute | Value |
|---|---|
| Trigger | Any stock adjustment (add, restock, manual) |
| Payload | `order_id`, `item_id`, `event_id`, `action` (reduce or restock), `qty` |

No retry / queue. Synchronous delivery within the order processing request.

---

## 6. EventON Countdown (Optional)

Minimal integration: when the countdown timer reaches zero, the linked WC product's stock status is immediately set to `outofstock`. This closes ticket sales at the countdown target without any cron delay.

---

## 7. ActionUser (Optional)

Surfaces the full ticket configuration UI (enable/disable, pricing, capacity, repeat-cap) inside the ActionUser front-end event submission form. Event organizers can configure ticket pricing without admin access. Data is saved via the same `update_post_meta` path as the admin metabox.

---

## Integration Summary Table

| Integration | Required? | Type | Key Touch Points |
|---|---|---|---|
| WooCommerce | Yes | Core | Product, cart, checkout, order status hooks |
| Virtual Events | Optional | Gate | Email hooks, signin status |
| Seats | Optional | Extends lifecycle | `evotx_*` hooks, seat status transitions |
| Ticket Variations | Optional | Extends lifecycle | `evotx_ticket_item_price_for_cart`, cart/order hooks |
| Webhooks | Optional | Outbound | `tickets_created`, `ticket_stock_modified` |
| Countdown | Optional | Outbound | Stock status on timer expiry |
| ActionUser | Optional | Frontend form | `update_post_meta` for ticket config |

---

## Dateline Design Notes

1. **The WC dependency is structural, not incidental.** eventon-tickets delegates cart, checkout, payment, and order management entirely to WC. Dateline must build or choose its own equivalent for each layer.
2. **Payment gateway is WC's responsibility** — eventon-tickets never touches Stripe or any gateway directly. Dateline will use Stripe directly (per PRD); the ticket lifecycle maps to Stripe payment intents, not WC order statuses.
3. **The `evotx_*` hook family is the extension API.** Seats and variations add UX and pricing without touching WC internals — they communicate through the ticket lifecycle hooks. Dateline should design an equivalent hook contract for the Seats and Variations modules.
4. **Webhook payloads are minimal.** `tickets_created` only sends `order_id` + `ticket_numbers[]` — downstream consumers need to call back to get ticket details. Dateline should include full event + attendee data in webhook payloads for one-pass integrations.
5. **WC Block Checkout not supported** — confirmed in source. All Stripe Payment Element integration work should target Dateline's own checkout, not WC.
