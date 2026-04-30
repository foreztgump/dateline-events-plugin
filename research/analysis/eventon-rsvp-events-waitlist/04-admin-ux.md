---
plugin: eventon-rsvp-events-waitlist
version: 1.1.1
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static analysis only (no live site). Source PHP read from
  research/sources/eventon-rsvp-events-waitlist/. See 00-overview.md for
  dependency and architecture context.
---

# eventon-rsvp-events-waitlist 1.1.1 — Admin UX

---

## Navigation & Menu Structure

This add-on adds no top-level menu. It injects surfaces into existing EventON and RSVP admin locations.

```
EventON → Settings → RSVP tab → Waitlist sub-section
Events CPT → Edit Event → RSVP metabox → Waitlist section
```

The settings link in the plugin list (`plugins.php`) points to `admin.php?page=eventon&tab=evcal_rs` (the RSVP settings tab).

---

## 1. RSVP Settings Tab — Waitlist Sub-section

`EVORSW_Admin::settings_fields_rsvp()` appends a `waitlist` tab entry into the RSVP settings page's sub-navigation. It renders as a distinct section within the EventON RSVP settings tab (tab icon: `hourglass`, display toggled by JS like other RSVP sub-sections).

| Field | Key | Description |
|---|---|---|
| Allow guests to remove themselves from waitlist | `_evorsw_remove_from_wl` | Yes/No toggle. When on, the event card shows a "Remove me from waitlist" button to logged-in guests who are on the waitlist. |

No other global waitlist settings exist — all remaining behaviour is per-event.

---

## 2. Per-Event RSVP Metabox — Waitlist Section

`EVORSW_Admin::rsvp_meta_box()` hooks into `evors_event_metafields` and adds a waitlist row inside the existing per-event RSVP metabox.

### Preconditions and Validation Messages

The waitlist controls appear **only when** all three preconditions are met. If any precondition fails, an explanatory message is shown in place of the controls:

| Precondition | Message shown on failure |
|---|---|
| RSVP invitee mode not active | "Waitlist for RSVP: Can not use waitlist while invitee is active." |
| RSVP capacity limit set | "Waitlist for RSVP: capacity must be set before enabling waitlist." |
| Per-repeat capacity management not active | "Waitlist for RSVP: Does not support manage capacity separate for repeats." |

### Waitlist Control

When all preconditions pass, a yes/no toggle is shown:

| Field | Key | Notes |
|---|---|---|
| Enable Waitlist for RSVP | `_evorsw_waitlist_on` | Saved to event postmeta. Reveals the waitlist status panel when enabled. |

### Waitlist Status Panel (when enabled)

Below the toggle, a sub-section (`#evorsw_section`) reveals:

- If waitlist has entries: the current **waitlist size** (count of guests, accounting for party sizes) and a note: *"Once an attending guest changes their RSVP status to NO, their space will be offered to waitlist guest automatically."*
- If waitlist is empty: the text "Waitlist is empty!"

The panel is display-toggled by the yes/no button JS (class `yesnosub` / `innersection`).

---

## 3. Event Edit Stats Bar

`EVORSW_Admin::rsvp_stats()` hooks into `evors_admin_eventedit_stats_end` to append a **WaitList** count badge to the stats bar above the RSVP attendee list on the event edit screen. When the waitlist is active, a `<p class='wl'>` element appears alongside the Yes/No/Maybe counts, showing the total number of waitlisted guests.

---

## 4. Per-Attendee RSVP Record

### Attendee Lightbox (`evors_attendee_info_lb_end`)

When viewing an individual attendee in the RSVP lightbox on the event edit screen, this add-on injects an action button (admin-only):

- If attendee's check-in status is `'waitlist'`: shows **"Add to event attendance list"** button (AJAX action `evorsw_add_attendee_list`, type `from_lb`).
- Otherwise: shows **"Move to waitlist"** button (AJAX action `evorsw_move_to_waitlist`, type `from_lb`).

### RSVP CPT List Page (`evors_admin_rsvp_cpt_checkinstatus`)

On the `evo-rsvp` CPT list table, when a row's check-in status is `'waitlist'`, an **"Add to event attendance list"** button is rendered inline (AJAX action `evorsw_add_attendee_list`, type `from_page`). This button is only visible to administrators.

---

## 5. Email Attendees — Waitlist Email Type

`EVORSW_Admin::email_attendee_email_type()` hooks into `evors_email_attendees_emailing_type` to add a **"Email to waitlist Guests"** option to the bulk-email type selector on the event edit screen. Selecting this option causes `email_attendee_emails()` to collect all email addresses from waitlisted RSVPs (across yes/maybe/no statuses within the waitlist) for bulk delivery.

---

## 6. AJAX Actions (Admin)

| Action | Handler | Effect |
|---|---|---|
| `evorsw_add_attendee_list` | `add_to_attendee_list()` | Moves a waitlisted RSVP to `status='check-in'`, `rsvp_type='normal'`; syncs RSVP count; returns JSON with new check-in status |
| `evorsw_move_to_waitlist` | `move_to_waitlist()` | Sets RSVP to `status='waitlist'`, `rsvp_type='waitlist'`; returns JSON |
| `evorsw_add_attendee_list` (nopriv) | `add_to_attendee_list_nopriv()` | Returns permission error — admin-only endpoint |
| `evorsw_move_to_waitlist` (nopriv) | `add_to_attendee_list_nopriv()` | Same rejection |

---

## 7. Manual Sync Behaviour

`EVORSW_Admin::after_sync_query()` hooks into `evors_sync_after_query` to trigger automatic space offers when an admin manually syncs the RSVP count. On manual sync only (not auto-sync), if the event has waitlisted guests and newly-freed capacity, `offer_space_to_waitlist()` is called and the returned confirmed count is added to the yes-count in the sync result. This does not run for recurring events with per-repeat capacity management active.

---

## 8. Language / i18n Admin Strings

`EVORSW_Admin::language_additions()` extends the RSVP Language settings panel with a "WAITLIST" section and an "EMAILS: Waitlist" section, each containing translatable strings. Editors can override these strings from the EventON Language settings UI without editing translation files.
