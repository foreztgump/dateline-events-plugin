---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-ticket-variations-options — Overview

## Plugin Header

| Field | Value |
|---|---|
| Plugin Name | EventON - Ticket Variations & Options |
| Plugin URI | http://www.myeventon.com/addons/ticket-variations-options |
| Description | Extend tickets with variations and options |
| Author | Ashan Jay |
| Version | 1.1.4 |
| Requires at least | WordPress 6.0 |
| Tested up to | 6.5.3 |
| Text Domain | `evovo` |
| Domain Path | `/lang/` |
| Internal constant | `evovo::$version = '1.1.4'` |
| Required eventon version | 4.6.5 |
| Required evotx (tickets) version | 2.3 |

## File Census

| Directory | PHP files | Notes |
|---|---|---|
| `/` (root) | 2 | Main plugin bootstrap + `guide.php` |
| `includes/` | 7 | Core classes |
| `includes/admin/` | 4 | Admin-only classes |
| `lang/` | 0 PHP | `.pot` + `.mo` only |
| `assets/` | 0 PHP | CSS / JS only |
| **Total PHP** | **13** | |

## Top-Level Directory Map

```
eventon-ticket-variations-options/
├── eventon-ticket-variations-options.php   # Bootstrap singleton (class evovo)
├── guide.php                               # Static HTML guide page
├── changelog.txt
├── assets/                                 # evovo_styles.css, evovo_script.js, evovo_admin_styles.css, evovo_admin_script.js
├── lang/                                   # evovo.pot, evovo.mo
└── includes/
    ├── class-functions.php                 # Thin helper placeholder (class evovo_fnc, empty)
    ├── class-frontend.php                  # Asset registration + language helper
    ├── class-ajax.php                      # Deprecated frontend AJAX stub (no active handlers)
    ├── class-event-variations_options.php  # Core data/HTML class — the heart of the plugin
    ├── class-integration-tickets.php       # evotx (WooCommerce tickets) integration
    ├── class-integration-seats.php         # evost (seat map) integration
    ├── class-integration-booking.php       # evobo (booking blocks) integration
    ├── class-integration-qr.php            # evoqr (QR code) integration, trivial
    └── admin/
        ├── class-admin.php                 # Admin init, duplicate-event, enqueue scripts
        ├── class-admin-ajax.php            # All admin AJAX handlers (VO form get/save/delete/settings)
        ├── class-lang.php                  # Language string additions to EventON settings tab
        └── class-post_meta.php             # Event post metabox injection into evotx metabox
```

## Key Classes and Their Roles

| Class | File | Role |
|---|---|---|
| `evovo` | `eventon-ticket-variations-options.php` | Bootstrap singleton; dependency checks; includes all sub-classes |
| `EVOVO_Var_opts` | `class-event-variations_options.php` | Core: manages the three VO method types (variation_type, variation, option); reads/writes postmeta; renders frontend HTML |
| `evovo_frontend` | `class-frontend.php` | Registers and enqueues CSS/JS assets; exposes language helper functions |
| `evovo_ajax` | `class-ajax.php` | Deprecated AJAX class — all handlers commented out, no active wp_ajax_ endpoints |
| `EVOVO_tx` | `class-integration-tickets.php` | Hooks into evotx (WooCommerce ticket addon) to inject VO data at add-to-cart, cart display, checkout, email, attendee list, CSV export, and stock management |
| `EVOVO_Seats` | `class-integration-seats.php` | Hooks into evost (seat map addon) to attach variations to seat sections; manages seat-based stock overrides |
| `EVOVO_BO` | `class-integration-booking.php` | Hooks into evobo (booking blocks addon) to attach variations to booking time slots; handles auto-generator duplication |
| `evovo_admin` | `includes/admin/class-admin.php` | Admin init, asset enqueue, duplicate-event postmeta copy, WC order item meta hiding |
| `evovo_admin_ajax` | `includes/admin/class-admin-ajax.php` | All admin AJAX: get/save/delete VO items, settings form, drag-drop reorder |
| `evovo_meta_boxes` | `includes/admin/class-post_meta.php` | Injects the "Enable ticket variations & options" toggle into the evotx metabox on the event edit screen |

## Dependencies

| Dependency | Required | Notes |
|---|---|---|
| EventON (main) | Yes | Global `$eventon`; version ≥ 4.6.5 |
| WooCommerce | Yes | `WooCommerce` class |
| evotx (Event Tickets) | Yes | `evotx` class; version ≥ 2.3 |
| evost (Seats) | Optional | `EVO_seats` class; activates seat integration if present |
| evobo (Booking) | Optional | `EVOBO_Blocks` class; activates booking integration if present |
| evoqr (QR Code) | Optional | Trivial data-passthrough integration |

## Purpose Summary

This plugin extends EventON's ticket system (evotx) with two combinatoric pricing layers: **Ticket Variations** (mutually exclusive ticket "tiers" where the customer selects exactly one combination of variation-type options, e.g., "VIP / Standing") and **Price Options** (optional add-ons that stack on top of the base ticket price, e.g., "Add parking +$5"). All data is stored as serialized PHP arrays in WordPress postmeta on the event post. The plugin integrates with three sibling addons (tickets, seats, booking) and is the primary source of truth for combinatoric/additive pricing in the EventON ecosystem.
