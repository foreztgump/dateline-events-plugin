---
plugin: eventon-rsvp-events-waitlist
version: 1.1.1
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis only. Source PHP read from
  research/sources/eventon-rsvp-events-waitlist/. No live site walkthrough;
  UX states inferred from class-frontend.php hook handlers.
---

# eventon-rsvp-events-waitlist 1.1.1 — Frontend UX

---

## Display Model

The waitlist add-on has no standalone frontend page or shortcode. It intercepts the existing RSVP UI in-place: the EventTop bar, the event card, and the RSVP form/confirmation flow are all modified by filtering or replacing output from the base RSVP add-on.

---

## 1. EventTop Bar Modifications

When the waitlist is active and RSVP capacity has been reached, two EventTop elements are replaced:

- The **above-title** area gains a badge: `"Get on the waitlist"` (CSS class `eventover waitlist`).
- The **count HTML** is replaced with a `"Waitlist is Open"` span (CSS class `evors_eventtop_data remaining_count evors_wl`), replacing the normal remaining-spaces count.

When capacity is not yet reached the EventTop bar is unchanged.

---

## 2. Event Card — Remaining Spots Area

`EVORSW_Front::eventcard_remaining_rsvp()` intercepts the remaining-RSVP value before the event card renders:

- If waitlist is inactive for this event → passthrough, no change.
- If capacity is unlimited (`'nocap'`) and waitlist is active → sets `WL_on=true` but returns `'nocap'` (waitlist visible even without a hard cap).
- If remaining count > 0 → passthrough (no waitlist display yet).
- If remaining count ≤ 0 → sets `WL_on=true`, returns `'wl'`.

When `WL_on` is true, `eventcard_content()` replaces the standard remaining-spots section with a waitlist panel:

```
[clipboard-list icon]
Current waitlist size   [N]      ← when waitlist has entries
```

or simply `"Waitlist is empty"` when no guests are queued. The panel has CSS class `evors_waitlist_remaining_spots sec_shade` and gains class `wl_empty` when the count is zero.

---

## 3. Event Card — User RSVP Status Text

When the user has already submitted an RSVP and their entry is of type `waitlist`:

- `evc_after_user_txt()` renders a prominent confirmation panel: **"You are in our waitlist!"** (with a checkmark icon, CSS class `wl_inlist sec_shade evors_section`).
- The regular RSVP choice buttons (yes/no/maybe) are suppressed (`evc_choice_btns_evc()` returns empty) to prevent double-submission.

When the user has **no** RSVP and the event is full with waitlist active:

- A panel shows: **"All spaces are reserved!"** alongside a **"Join the waitlist!"** call-to-action button that opens the RSVP form (CSS class `evors_trig_open_rsvp_form evcal_btn`, `data-val='y'`).

---

## 4. RSVP Form — Waitlist State

`EVORSW_Front::rsvp_type()` intercepts the form's `rsvp_type` field: when capacity is reached and waitlist is active, the hidden `rsvp_type` input is set to `'waitlist'` before the form is submitted. This does not apply to update-mode forms.

**Under-subtitle area** (`evors_form_under_subtitle`):

- On a new submission (capacity full): `"All the spaces are filled, but you will be added to our waitlist!"`
- On an update form when user is on waitlist: `"You are in our waitlist!"` and a `"Remove me from waitlist"` link (CSS class `evcal_btn evorsw_remove_wl`).

---

## 5. RSVP Form — Success / Confirmation Screen

**Success header** (after new submission) is replaced based on what happened:

| Scenario | Header text |
|---|---|
| Submitted directly as waitlist | `"Successfully added to waitlist for [event-name]"` |
| Submitted as normal but capacity filled mid-flight | `"All available spaces are taken, but we added you to waitlist for [event-name]"` |

**Footer note** appended to the confirmation: `"NOTE: You will be offered space only when all your party size spaces available"` — only shown when the RSVP type is `waitlist`.

**Late-fill notice** (`evors_form_success_msg_updated_rsvp`): if an existing RSVP is updated and the result is `waitlist` type, an `<h3>` header is appended: `"All available spaces are taken, but we added you to waitlist!"`.

---

## 6. Remove From Waitlist

When the global setting `_evorsw_remove_from_wl` is enabled, the update form's subtitle area shows the **"Remove me from waitlist"** button. Clicking it submits a form with `formtype='wl-remove'` and the `rsvpid`.

`before_updated()` handles the remove request: `wp_trash_post(rsvp_id)` is called and the filter returns `'removed'`. The form area is then replaced with:

```
✓ You are successfully removed from waitlist!
```

No email is sent on removal (the `remove_from_waitlist()` method on `EVORSW_Waitlist` has an empty body — confirmed gap).

---

## 7. Automatic Space Offer (Triggered by RSVP Cancellation)

`EVORSW_Front::updated()` runs after any RSVP update. If the updated RSVP status is now `'n'` (not attending), and the event has an active waitlist with pending entries, `offer_space_to_waitlist()` is invoked automatically with the freed seat count. This is a **synchronous, inline operation** executed within the RSVP update request.

The waitlist guest is only promoted if the available space is ≥ their party size (party-size-aware FIFO). On promotion, three emails are sent synchronously: RSVP confirmation to the promoted guest, attendee notification to the promoted guest, and admin notification.

---

## 8. Email Modifications

`EVORSW_Front::new_rsvp_admin_notification()` filters both the live admin notification args and the email preview args: if the submitted RSVP is of type `waitlist`, `"Added to waitlist!"` is appended to the admin notification's `notice_message`.

---

## 9. AJAX Actions (Frontend)

No new `wp_ajax_nopriv_*` or RSVP-specific AJAX endpoints are registered by this add-on. The waitlist join/remove flow reuses the base RSVP addon's existing `evors_save_rsvp` AJAX action — the waitlist add-on intercepts that flow via `evors_new_rsvp_before_save`, `evors_new_rsvp_saved`, and `evors_rsvp_updated_before` hooks.

---

## 10. CSS Classes & Identifiers

| Element | CSS class / ID |
|---|---|
| EventTop waitlist badge | `eventover waitlist` |
| EventTop count replacement | `evors_eventtop_data remaining_count evors_wl` |
| Waitlist size panel | `evors_waitlist_remaining_spots sec_shade` |
| Empty waitlist modifier | `wl_empty` |
| Waitlist size inner | `evorsw_wl_size dfx fx_ai_c fx_1_1 fx_jc_sb` |
| "You are in waitlist" panel | `wl_inlist sec_shade evors_section` |
| "Join waitlist" CTA button | `evors_trig_open_rsvp_form evcal_btn` |
| "Remove from waitlist" button | `evcal_btn evorsw_remove_wl` |
| Form subtitle | `evors_subtitle evorsw_form_subtitle` |
| User's in-waitlist inline text | `evorsw_in_wl` |
| "All spaces reserved" notice | `evorsw_wl_notice` |
| "Add yourself to waitlist" note | `evorsw_add_towl` |
