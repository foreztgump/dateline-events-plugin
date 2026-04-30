---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-rsvp — Overview

## Plugin Header Values

| Field | Value |
|---|---|
| Plugin Name | EventON - RSVP Events |
| Plugin URI | http://www.myeventon.com/ |
| Description | Allow visitors to RSVP to your event |
| Author | Ashan Jay |
| Version | 3.0.3 |
| Author URI | http://www.ashanjay.com/ |
| Requires at least | 6.0 |
| Tested up to | 6.6.2 |
| Text Domain | evors |
| Domain Path | /lang/ |

## File Census

| Directory | File count |
|---|---|
| / (root) | 2 (main plugin file + guide.php) |
| includes/ | 12 |
| includes/admin/ | 8 |
| templates/ | 6 |
| lang/ | 2 (.po + .mo) |
| **Total** | **30** |

## Top-Level Directory Map

```
eventon-rsvp/
├── eventon-rsvp.php          # Bootstrap + singleton + CPT registration
├── guide.php                 # Documentation/guide file
├── includes/
│   ├── class-ajax.php                    # Frontend AJAX handlers
│   ├── class-emailing.php                # Email sending orchestration
│   ├── class-event-manager.php           # User-facing event manager page
│   ├── class-event_rsvp.php              # Core RSVP/event business logic
│   ├── class-form.php                    # RSVP form rendering and messaging
│   ├── class-frontend.php                # Frontend event card integration
│   ├── class-functions.php               # CSV export and helper utilities
│   ├── class-rsvp.php                    # EVO_RSVP_CPT post type wrapper object
│   ├── class-shortcode.php               # Shortcode registration
│   ├── class-intergration-actionuser.php # ActionUser addon integration
│   ├── class-intergration-qrcode.php     # QR Code addon integration
│   ├── class-intergration-virtual.php    # Virtual Events addon integration
│   └── class-intergration-webhooks.php   # Webhooks addon integration
│   └── admin/
│       ├── admin-init.php                # Admin bootstrap, menu, trash hooks
│       ├── class-admin-ajax.php          # Admin-side AJAX handlers
│       ├── class-admin-evo-rsvp.php      # CPT list table columns
│       ├── class-lang.php                # Language/translation settings
│       ├── class-settings.php            # RSVP settings tab
│       ├── evo-rsvp_meta_boxes.php       # Meta boxes for events and RSVP posts
│       ├── metabox-content_event.php     # Event edit RSVP section view
│       └── view-event_settings.php       # Per-event RSVP settings view
├── templates/
│   ├── confirmation_email.php            # Confirmation email to attendee
│   ├── notification_email.php            # New/update RSVP notice to admin
│   ├── attendee_notification_email.php   # Update notice to attendee
│   ├── digest_email.php                  # Daily digest email to admin
│   ├── newuser_email.php                 # New account password email
│   └── rsvp_user_manager.php             # Frontend RSVP manager template
└── lang/
    ├── evors.po
    └── evors.mo
```

## Key Classes and Roles

| Class | Role |
|---|---|
| `EventON_rsvp` | Main plugin singleton; bootstraps all includes and registers the `evo-rsvp` custom post type |
| `EVORS_Event` | Business-logic wrapper around an event post; owns capacity checks, guest list retrieval, remaining-space calculations, and RSVP save/update |
| `EVO_RSVP_CPT` | Active-record wrapper around a single `evo-rsvp` CPT post; exposes typed getters/setters for all attendee meta fields |
| `evors_front` | Frontend rendering: injects the RSVP section into event cards and event-top areas, outputs guest list HTML |
| `evors_form` | Renders the RSVP submission form and the post-submit success/update message |
| `evorsvp_ajax` | Handles all public-facing AJAX actions (submit RSVP, find RSVP, check-in, CSV export, manager update) |
| `evors_admin_ajax` | Handles all admin AJAX actions (attendee list, sync counts, email preview, resend, bulk email) |
| `evors_email` | Dispatches all five email types using template-file rendering; reads options for from-address and subject overrides |
| `evorsvp_admin` | Admin-side bootstrap: meta boxes, admin menu, trash handlers, duplication exclusions |
| `EVORS_Settings` | Registers the "RSVP" tab in the main EventON settings screen |
| `evo_rs_shortcode` | Registers `[evo_rsvp_manager]` shortcode and adds RSVP parameters to the main `[add_eventon]` shortcode defaults |
| `evorsvp_functions` | Guest list CSV export and low-level helper functions |
| `evors_event_manager` | Generates the logged-in user's list of events they have RSVPed to |
| `EVORS_Webhooks` | Listens to RSVP save/checkin actions and forwards payloads to configured webhook URLs |
| `evors_actionuser` | Bridges with the ActionUser addon: adds RSVP fields to the ActionUser event-submission form and its manager panel |
| `EVORS_QRcode` | Stub bridge for QR Code addon checkin data |
| `EVORS_Virtual_Events` | Gates virtual event content behind RSVP status; adds confirmation-email hook for virtual links |

## Dependency on EventON Core

The plugin checks for the global `$eventon` object and the `evo_addons` class before initialising. If EventON is absent it shows an admin notice and halts. All data access goes through `EVO()->cal`, `EVO_Event`, and `EVO()->webhooks` — there is no standalone operation.

Minimum required EventON version: **4.7** (set as `$eventon_version`).

## Integration Summary

| Integration | Provided by | What it adds |
|---|---|---|
| Virtual Events | `class-intergration-virtual.php` | Gates virtual-event content behind RSVP; injects virtual-link section into confirmation email; manages sign-in flow for virtual events |
| QR Code | `class-intergration-qrcode.php` | Hook stub — passes RSVP data through the QR checkin pipeline (stub, minimal logic in v3.0.3) |
| Webhooks | `class-intergration-webhooks.php` | Fires outbound webhook on new RSVP and on checkin-status change, carrying attendee + event fields |
| ActionUser | `class-intergration-actionuser.php` | Adds RSVP toggle and capacity fields to ActionUser's frontend event-creation form; shows per-event RSVP stats in the ActionUser event-manager panel |
