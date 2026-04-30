---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Live walkthrough on Site B. RSVP enabled on event 8 ("Annual Tech
  Conference 2026"). Screenshots in screenshots/. No WooCommerce — RSVP is
  fully functional without it.
---

# eventon-rsvp 3.0.3 — Frontend UX

---

## Display Model

RSVP is surfaced in **two places** on the frontend:

1. **EventON calendar event cards** — RSVP button + form in the slide-down card
2. **EventTop bar** (compact info line above the event title in calendar view) — attendance counts and one-click RSVP for logged-in users

There is no standalone RSVP page. The RSVP form is always contextual to an event.

---

## 1. EventTop Bar (Calendar View)

> Screenshots: `frontend-110-calendar-loaded.png`, `frontend-111-calendar-card-rsvp.png`

When "Activate RSVPing with one-click from eventTop" is enabled (admin setting), the event title bar shows:

```
[Yes count] [No count] [Remaining spaces]  [RSVP] button
```

- For unauthenticated users: clicking "RSVP" opens the lightbox form.
- For logged-in users: one-click RSVP records a "yes" without opening the form (configurable).
- The counts update in real-time via AJAX after submission.

When the event is closed ("RSVP Closed" or capacity reached), the one-click button is replaced with a status badge (suppressable via admin setting).

---

## 2. Event Card RSVP Section (Slide-Down Card)

> Screenshots: `frontend-301-event0-rsvp-visible.png`

When RSVP is enabled on an event, the expanded event card shows:

### RSVP Introduction Area
```
[RSVP section description — optional, set per-event]
[RSVP image — optional, set per-event]
```

### Attendance Count Display (when guests visible)
```
👥 12 Yes   4 No   2 Maybe
[Guest list: initials or full names depending on settings]
```

### RSVP Trigger
- **Lightbox mode (default):** A button "RSVP to this event" opens a lightbox (`#evors_lightbox`) containing the form.
- **In-card mode:** The form renders inline within the event card (controlled by `evors_incard_form` setting).

---

## 3. RSVP Form (Lightbox or In-Card)

> Screenshot: `frontend-202-rsvp-form-opened.png`

The form is rendered by `evors_form::get_form()` and loaded via `wp-admin/admin-ajax.php?action=evors_get_form`.

### Form Fields (default configuration)

| Field | Required | Notes |
|---|---|---|
| First Name | Yes | |
| Last Name | Yes | |
| Email | Yes (configurable) | Uniqueness checked against existing RSVPs for this event |
| Phone | No (configurable) | |
| RSVP Choice | Yes | Radio: Yes / No / Maybe (labels editable in Language settings) |
| Number of spaces | Conditional | Shown only if max-per-submission > 1 |
| Additional notes | No | Free-text textarea |
| Opt-in for emails | No | Checkbox |
| Custom fields 1–5 | Configurable | Text, select, or file upload |

### Validation

Client-side: Required field highlighting.
Server-side (AJAX): Nonce check, capacity check, duplicate check, role check (if logged-in-only mode).

Error responses surface as inline messages above the form.

### Update Mode

If the submitter's email already has an RSVP for this event, the form re-renders in "update" mode:
- All fields pre-populated with existing data
- Submit button changes to "Update RSVP"
- RSVP ID stored in hidden field

### File Upload

When a custom field is type "file", the form includes a `<input type="file">`. Files are uploaded via the same AJAX action and stored in WordPress uploads.

---

## 4. Post-Submission Confirmation

After successful RSVP, the form area is replaced by a success panel:

```
✓ You've RSVPed to this event!
[Summary of submitted data: name, choice, count]
[Optional: updated guest list]
```

The event card's eventTop area refreshes via AJAX to reflect updated counts.

### Auto Account Creation

If "Disable creating new account for new RSVP user" is **not** checked and the email has no WordPress account, a subscriber account is created automatically and a "new user" email is sent with the generated password.

---

## 5. RSVP Manager (`[evo_rsvp_manager]`)

> Screenshot: `frontend-110-rsvp-manager.png`

A shortcode-rendered page that lists all of the logged-in user's RSVPs across all events.

**URL:** Configurable — place shortcode `[evo_rsvp_manager]` on any page.
**Auth gate:** Page content requires login; shows a login prompt to unauthenticated users.

### Manager Layout

```
[Page heading: "Events I have RSVPed to"]
[Event 1 row]
  Event name | Date | Your choice | Spaces | [Update] [Cancel]
[Event 2 row]
  ...
```

- **Update:** Opens same RSVP form (update mode) for that event.
- **Cancel:** Sets RSVP to "no" or deletes the record depending on configuration.

### ActionUser Integration Extension

When the ActionUser addon is active, the manager also shows events the user *created* (not just RSVPed to), with:
- RSVP count stats per event (yes/no/maybe)
- CSV download button per event
- Front-end check-in button per event

---

## 6. Capacity Enforcement

**Hard capacity:** Set via `evors_max_rsvp` per event. When reached:
- New "yes" RSVPs are rejected with "There are not enough spaces!"
- Waitlist RSVPs (if enabled) still succeed and get `waitlist` status

**Soft capacity display:** Remaining spaces shown in eventTop bar and optionally on the form.

**Race condition:** Capacity check uses an optimistic model — two concurrent submissions at the last spot could both succeed. This is a known limitation of the WP transient/option-based approach (no atomic decrement).

---

## 7. Virtual Events Gate

When the Virtual Events addon is active and "User must RSVP to view virtual event information" is enabled:
- The meeting link, "live now" content, and sign-in box are hidden until the user has an active "yes" RSVP
- The RSVP confirmation email includes the virtual meeting link

---

## 8. JavaScript & AJAX

**Enqueued scripts:**
- `evo_RS_script` — main RSVP form handler (lightbox open/close, AJAX submit, DOM updates)
- `evorsi_script` — invitees addon (optional, co-loaded)

**JS globals available on RSVP-enabled pages:**
```javascript
evors_ajax_script = {
    ajaxurl: "https://dateline-site-b.ddev.site:8443/wp-admin/admin-ajax.php",
    postnonce: "<per-page nonce>"
}
evorsi_ajax_script = {
    ajaxurl: "...", postnonce: "..."  // invitees addon
}
```

**AJAX actions:**
| Action | Description |
|---|---|
| `evors_get_form` | Load RSVP form HTML for an event |
| `evors_save_rsvp` | Submit / update an RSVP |
| `evors_ajax_checkin` | Check in a guest (front-end check-in if enabled) |
| `evors_ajax_get_auem_stats` | Refresh ActionUser manager stats |

**No REST API endpoints** — all communication via WP AJAX (`admin-ajax.php`).

---

## 9. Enqueued Styles

- `evo_RS_styles` — RSVP form and lightbox CSS
- `evorsi_styles` — invitees addon CSS

Styles are conditionally enqueued only on pages/posts that have EventON output (via EventON's asset pipeline).

---

## 10. i18n / Language Customization

All frontend string labels are editable via EventON Settings → Language tab (RSVP section), stored in `evcal_options_evcal_2`. Examples:
- Form title / subtitle
- "Yes" / "No" / "Maybe" button labels
- "Submit RSVP" / "Update RSVP"
- Success message heading
- "Events I have RSVPed to" (manager heading)
- Guest list labels, capacity messages

These settings override `.po` translation file strings, allowing label changes without a new translation file.
