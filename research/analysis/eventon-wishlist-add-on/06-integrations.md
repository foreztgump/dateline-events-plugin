---
plugin: eventon-wishlist-add-on
version: 1.1.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-wishlist-add-on 1.1.2 — Integrations

---

## Integration Architecture

The wishlist add-on integrates exclusively with EventON core. It has **no optional external integrations** and **no external service dependencies**. There is no WooCommerce coupling, no REST API, no webhook system, and no companion add-ons.

---

## 1. EventON Core (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded` priority 0; plugin self-disables with admin notice if `$GLOBALS['eventon']` is absent or `evo_addons` class does not exist. A version check (`evo_version_check()`) is run before any further initialization.

### Hooks Consumed

| Hook | Type | Purpose |
|---|---|---|
| `init` (priority 0) | Action | Primary plugin initialization — includes all class files, instantiates frontend and manager |
| `eventon_shortcode_defaults` | Filter | Registers `wishlist` and `wishlist_filter` shortcode defaults |
| `eventon_shortcode_popup` | Filter | Adds `wishlist` Yes/No field to shortcode generator UI; registers `add_eventon_wishlist_manager` shortcode entry |
| `eventon_calhead_shortcode_args` | Filter | Propagates `wishlist` and `wishlist_filter` flags to the calendar header args |
| `evo_eventtop_adds` | Filter | Registers the `evowi` slot in EventON's eventTop component registry |
| `eventon_eventtop_evowi` | Filter | Renders heart button HTML into the `evowi` eventTop slot |
| `eventon_wp_query_args` | Filter | Injects `post__in` constraint when `wishlist_filter='yes'` to restrict WP_Query to wishlisted event IDs |
| `eventon_wp_queried_events_list` | Filter | Post-query filter to remove repeat instances not in the user's wishlist |
| `evo_ajax_cal_before` | Action | Sets the date range and additional shortcode args before initial AJAX calendar load for wishlist manager |
| `evo_init_ajax_wparg_additions` | Filter | Adds `post__in` constraint for the initial AJAX calendar query in wishlist manager |
| `evo_generate_events_before_process` | Filter | Filters repeat instances out of the event list before HTML generation in wishlist manager |
| `evo_frontend_lightbox` | Filter | Registers the `evowl_lightbox` lightbox definition into EventON's lightbox system |
| `evo_addon_styles` | Action | Inlines wishlist CSS via EventON's inline style pipeline |
| `eventon_settings_lang_tab_content` | Filter | Appends wishlist language strings to EventON's Language settings panel |
| `eventon_custom_icons` | Filter | Appends two icon picker fields to EventON's icon settings panel |
| `evo_se_setting_fields` | Filter | Appends "Wish List Settings" sub-section to EventON general settings |
| `eventon_event_submitbox_misc_actions` | Action | Adds wishlist count badge to event edit screen's Publish metabox |
| `manage_edit-ajde_events_columns` | Filter | Adds "Likes" column to the Events CPT list table |
| `manage_ajde_events_posts_custom_column` | Action | Renders like-count pill in the "Likes" column |
| `wp_ajax_evowi_change_wishlist` | Action | AJAX handler (authenticated users) |
| `wp_ajax_nopriv_evowi_change_wishlist` | Action | AJAX handler (unauthenticated users — returns "not logged in" response) |

### Shared Infrastructure

- **EventON shortcode generator:** The manager shortcode fields (`event_past_future`, `number_of_months`, `lang`, `etc_override`) are pulled from EventON's own shortcode field library via `EVO()->shortcode_gen->shortcode_default_field()`.
- **EventON calendar renderer:** The wishlist manager delegates entirely to `EVO()->calendar->_get_initial_calendar()` — the plugin renders no custom event list HTML of its own.
- **EventON multilingual:** All strings use `evo_lang()` / `evo_lang_e()`, reading from EventON's language options store.
- **EventON login URL helper:** `evo_login_url()` is used to build login redirect links (respects any custom login URL configured in EventON settings).
- **EventON icon helper:** `get_eventON_icon()` resolves saved icon class overrides.

---

## 2. Storage Backend (WordPress Options)

**No user meta is used.** All wishlist data is stored in a single WordPress option, `_evo_wishlist`, as an associative array keyed by WordPress user ID:

```
_evo_wishlist = [
    <user_id_int> => [
        "<event_id>-<repeat_interval>",
        "<event_id>-<repeat_interval>",
        ...
    ],
    ...
]
```

Each entry encodes both the event post ID and the recurrence instance as a hyphen-delimited string. A non-recurring event uses `<event_id>-0`. The entire option is read and written on every add/remove operation via `get_option` / `update_option` — there is no per-user or per-event granularity in the storage access.

This structure is a single-row WP options table entry. At scale, with many users and many wishlisted events, the serialized array will become large, and the write contention on a single option row will be a bottleneck.

---

## 3. WordPress User System

**Logged-in users only** for adding/removing. The AJAX handler checks `is_user_logged_in()` before processing any state change. Unauthenticated clicks surface a login prompt in a lightbox — no anonymous or cookie-based wishlist is supported. Count display (how many users have wishlisted an event) is visible to all users regardless of login state.

There is no role restriction — any authenticated WordPress user can wishlist events.

---

## 4. WordPress Admin-Ajax

All AJAX communication uses `wp-admin/admin-ajax.php`. A single action (`evowi_change_wishlist`) handles both add and remove via a `newstatus` parameter. The request includes a nonce (`evowi_nonce`) for CSRF protection. There are no REST API endpoints.

---

## 5. No External Services

The add-on makes no outbound HTTP requests and registers no webhook triggers. There is no email notification on wishlist add/remove. There is no integration with WooCommerce, payment processors, or any third-party API.

---

## Integration Summary

| Integration | Required? | Direction | Mechanism |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | Hooks (filters + actions) |
| WordPress Options API | Yes | Read/Write | `get_option` / `update_option` on `_evo_wishlist` |
| WordPress User System | Yes | Read | `is_user_logged_in()`, `get_current_user_id()` |
| WordPress Admin-Ajax | Yes | Inbound | `wp_ajax_evowi_change_wishlist` |
| WooCommerce | None | — | — |
| External APIs | None | — | — |

---

## Dateline Design Notes

1. **Storage model is the critical design decision.** The single-option row approach is not viable at scale. Dateline should use a dedicated `event_bookmarks (user_id, event_id, occurrence_key, created_at)` table (or KV equivalent) with indexed lookups per user and per event.
2. **Count display is public.** The wishlist count shown on event cards is visible to all visitors. Dateline should support this as an optional "popularity signal" on event cards, read from an aggregate counter rather than a full table scan.
3. **Login gate matches EventON pattern.** Anonymous wishlisting is not supported here; Dateline can follow the same pattern (login required) or extend to session-cookie-based anonymous bookmarks with merge-on-login.
4. **No external dependencies** makes this the simplest P3 feature to implement — it is entirely self-contained within the events platform.
