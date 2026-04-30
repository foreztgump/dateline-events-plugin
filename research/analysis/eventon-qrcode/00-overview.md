# eventon-qrcode — Overview

**Version:** 2.0.3  
**Classification:** P2 add-on (ticket validation / check-in)  
**Entry point:** `eventon-qrcode.php` → `EventON_qr` singleton  
**Text domain:** none (i18n minimal; uses `evo_lang()`)  
**Requires:** EventON ≥ 4.6, WP ≥ 6.0; optional: RSVP addon ≥ 2.6, Tickets addon ≥ 2.3  

## File Census

```
eventon-qrcode.php                   — bootstrap, singleton
includes/
  class-checkin.php                  — evoqr_checkin: QR generation, check-in page, validation
  class-api.php                      — EVOQR_API: REST API endpoints
  class-shortcode.php                — evo_qr_shortcode: [eventon_checkin] shortcode
  barcode.php                        — (legacy barcode lib, appears unused in 2.0.3)
  admin/
    admin-init.php                   — settings page
assets/
  checkin_styles.css
templates/
  checking.php                       — check-in page template
lang/
```

## Dependency Map

```
EventON_qr
  └─ requires EventON core ≥ 4.6
  └─ optional: EVORS (RSVP addon) ≥ 2.6
  └─ optional: EVOTX (Tickets addon) ≥ 2.3
  └─ external: api.qrserver.com (QR image generation, HTTP)

evoqr_checkin
  └─ uses EVO_RSVP_CPT (RSVP records)
  └─ uses EVO_Ticket / EVOTX_Attendees (ticket records)
  └─ uses WC_Order (WooCommerce order status checks)

EVOQR_API
  └─ registers REST routes under /eventon/ namespace
```

## Architecture

Two entry paths for check-in:

1. **Web check-in page** — A designated WP page renders `checking.php` via `template_loader`. Staff visits `checkin_page?id=<ticket_number>` to check in guests. Supports scanner gun mode (auto-submit on scan).
2. **REST API** — Four endpoints under `/eventon/` for external scanner apps or integrations.

QR image generation delegates to `api.qrserver.com` (external HTTP call), downloads the image, uploads it to WordPress media library in a custom `evo_qr_codes/` subfolder, and caches the URL in postmeta.
