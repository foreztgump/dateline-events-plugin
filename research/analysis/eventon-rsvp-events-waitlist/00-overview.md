# eventon-rsvp-events-waitlist — Overview

**Version:** 1.1.1  
**Classification:** P2 add-on (capacity management extension)  
**Entry point:** `eventon-rsvp-waitlist.php` → `EVORSW` singleton  
**Text domain:** `evorsw`  
**Requires:** EventON ≥ 4.3, EventON RSVP ≥ 2.9, WP ≥ 6.0  

## File Census

```
eventon-rsvp-waitlist.php          — bootstrap, singleton, dependency checks
includes/
  class-event-waitlist.php         — EVORSW_Waitlist: core waitlist logic
  class-frontend.php               — EVORSW_Front: hook wiring, form/display integration
  class-intergrations.php          — EVORSW_Intergrations: ActionUser event manager UI
assets/                            — CSS/JS
templates/                         — (empty, no custom templates found)
lang/                              — i18n
```

## Dependency Map

```
EVORSW
  └─ requires EVORS (EventON RSVP) ≥ 2.9
      └─ requires EventON core ≥ 4.3
          └─ requires WordPress ≥ 6.0

EVORSW_Waitlist
  └─ wraps EVORS_Event + EVO_RSVP_CPT (from RSVP addon)

EVORSW_Front
  └─ hooks into ~18 evors_* filters/actions

EVORSW_Intergrations
  └─ hooks into 2 evors_au_* actions (ActionUser addon)
```

## Architecture

Single-responsibility split:

- **EVORSW_Waitlist** — pure data object: checks capacity, gets waitlist posts, offers spaces, adds/removes from waitlist.
- **EVORSW_Front** — presentation layer: intercepts RSVP form flow, injects UI elements, modifies emails.
- **EVORSW_Intergrations** — third-party bridge: shows waitlist count in ActionUser's event manager panel.

## Data Storage

Waitlist entries are stored as `evo-rsvp` CPTs (same type as regular RSVPs) with:
- `rsvp_type` meta = `'waitlist'`
- `status` meta = `'waitlist'`
- `e_id` meta = event post ID

No custom tables or custom post types introduced.
