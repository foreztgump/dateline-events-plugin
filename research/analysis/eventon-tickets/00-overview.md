---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON — Event Tickets: Overview

## Plugin Header

| Field | Value |
|-------|-------|
| Plugin Name | EventON - Event Tickets |
| Plugin URI | http://www.myeventon.com/ |
| Version | 2.4.7 |
| Author | Ashan Jay (AJDE) |
| Requires at least (WordPress) | 6.0 |
| Tested up to | 6.7.2 |
| Requires PHP | not declared in header |
| WC requires at least | 6.0 |
| WC max tested version | 9.0 |
| Text Domain | evotx |
| Domain Path | /lang/ |

## Dependencies

- **EventON core** (≥ 4.7) — checked at `plugins_loaded`; plugin self-disables with admin notice if absent
- **WooCommerce** (≥ 6.0) — checked at `plugins_loaded`; plugin self-disables with admin notice if absent
- `evo_addons` class from EventON core — used for addon version-gating

## File Census

| Directory | PHP Files | Other Notable Files |
|-----------|-----------|---------------------|
| `/` (root) | 2 (`eventon-tickets.php`, `guide.php`) | `changelog.txt`, `__README.txt`, zip archive |
| `includes/` | 22 | — |
| `includes/admin/` | 12 (including views) | — |
| `templates/` | 2 | — |
| `templates/email/` | 1 | — |
| `assets/` | 0 PHP | 6 JS files, 3 CSS files, 2 images |
| `lang/` | 0 PHP | `evotx.pot`, `evotx.mo`, `strings.php` |
| **Total** | **~40** | — |

## Top-Level Directory Map

```
eventon-tickets/
├── eventon-tickets.php          # Plugin bootstrap and main class (evotx)
├── guide.php                    # Developer reference guide (not loaded at runtime)
├── changelog.txt
├── assets/                      # Frontend and admin JS/CSS
├── includes/                    # Core plugin classes
│   ├── admin/                   # Admin-only classes and views
│   ├── class-ajax.php           # Front-end AJAX handlers
│   ├── class-attendees.php      # Attendee data retrieval and display
│   ├── class-email.php          # Ticket email dispatch
│   ├── class-event_ticket.php   # EVOTX_Event — WC product extension of EVO_Event
│   ├── class-evo-tix.php        # evotx_tix — evo-tix CPT creation/management
│   ├── class-evo-tix-cpt.php    # EVO_Ticket — single evo-tix CPT object model
│   ├── class-frontend.php       # Front-end rendering, shortcodes, scripts
│   ├── class-functions.php      # Reusable utility functions
│   ├── class-helper.php         # Price formatting and cart HTML helpers
│   ├── class-integration-actionuser.php      # ActionUser addon integration
│   ├── class-integration-countdown.php       # Countdown addon integration
│   ├── class-integration-general.php         # General integration hooks
│   ├── class-integration-virtualevents.php   # Virtual Events addon integration
│   ├── class-integration-webhooks.php        # Webhooks addon integration
│   ├── class-integration-woocommerce.php     # Core WC hooks (cart, checkout, order lifecycle)
│   ├── class-integration-woocommerce_myaccount.php  # WC My Account tab
│   ├── class-int-wc-afterorder.php           # Post-order display helpers
│   ├── class-post-types.php     # Registers evo-tix CPT
│   ├── class-templates.php      # Template loading helper
│   └── class-appearance.php     # Appearance/CSS integration with EventON
├── templates/
│   ├── template-add-to-cart-single.php    # Simple product add-to-cart UI
│   ├── template-add-to-cart-variable.php  # Variable product add-to-cart UI
│   └── email/
│       └── ticket_confirmation_email.php  # Ticket confirmation email body
└── lang/
    ├── evotx.pot                # Translation source
    └── evotx.mo                 # Compiled binary translation
```

## Key Classes and Their Roles

| Class | Role |
|-------|------|
| `evotx` | Plugin singleton; boots dependencies, loads includes, initialises WooCommerce compatibility |
| `EVOTX_Event` | Extends EventON's `EVO_Event` with WC product access, cart operations, stock checks, and repeat-capacity management |
| `evotx_tix` | Creates `evo-tix` CPT posts when a WC order is processed; resolves ticket numbers and statuses |
| `EVO_Ticket` | Thin object wrapper around a single `evo-tix` post; exposes typed getters for ticket fields |
| `EVOTX_Attendees` | Queries and formats attendee data by event, order, or customer; handles legacy ticket-holder array format |
| `evotx_email` | Composes and dispatches ticket confirmation emails via EventON's email helpers |
| `evotx_front` | Registers front-end scripts/styles, injects ticket UI into EventON event cards, registers shortcodes |
| `EVOTX_WC` | Orchestrates the full WC integration: cart metadata, checkout fields, order-status transitions, stock adjustment |
| `evotx_admin` | Admin init: menu registration, event-duplicate handling, WC order filtering |
| `EVOTX_post_meta_boxes` | Registers all meta boxes on `ajde_events`, `evo-tix`, and WC `product` edit screens |
| `evotx_post_types` | Registers the `evo-tix` custom post type |
| `EVOTX_Virtual_Events` | Gates virtual-event content behind ticket purchase; injects virtual-link into confirmation email |
| `EVOTX_Webhooks` | Emits webhook payloads for `tickets_created` and `ticket_stock_modified` events |
| `evotx_actionuser` | Bridges ticket fields into EventON's ActionUser (front-end event submission) addon |

## Integration Summary

| Integration | Mechanism |
|-------------|-----------|
| **WooCommerce (core)** | Cart metadata injection, checkout field collection (ticket-holder names), order-status transitions trigger ticket creation, stock adjustment, email dispatch, and refund/restock |
| **WooCommerce My Account** | Adds a dedicated "My Tickets" tab listing tickets by order, with check-in status display |
| **Virtual Events** | Ticket purchase gates access to virtual event URLs and pre/during/post-event content; confirmation email appends the virtual link |
| **Webhooks (EventON)** | Fires `tickets_created` and `ticket_stock_modified` webhook payloads via EventON's webhook system |
| **ActionUser** | Surfaces ticket fields (enable tickets, pricing, capacity) inside the ActionUser front-end event submission form |
| **Countdown** | On countdown expiry, marks the associated WC ticket product as out of stock |
