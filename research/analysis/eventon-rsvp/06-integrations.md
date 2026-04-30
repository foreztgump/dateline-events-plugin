---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-rsvp 3.0.3 — Integrations

---

## Integration Architecture

eventon-rsvp integrates with other EventON add-ons **exclusively via hooks** — there are no direct `class_exists()` hard-coupling calls except for the Virtual Events and ActionUser integrations (both are guarded by `class_exists` checks). The plugin never calls WooCommerce and has zero external PHP dependencies outside of EventON core.

---

## 1. EventON Core (Required)

**Type:** Hard dependency.
**Check:** `plugins_loaded` priority 9; plugin self-disables with admin notice if EventON core is absent.

Hooks used:

| Hook | Direction | Purpose |
|---|---|---|
| `evo_eventcard_action` | Filter/Action | Inject RSVP section into the event card |
| `evo_eventtop_action` | Filter/Action | Inject RSVP counts / one-click button into eventTop bar |
| `eventon_settings_tabs` | Filter | Add "RSVP" tab to EventON Settings |
| `eventon_language_settings` | Filter | Add RSVP strings to Language settings panel |
| `evo_save_event_meta` | Action | Save per-event RSVP settings from event edit screen |
| `evors_daily_action` | WP-Cron | Daily digest email dispatch |

**Shared infrastructure:**
- EventON's inline-CSS pipeline: RSVP injects colour/font overrides via `eventon_inline_css` filter.
- EventON's email header/footer wrappers: All RSVP email templates use `evo_email_header()` / `evo_email_footer()`.
- EventON's webhook system (`EVO()->webhooks`): RSVP triggers events through the shared webhook dispatcher.

---

## 2. Virtual Events (eventon-virtual — Optional)

**File:** `includes/class-intergration-virtual.php` (note original spelling).
**Detection:** `class_exists('EVO_Virtual')` guard.

| Feature | Implementation |
|---|---|
| RSVP gate on virtual content | Per-event toggle "User must RSVP to view virtual event information" |
| Suppressed until RSVP | Hides meeting link, live-now section, sign-in box for users without a "yes" RSVP |
| Meeting link in confirmation email | `eventonrs_confirmation_email` action hook appends link |
| Virtual Plus sign-in gate | Filters `evovp_signin_user` to approve/block based on RSVP status |

**Dateline relevance:** Virtual gating is a high-value feature — live stream or hybrid events that restrict join link to registered attendees. Worth implementing as a first-class Dateline integration.

---

## 3. QR Code (eventon-qrcode — Optional)

**File:** `includes/class-intergration-qrcode.php`.
**Detection:** Via `evoqr_checkin_otherdata_ar` hook presence (hook only exists when QR addon is active).

| Feature | Implementation |
|---|---|
| Check-in via QR scan | Registers on `evoqr_checkin_otherdata_ar` filter |
| RSVP data in scan payload | Passes RSVP status through QR check-in pipeline |

**Current state:** The implementation is a passthrough stub — it returns the `$output` unchanged. The hook registration exists as an extension point, but no RSVP-specific QR data is added yet. The QR check-in (`checkin_type=rsvp`) is handled by EventON QR's own scanner.

---

## 4. Webhooks (EventON Webhooks — Optional)

**File:** `includes/class-intergration-webhooks.php`.
**Registration:** Via `EventON_Webhooks::register_event()` on `init`.

Two outbound webhook triggers are registered:

### `new_rsvp`

| Attribute | Value |
|---|---|
| Trigger hook | `evors_new_rsvp_saved` |
| Delivery | Synchronous (within AJAX request that saves the RSVP) |
| Payload | `rsvp_id`, `rsvp_type` (y/n/m), `first_name`, `last_name`, `email`, `count`, `event_id`, `event_name`, custom field values |

### `rsvp_status_changed`

| Attribute | Value |
|---|---|
| Trigger hook | `evors_checkin_guest` |
| Delivery | Synchronous |
| Payload | `rsvp_id`, `rsvp_type`, `first_name`, `last_name`, `email`, `count`, `event_id` |

**No retry / queue:** Webhook calls are fire-during-request. If the receiving endpoint is down, the event is lost.

**Dateline relevance:** These two webhook payloads define the external sync interface. Dateline should emit equivalent events from its RSVP module for downstream CRM/marketing automation integrations.

---

## 5. ActionUser (eventon-actionuser — Optional)

**File:** `includes/class-intergration-actionuser.php`.
**Detection:** `class_exists('EVO_ActionUser')` guard.

ActionUser is a front-end event submission form add-on. RSVP extends it in three ways:

| Feature | Implementation |
|---|---|
| RSVP fields in ActionUser form | "Allow RSVP" toggle + capacity inputs appended to event submission form |
| RSVP stats in ActionUser manager | Yes/no/maybe count columns in the submitter's event manager panel |
| Stats refresh | AJAX endpoint `evors_ajax_get_auem_stats` — returns current RSVP counts for an event without a full page reload |
| Language strings | RSVP form labels added to ActionUser language settings panel |

---

## 6. RSVP Invitees (eventon-rsvp-invitees — Optional)

A companion add-on (`evorsi`) that allows admin to pre-seed an invitation list for an event. When a pre-invited email submits an RSVP, the RSVP is linked to the invitation record. Co-enqueues `evorsi_script` and `evorsi_styles` alongside RSVP scripts.

---

## 7. RSVP Events Waitlist (eventon-rsvp-events-waitlist — Optional)

A companion add-on that extends the RSVP `waitlist` status:
- Auto-promotion: when a "yes" RSVP cancels, the next waitlisted attendee is auto-promoted and sent a confirmation email.
- Waitlist capacity: separate from main RSVP capacity.

---

## Integration Summary Table

| Integration | Required? | Direction | Key Hook / API |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | Multiple hooks |
| Virtual Events | Optional | Outbound (gate) | `eventonrs_confirmation_email`, `evovp_signin_user` |
| QR Code | Optional | Inbound | `evoqr_checkin_otherdata_ar` |
| Webhooks | Optional | Outbound | `evors_new_rsvp_saved`, `evors_checkin_guest` |
| ActionUser | Optional | Bidirectional | `EVO_ActionUser` class, AJAX `evors_ajax_get_auem_stats` |
| RSVP Invitees | Optional | Bidirectional | Co-loaded scripts |
| RSVP Waitlist | Optional | Extension | Waitlist status + auto-promote cron |

---

## Dateline Design Notes

1. **RSVP is the reference implementation for free attendee registration.** All its patterns — capacity gating, status transitions (yes/no/maybe/waitlist), per-field customization, email templates — are directly applicable to Dateline's RSVP module.
2. **No WooCommerce dependency** = clean implementation to port. This is the highest-confidence module in the P1 set for direct TS/Dateline adaptation.
3. **Webhook payload schema** defines the external sync contract. Dateline should match or extend the `new_rsvp` payload shape for integration compatibility.
4. **Race condition on capacity** (no atomic decrement) is a known weakness. Dateline should use KV-level atomic operations (per AGENTS.md: `inventory:` namespace + `hold:{cartId}` with TTL).
5. **RSVP choice radio (y/n/m)** is a useful UX pattern for events where "maybe" is meaningful (hybrid events, informal meetups). Dateline's RSVP should support configurable choice sets.
