# eventon-wishlist-add-on — Overview

**Version:** 1.1.2  
**Classification:** P3 add-on (gamification / saved events)  
**Entry point:** `eventon-wishlist.php` → `evowi` singleton  
**Requires:** EventON ≥ 4.2, WP ≥ 6.0  

## File Census

```
eventon-wishlist.php                — bootstrap, singleton
includes/
  class-functions.php               — evowi_functions: helper utilities
  class-frontend.php                — evowi_frontend: enqueue, event card UI
  class-wishlist_manager.php        — EVOWI_Wishlist_Manager: [add_eventon_wishlist_manager] shortcode
  class-ajax.php                    — AJAX handlers (add/remove wishlist, load wishlist)
  admin/admin_init.php              — admin settings
assets/
  wishlist.css / wishlist.js
templates/
  wishlist-manager.php              — user-facing wishlist management page
lang/
```

## Architecture

User-facing feature: a logged-in (or cookie-tracked) user can "star" events to save them to a personal wishlist. The wishlist manager page shows all saved events.

```
evowi
  └─ evowi_frontend: adds bookmark/star button to event cards via hooks
  └─ EVOWI_Wishlist_Manager: [add_eventon_wishlist_manager] shortcode → full page list
  └─ EVOWI_Wishlist_Manager (AJAX): add/remove wishlist entries + load wishlist data
  └─ evowi_functions: persistence helpers (likely user meta or cookie)
```

## Core Mechanism

Heart/star button injected into EventON event cards. On click, AJAX call adds/removes the event from the user's wishlist. A dedicated "wishlist manager" page (via shortcode) displays all saved events.

## Dateline Relevance

P3 priority. Common gamification/UX feature for returning visitors. Maps to a simple user-event bookmark table. No complex logic.
