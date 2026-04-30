# eventon-rsvp-invitees — Overview

**Version:** 1.0.2  
**Classification:** P2 add-on (gated/private event RSVP)  
**Entry point:** `eventon-rsvp-invitees.php` → `evorsi` singleton  
**Text domain:** `evorsi`  
**Requires:** EventON ≥ 4.6, EventON RSVP ≥ 3.0, WP ≥ 6.0  

## File Census

```
eventon-rsvp-invitees.php               — bootstrap, singleton
includes/
  class-event_invitees.php              — EVORSI_Invitees: query + stats (extends EVORS_Event)
  class-invitee.php                     — EVORSI_Invitee: per-invitee object (extends EVO_RSVP_CPT)
  class-invitee_manager.php             — EVORSI_Manager: admin UI for managing invitee list
  class-frontend.php                    — evorsi_frontend: hook wiring, token verification, UI
  class-admin.php                       — evorsi_admin: admin settings
  class-template_views.php             — (template helpers)
assets/
  evorsi.css / evorsi.js
templates/
  invitation_email.php                  — email template
lang/
```

## Dependency Map

```
evorsi
  └─ requires EVORS (EventON RSVP) ≥ 3.0
      └─ requires EventON core ≥ 4.6
EVORSI_Invitees  extends  EVORS_Event
EVORSI_Invitee   extends  EVO_RSVP_CPT
```

## Architecture

Three-layer design:

- **EVORSI_Invitee** — single invitee record wrapper (status, token link, messages, RSVP status).
- **EVORSI_Invitees** — event-level collection (query all invitees, stats, message wall, is_invited? token verification).
- **evorsi_frontend** — hook-heavy presentation: intercepts standard RSVP form with invite token, controls visibility, handles message wall, sends invitation email.

## Core Mechanism

Token-gated RSVP via URL parameter `?invite=<base64(email-inviteeId)>`. The frontend checks the token on every relevant hook, loading invitee identity from it. Only invited guests can RSVP when invitee mode is active.
