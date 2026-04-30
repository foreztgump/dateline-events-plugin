---
plugin: eventon-wishlist-add-on
version: 1.1.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static analysis only — no live site walkthrough. Source files at
  research/sources/eventon-wishlist-add-on/. See 00-overview.md and
  01-data-model.md for prior static-analysis context.
---

# eventon-wishlist-add-on 1.1.2 — Admin UX

---

## Navigation & Menu Structure

The wishlist add-on does **not** create any top-level admin menu. All admin surfaces are injected into existing EventON and WordPress screens.

```
EventON (Settings)
└── Settings → admin.php?page=eventon
    └── General/SE tab             ← "Wish List Settings" sub-section
    └── Language tab               ← "ADDON: WishList" string group
    └── Icons / Styles             ← two custom icon pickers

Events (CPT list)
└── All Events                     ← "Likes" column added
    admin.php?post_type=ajde_events

Events (CPT edit)
└── Edit Event                     ← wishlist count badge in Publish metabox
```

---

## 1. Wish List Settings Sub-Section (EventON Settings → General/SE)

The admin class (`admin_init.php`) appends a sub-section into EventON's general settings panel via the `evo_se_setting_fields` filter.

| Field | Key | Description |
|---|---|---|
| Enable wishlist on single event page | `evowi_on_sin_pg` | Yes/No toggle. When on, the heart button is shown on the single event (`ajde_events` singular) page in addition to calendar views. Without this, the button only appears when `wishlist='yes'` is passed to the calendar shortcode. |

No other plugin-level settings exist. There is no control for button position, visibility rules, or storage TTL.

---

## 2. Language Settings (EventON Settings → Language)

A "ADDON: WishList" group is appended to the EventON language tab via `eventon_settings_lang_tab_content`. The following strings are editable in the admin:

- `In your wishlist`
- `Add to wishlist`
- `My Wishlist Events`
- `Login required to manage your wishlist events`
- `Login Now`
- `Hello`
- `You must login to add events to wish list!`
- `You do not have any wish list events`
- `You can view and manage the events you have added to your wishlist from here.`

All strings pass through EventON's `evo_lang()` helper, which reads from EventON's multilingual options store (not a standard `.po`/`.mo` file).

---

## 3. Custom Icons (EventON Settings → Icons/Styles)

Two icon pickers are added to EventON's icon configuration panel via `eventon_custom_icons`:

| Setting | Key | Default Icon |
|---|---|---|
| Wishlist selected icon (filled heart) | `evcal_evowi_001` | `fa-heart` |
| Wishlist not selected icon (outline heart) | `evcal_evowi_002` | `fa-heart-o` |

These are FontAwesome icon class overrides. The saved values are read via EventON's `get_eventON_icon()` helper at render time.

---

## 4. Events List — "Likes" Column

The admin class registers a custom column `likes` on the `ajde_events` CPT list table (`manage_edit-ajde_events_columns` + `manage_ajde_events_posts_custom_column`). The column displays the total number of users who have wishlisted that event (counting across all recurrence instances) as a blue pill badge.

---

## 5. Event Edit Screen — Wishlist Count

A hook on `eventon_event_submitbox_misc_actions` appends a small "Wishlist Count" label with the same blue pill count badge to the Publish metabox area of every event edit screen. The count is across all repeat instances.

There is no per-event wishlist management UI — admins cannot remove individual user entries from this screen.

---

## 6. Shortcode Generator

The add-on extends EventON's shortcode generator (the popup UI used to build calendar shortcodes) via `eventon_shortcode_popup`. Two additions are made:

1. A `wishlist` Yes/No field is added to the standard calendar shortcode options (in both shortcode groups 0 and 1): "Allow loggedin visitors to add events to wishlist." Setting this to yes passes `wishlist='yes'` to the rendered calendar, which enables the heart button on all event cards in that calendar.

2. A new shortcode entry `add_eventon_wishlist_manager` is registered in the generator under the label "Wishlist Events Manager." The generator exposes four fields: `event_past_future`, `number_of_months`, `lang`, and `etc_override` — all pulled from EventON's standard field library.

---

## Admin UX Summary

The admin surface is minimal: one functional toggle (single event page), a language string group, two icon pickers, a list-view column, and an edit-screen count badge. There are no bulk management tools, no per-user wishlist views, and no admin ability to add or remove wishlist entries on behalf of users.
