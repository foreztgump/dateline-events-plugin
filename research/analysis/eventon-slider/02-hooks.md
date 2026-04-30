# eventon-slider — Hooks

## Minimal Hook Surface

The plugin wires into standard EventON init hooks only:

- `plugins_loaded` → version check, addon registration
- `init` → `evosl_shortcode` registration, `evosl_front` init
- `admin_menu` → settings tab (admin-init.php)
- `plugin_action_links_{slug}` → "Guide" link in plugins list

No custom actions/filters fired or consumed beyond EventON's standard add-on lifecycle.

## No REST Endpoints

Events are fetched via EventON's existing shortcode/AJAX mechanism.

## Dateline Design Implications

Trivial to implement. A `<EventSlider />` React component that accepts the same events array as the list/grid views and renders a carousel. No backend changes needed.
