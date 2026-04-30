---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON Seats — Overview

## Plugin Header

| Field | Value |
|---|---|
| Plugin Name | EventON - Seats |
| Version | 1.2.6 |
| Author | Ashan Jay |
| Text Domain | `evost` |
| Domain Path | `/lang/` |
| Requires at least | WordPress 6.0 |
| Tested up to | 6.5.3 |
| Bootstrap constant | `EVOST()` (singleton) |

## Hard Dependencies

| Dependency | Minimum Version | Notes |
|---|---|---|
| EventON core | 4.6.5 | Requires `$GLOBALS['eventon']` and `evo_addons` class |
| eventon-tickets (evotx) | 2.3 | Requires `EVOTX()` fully initiated |
| WooCommerce | (not pinned) | Required for cart/checkout integration |

If any dependency is missing or below version, the plugin shows an admin notice and halts loading.

## Top-Level Directory Map

```
eventon-seats/
├── eventon-seats.php        # Bootstrap: singleton EVO_seats, plugin_init
├── assets/                  # JS/CSS (seat map renderer, admin editor, vendor libs)
├── includes/                # All PHP classes
│   ├── admin/               # Admin-only classes (editor, post meta, settings)
│   └── class-*.php          # Core + frontend classes
├── lang/                    # Localization: evost.pot, evost.mo
├── changelog.txt
└── guide.php
```

## File Census

| Directory | PHP file count | Notes |
|---|---|---|
| root | 1 | `eventon-seats.php` |
| `includes/` | 11 | Core classes |
| `includes/admin/` | 3 | Admin-only classes |
| `assets/` | — | JS/CSS only (not PHP) |
| `lang/` | — | `.pot` + `.mo` only |

**Total PHP files: 15**

## Key Classes and Roles

| Class | File | Role |
|---|---|---|
| `EVO_seats` | `eventon-seats.php` | Plugin singleton; dependency checks; orchestrates includes |
| `EVOST_Seats` | `class-event_seats.php` | Core data model: load/save seat map from postmeta; individual seat status mutations; WC stock sync |
| `EVOST_Expirations` | `class-seat_expirations.php` | Seat-hold lifecycle: add hold on cart-add, release on expiry or cart-remove; reads/writes the `_evost_expiration` option |
| `EVOST_Seats_Json` | `class-event_seats_json.php` | Extends `EVOST_Expirations`; serialises seat map to JSON for the JS renderer; computes available capacity for non-assigned sections |
| `EVOST_Seats_Seat` | `class-event_seats_seat.php` | Per-seat helper: availability check, price, seat number, cart presence — used by AJAX handlers |
| `EVOST_Seats_Una` | `class-event_seats_section.php` | Unassigned-seating helper; handles capacity + expiry for area/booth sections (file name is misleading) |
| `EVOST_Sesh` | `class-event_seats_session.php` | Stub; not used in v1.2.6 (empty `add_seat_to_sesh()` method) |
| `EVOST_Seat_Map_Editor` | `admin/class-seat-map-editor.php` | Admin AJAX handler for the seat-map editor lightbox: create/edit/delete sections, rows, seats, save position drag data, duplicate sections, upload JSON map, clear map |
| `EVOST_Temp` | `class-template_views.php` | Injects Handlebars templates (seat map, cart stub, tooltips) into EventON's template registry at page load |
| `evost_front` | `class-frontend.php` | Enqueues frontend assets; exposes `get_seat_type()` slug-to-type classifier |
| `evost_tickets` | `class-integration-tickets.php` | Hooks into eventon-tickets lifecycle (add-to-cart, checkout, order, email, attendee list) to attach seat data |
| `EVO_Seats_QR` | `class-integration-qrcode.php` | Appends seat number and readable seat info to QR-code output via `evoqr_data_output` filter |
| `evost_admin` | `admin/class-admin.php` | Admin settings tab, WC hidden meta, event list column, event duplication hooks |
| `evost_meta_boxes` | `admin/class-post_meta.php` | Adds seat-chart enable toggle and editor trigger to the eventon-tickets event metabox |
| `EVOST_ajax` | `class-ajax.php` | Frontend AJAX actions: load seat data, seat preview, direct add-to-cart, remove seat, refresh map |

## Seat-Map JS Note

The seat-map canvas UI is entirely implemented in assets/ JavaScript (`ST_admin_script.js`, `ST_script.js`, `evost_map_draw.js` using Handlebars templates) and is **not analyzed for code** in this report. UX inventory appears in `03-features.md § Assets inventory`.

## Seat Type Taxonomy (from `evost_front::get_seat_type()`)

| Slug pattern | Type string | Description |
|---|---|---|
| Contains `-` and no `B` | `seat` | Assigned individual seat |
| No `-` separator | `unaseat` | Unassigned capacity area |
| Contains `B` | `booseat` | Booth seat (unassigned, capacity 1) |
