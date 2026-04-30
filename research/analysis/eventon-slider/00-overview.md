# eventon-slider — Overview

**Version:** 2.1  
**Classification:** P3 add-on (visual showcase)  
**Entry point:** `eventon-event-slider.php` → `evo_slider` singleton  
**Requires:** EventON ≥ 4.6, WP ≥ 6.0  

## File Census

```
eventon-event-slider.php           — bootstrap, singleton
includes/
  class-shortcode.php              — evosl_shortcode: [eventon_evo_slider] shortcode
  class-frontend.php               — evosl_front: enqueue styles/scripts
  admin/admin-init.php             — settings tab
assets/
  slider_styles.css
  slider_script.js                 — slider JS (likely wraps a slider lib)
guide.php / images/
```

## Architecture

Minimal plugin. A shortcode renders a sliding carousel of events pulled from EventON's event list query. Frontend class enqueues slider CSS/JS. No AJAX, no data model, no hooks beyond standard init/admin.

## Key Observation

Simplest plugin in the set. The slider is a display component: fetch EventON events (same query as the list view) and present them in a horizontal scroll/carousel format. UX pattern is "upcoming events showcase" or "featured events marquee."

## Dateline Relevance

P3 priority. Useful for marketing pages or homepages to spotlight upcoming events. The data contract is identical to the event list — no new backend work required. Purely a frontend component.
