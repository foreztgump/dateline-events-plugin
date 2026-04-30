---
plugin: eventon-full-cal
version: 2.1.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-full-cal 2.1.3 — Integrations

---

## Integration Architecture

eventon-full-cal has **one hard dependency** (EventON core) and **no optional integrations**. There are no `class_exists()` checks for other add-ons, no external HTTP calls, no third-party SDKs, and no WordPress plugin activation hooks beyond its own deactivation cleanup. The plugin is a pure rendering add-on.

---

## 1. EventON Core (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded` — plugin self-disables with an admin notice if EventON core or the `evo_addons` class is absent.

The plugin communicates with EventON core exclusively through hooks:

| Hook | Direction | Purpose |
|---|---|---|
| `eventon_appearance_add` | Filter | Inject FullCal colour-picker section into Appearance settings |
| `eventon_inline_styles_array` | Filter | Inject dynamic CSS rules derived from saved colour options |
| `eventon_shortcode_defaults` | Filter | Register full-cal shortcode arg defaults |
| `eventon_shortcode_popup` | Filter | Add "FullCal" entry to WYSIWYG shortcode builder |
| `eventon_events_list_classnames` | Filter | Add FC-specific CSS classes to event list wrapper |
| `eventon_cal_class` | Filter | Add `evoFC` and `evoFC_nextto` classes to calendar container |
| `evo_global_data` | Filter | Inject `'EVOFC'` into JS `global_evo_data.calendars` array |
| `evo_init_ajax_data` | Filter | Inject Handlebars grid templates and i18n strings into JS payload |
| `evo_calendar_defaults` | Filter | Pass UTC offset to calendar defaults for timezone-correct day rendering |
| `evo_frontend_lightbox` | Filter | Register lightbox config when `grid_ux=2` |
| `evo_ajax_cal_before` | Action | Set `fixed_day` from current date before AJAX calendar init |
| `eventon_below_sorts` | Action | Inject loading spinner HTML before grid renders |
| `evo_view_switcher_items` | Action | Add "Month" tab to EventON's view switcher |
| `widgets_init` | Action | Register `evoFC_Widget` |

The `evo_fc_shortcode` class also adds `[add_eventon_fc]` as a WordPress shortcode via `add_shortcode`.

**Shared infrastructure used:**
- EventON's inline-CSS pipeline: colour options are emitted as dynamic CSS rules via the `eventon_inline_styles_array` filter, matching the same mechanism all other EventON add-ons use for theme-able colours.
- EventON's AJAX calendar engine: `evofc_frontend::getCAL()` calls `EVO()->calendar->_get_initial_calendar($atts)` and lets EventON handle all event fetching, pagination, and AJAX responses. FullCal only post-processes the response in JavaScript.
- EventON's version check: `evo_addons::evo_version_check()` is called during `plugin_init` to ensure the installed EventON version meets the minimum requirement (4.8).

---

## 2. No External Services

The plugin makes no outbound HTTP requests, registers no REST API routes, and uses no third-party JavaScript libraries beyond what EventON core already loads. The Handlebars templating is bundled in `fc_script.js` — there is no CDN dependency.

---

## 3. No Inter-Add-On Integrations

Unlike eventon-rsvp, this plugin has no integration files for other EventON add-ons (no QR code, webhook, ActionUser, or virtual events hooks). The view-switcher hook (`evo_view_switcher_items`) is an EventON core hook, not an add-on-to-add-on hook.

---

## Integration Summary Table

| Integration | Required? | Direction | Key Hook / API |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | Multiple hooks (see above) |

---

## Dateline Design Notes

1. **No integration surface to replicate.** Dateline's month-grid view component needs no external integration work — it only needs access to the same event query API that the list view uses.
2. **The view-switcher pattern is the key cross-component contract.** EventON's `evo_view_switcher_items` hook defines a simple interface: a view registers a tab label and a class name; the container handles switching. Dateline's tab bar for List / Month / Week should use an equivalent pattern — a view registry where each view contributes a tab, and the container manages active state.
3. **Timezone offset passthrough.** The `cal_tz_offset` value (UTC offset in hours, sign-inverted) is the only data this plugin adds to the JS payload beyond event data. Dateline should use IANA timezone names and `Intl.DateTimeFormat` for day boundary calculation rather than raw offset integers.
