# eventon-slider — Data Model

## No New Data Structures

This plugin introduces no post types, post meta, or wp_options beyond a settings tab in EventON's admin panel.

## Shortcode

```
[eventon_evo_slider]
```

Arguments are EventON shortcode standard args (event count, category filter, etc.) — no slider-specific data model.

## Settings

Stored in EventON's main options array. Likely includes:
- Autoplay speed
- Display fields (title, date, location, image)
- Number of slides visible

(Specific keys not confirmed from source — admin-init.php not read in detail due to P3 priority.)

## Data Contract

Same as EventON event list: array of events with title, date, image URL, permalink. No new fields needed.
