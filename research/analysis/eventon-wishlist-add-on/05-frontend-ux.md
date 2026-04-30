---
plugin: eventon-wishlist-add-on
version: 1.1.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis only — no live site walkthrough. Source files at
  research/sources/eventon-wishlist-add-on/. See 00-overview.md and
  04-admin-ux.md for prior context.
---

# eventon-wishlist-add-on 1.1.2 — Frontend UX

---

## Display Model

The wishlist feature has two distinct frontend surfaces:

1. **Heart button on event cards** — injected into the `evowi` slot in the EventON eventTop bar on every event card, when the calendar has `wishlist='yes'` (or on singular event pages when the admin toggle is on).
2. **Wishlist manager page** — a standalone WordPress page powered by the `[add_eventon_wishlist_manager]` shortcode, showing all of the logged-in user's wishlisted events in a calendar-style list.

---

## 1. Heart Button (Event Card — eventTop)

The button is rendered by `evowi_frontend::eventtop_content()` into the eventTop bar area of each event card. It exists in one of two visual states:

**Not wishlisted (default):**
```
[♡ outline icon]  [count]  Add to wishlist
```
CSS class: `.evowi.notlisted`

**Wishlisted:**
```
[♥ filled icon]  [count]  In your wishlist
```
CSS class: `.evowi.wishlisted`

The count displayed is the total number of users who have wishlisted that specific event (and recurrence instance). Both the icon and the count are always visible to all users, regardless of login state.

The button carries two `data-` attributes: `data-ei` (event post ID) and `data-ri` (repeat interval identifier). These are sent in the AJAX request on click.

Scripts and styles are enqueued globally on all non-admin pages when the add-on is active (`evowi_styles`, `evowi_script`). The JS listens at the document level (`body.on('click', 'span.evowi_wi_area', ...)`) — no per-page conditional loading.

---

## 2. AJAX Add/Remove Interaction

Clicking `span.evowi_wi_area` triggers an AJAX POST to `wp-admin/admin-ajax.php` with action `evowi_change_wishlist`. The `newstatus` field is `add` if the button currently has class `notlisted`, or `remove` if it has class `wishlisted`. During the request, the element receives a `loading` CSS class (spinner state).

**If the user is not logged in**, the server returns `type: 'notloggedin'`. The JS opens a lightbox (`evowl_lightbox`) that the plugin pre-registers in EventON's lightbox system. The lightbox body is populated with the server-rendered HTML, which shows a "You must login to add events to wish list!" message and a "Login Now" link pointing to `wp-login.php?redirect_to=<current_page>`.

**If the user is logged in**, the server updates the global `_evo_wishlist` option, re-reads the new wishlist count, and returns a `status: 'good'` response with the updated inner HTML for the button (new icon + new count + new label). The JS replaces the button's class (toggling `wishlisted` / `notlisted`) and innerHTML atomically — no full page reload.

---

## 3. Wishlist Manager Page (`[add_eventon_wishlist_manager]`)

The shortcode is registered by `EVOWI_Wishlist_Manager` and delegates all rendering to `templates/wishlist-manager.php`, with theme override support (theme can place a custom copy at `wp-content/themes/<theme>/eventon/wishlist/wishlist-manager.php`).

**If the user is not logged in**, the template renders:

```
My Wishlist Events

Login required to manage your wishlist events
[Login Now button → wp-login.php?redirect_to=<current_page>]
```

**If the user is logged in**, the template renders:

```
My Wishlist Events

Hello [display_name]. You can view and manage the events you have
added to your wishlist from here.

[EventON calendar output — filtered to wishlisted events only]
```

The calendar output is produced by calling `EVOWI()->front->shortcode_content($atts)`, which internally calls `EVO()->calendar->_get_initial_calendar()` with two key overrides: `calendar_type='wishlist'` and `wishlist='yes'`. This causes EventON to run its standard calendar rendering but with the WP query pre-filtered to only the post IDs in the user's wishlist.

**Empty state:** If the user has no wishlisted events, `shortcode_content()` skips the calendar output entirely and renders:

```
You do not have any wish list events
```

---

## 4. Wishlist Manager Calendar Behavior

The manager calendar is a complete EventON calendar instance, not a simple list. The plugin sets additional shortcode args on it at render time: `sep_month='yes'` (events grouped by month), `hide_empty_months='yes'`, and a computed date range based on the `number_of_months` and `event_past_future` shortcode parameters on the manager page.

Default range is 12 months split evenly past/future from today. `event_past_future='past'` shifts the window to show only past events (useful for "events I attended"). Past events in the user's wishlist are **not** automatically removed — they remain in the storage until the user removes them manually, though they will fall outside the default date window.

The calendar instance respects repeat instance filtering: a user who wishlisted a specific occurrence of a recurring event only sees that occurrence, not all occurrences.

---

## 5. Shortcode Parameters (`[add_eventon_wishlist_manager]`)

| Parameter | Default | Description |
|---|---|---|
| `event_past_future` | `all` | `all` / `future` / `past` — controls the date window shown |
| `number_of_months` | `12` | Total months to show (split evenly for `all`; full range for `past`/`future`) |
| `lang` | `L1` | EventON language key for multilingual sites |
| `etc_override` | — | EventON ETC (custom) data override |

---

## 6. CSS Classes & Assets

| Asset | Handle | Notes |
|---|---|---|
| `assets/evowi_style.css` | `evowi_styles` | Wishlist button styles; conditionally registered via EventON's concat-styles setting |
| `assets/evowi_script.js` | `evowi_script` | jQuery click handler; localized with `ajaxurl` and `postnonce` |
| `assets/spinner.gif` | — | Referenced by CSS for the loading state |

The calendar wrapper element for a wishlist manager instance receives an additional CSS class `evoWI` (added via `eventon_cal_class` filter) to allow targeted overrides.

---

## 7. i18n

All user-facing strings pass through `evo_lang()` / `evo_lang_e()` and are configurable in the EventON Language admin panel under "ADDON: WishList." No standard WordPress text domain is used. See `04-admin-ux.md §2` for the full string list.
