---
plugin: eventon-rsvp-events-waitlist
version: 1.1.1
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
note: >
  Static analysis only. Integration surface is narrow: two hook-based
  extension points into the ActionUser add-on and ~18 hooks consumed from
  the RSVP add-on. See 02-hooks.md for the complete hook inventory.
---

# eventon-rsvp-events-waitlist 1.1.1 — Integrations

---

## Integration Architecture

This add-on has no external PHP dependencies beyond EventON and EventON RSVP. It integrates exclusively via WordPress hooks — there are no direct class instantiations from sibling plugins except `EVORS()` (the RSVP singleton) and `EVO_RSVP_CPT` / `EVORS_Event` (both from the RSVP add-on). No HTTP calls, no external APIs, no REST endpoints, no third-party services.

---

## 1. EventON RSVP (eventon-rsvp — Required)

**Type:** Hard dependency. The bootstrap class (`EVORSW`) checks `class_exists('EventON_rsvp')` and `version_compare(EVORS()->version, '2.9') >= 0` before loading any functionality. Without a RSVP add-on at v2.9+, the plugin self-disables with an admin notice.

This add-on consumes approximately 18 RSVP hooks to intercept:
- RSVP form type assignment (`evors_form_rsvp_type`)
- Pre-save and post-save new RSVP actions (`evors_new_rsvp_before_save`, `evors_new_rsvp_saved`)
- Post-update actions and filters (`evors_rsvp_updated`, `evors_rsvp_updated_before`, `evors_updatersvp_n_to_y`)
- Event card display filters (`evors_remain_rsvp_output`, `evors_eventcard_html_srem`, `evors_eventtop_count_html`, `evors_eventtop_above_title`)
- Email notification args (`evors_admin_notification_args`, `evors_preview_email_arg`)

See `02-hooks.md` for the full inventory.

---

## 2. EventON Core (Required transitively)

Inherits the core requirement from RSVP. The add-on uses EventON's `evo_addons` class for version checking and add-on registration, and uses EventON's `evo_helper` for input sanitisation (`$this->help->sanitize_array()` and `$this->help->array_to_html_data()`). No direct hooks into EventON core beyond those inherited.

---

## 3. ActionUser (eventon-actionuser — Optional)

**File:** `includes/class-intergrations.php` (`EVORSW_Intergrations`).
**Detection:** Hook-based — no `class_exists` guard. The two hooks (`evors_au_eventmanager_statbox`, `evors_au_eventmanager_attendees_end`) are fired by the RSVP add-on's ActionUser integration class; if ActionUser is absent, these hooks simply never fire.

| Surface | Implementation |
|---|---|
| Waitlist count in event manager stats box | Appends a `<p class='num waitlist'>` element showing total waitlisted guests alongside the Yes/No/Maybe stats in the ActionUser front-end event manager |
| Waitlist attendee list in event manager | Renders a full attendee list (`<div id='evorsau_attendee_list' class='evors_list evorsau_waitlist'>`) showing each waitlisted guest's name, email, phone, count, and additional names — displayed below the regular attendee list in the ActionUser panel |

The waitlist list rendering uses `EVORS_Event::GET_rsvp_list('waitlist')` (from the RSVP add-on) to retrieve entries.

---

## 4. REST / External API Surface

None. No REST endpoints are registered. No `wp_remote_*` calls exist in any source file. There is no outbound webhook triggered by waitlist events (unlike the base RSVP add-on which triggers `new_rsvp` and `rsvp_status_changed` webhooks — the waitlist add-on does not extend those payloads).

---

## 5. No-Privilege (Public) AJAX

The `wp_ajax_nopriv_evorsw_add_attendee_list` and `wp_ajax_nopriv_evorsw_move_to_waitlist` handlers both immediately return a permission-error string and exit. No unauthenticated AJAX surface is exposed.

---

## Integration Summary

| Partner | Required? | Detection | Surface |
|---|---|---|---|
| EventON RSVP ≥ 2.9 | Yes | `class_exists` + version check | ~18 hooks consumed; all waitlist data objects from RSVP types |
| EventON Core ≥ 4.3 | Yes (transitive) | `isset($GLOBALS['eventon'])` | `evo_addons`, `evo_helper` utility classes |
| ActionUser | Optional | Hook presence | Waitlist stat + attendee list in front-end event manager |
| Any external service | No | — | None |

---

## Dateline Design Notes

1. **No new API contract to implement.** The waitlist is an extension of the RSVP module — all external-facing behaviour (emails, capacity, attendee records) flows through the RSVP module's own surface. Dateline's waitlist feature similarly needs no standalone API: it adds a `rsvp_type='waitlist'` state to the existing RSVP record, triggered by the RSVP create/update path.
2. **ActionUser integration** translates to the Dateline equivalent of an "event organiser dashboard" widget: show waitlist count alongside confirmed/declined counts, and list waitlisted guests below confirmed attendees.
3. **No outbound webhook from waitlist events.** If Dateline emits webhooks from its RSVP module (see eventon-rsvp `06-integrations.md`), the `new_rsvp` event payload should include a `waitlist: true` field so downstream consumers can distinguish waitlist joins from confirmed RSVPs — a gap in the original plugin.
4. **Space-offer email delivery is synchronous** in the PHP implementation and must be moved to `ctx.waitUntil` in Dateline. The three emails sent on promotion (confirmation, attendee notification, admin notification) must never block the RSVP update response.
