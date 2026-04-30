---
plugin: eventon-rsvp-invitees
version: 1.0.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 06-integrations
---

# eventon-rsvp-invitees 1.0.2 — Integrations

---

## Integration Architecture

This plugin has two hard dependencies and no optional third-party integrations. There are no REST API endpoints, no external HTTP calls, no webhooks emitted, and no WooCommerce, Stripe, or other payment dependencies. All integration is through WordPress hooks into the EventON and EventON RSVP codebases.

---

## 1. EventON Core (Required)

**Type:** Hard dependency (checked at `plugins_loaded`; plugin self-disables with admin notice if absent).
**Minimum version:** EventON 4.6 (declared in `$eventon_version`).

The plugin uses EventON's shared infrastructure throughout:

| Facility | Usage |
|---|---|
| `evo_addons` class | Addon registration, version-check, deactivation cleanup |
| `EVO()->elements` | Renders form controls, Yes/No buttons, tooltips, trigger/lightbox elements in the admin UI |
| `EVO()->temp->get()` | Retrieves Handlebars template strings (stats bar, invitee rows, add/edit form, message thread, wall, notice) |
| `EVO()->cal` | Reads global RSVP settings (`evors_dis_invitation_email`, `evors_invitation_e_subject`) |
| `evo_lang()` / `evo_lang_e()` | Translates all frontend strings through EventON's Language settings pipeline |
| `EVO()->elements->print_trigger_element()` | Renders the admin lightbox triggers (Invitee Manager, email preview) |
| `eventon_inline_styles_array` filter | Injects message wall colour CSS into EventON's inline style block |
| `evo_addons_details_list` filter | Registers this plugin in EventON's add-ons list screen |
| `eventon_enqueue_styles` / `eventon_enqueue_scripts` actions | Co-loads frontend CSS/JS with EventON's asset pipeline |

---

## 2. EventON RSVP (Required)

**Type:** Hard dependency (checked at `plugins_loaded` via `class_exists('EventON_rsvp')`).
**Minimum version:** RSVP addon 3.0 (checked via `version_compare(EVORS()->version, '3.0')`).

This add-on is purely parasitic on the RSVP addon — it extends the RSVP form, RSVP record, and RSVP admin without duplicating the underlying RSVP logic.

**Data model coupling:** Invitee records are stored as `evo-rsvp` CPT posts (the RSVP addon's own post type) with `rsvp_type=invitee` postmeta to distinguish them. `EVORSI_Invitee` extends `EVO_RSVP_CPT` and `EVORSI_Invitees` extends `EVORS_Event`, inheriting all RSVP record accessors.

**Email coupling:** The plugin delegates all email delivery to `EVORS()->email->send_email()`:
- Invitation email: sent as type `attendee_notification` with `notice_type=invitation`, which triggers the `evors_attendee_notification_invitation` action hook — the plugin hooks this action to inject its own invitation email template instead of the standard confirmation.
- Admin notification on new invite creation: sent via `notification` type.
- Admin notification on guest reply: sent via `notification` type.
- Guest confirmation after responding (with QR if applicable): sent by calling RSVP's standard `confirmation` type email — the plugin delegates this entirely to the base RSVP addon.

**Hook surface consumed** (full list in `02-hooks.md`): ~15 RSVP filters and actions covering form rendering, event card visibility, RSVP identity resolution (`evors_rsvp_byauthor`), status text, and the `evors_rsvp_updated` save pipeline.

**Mutual exclusion with RSVP Waitlist:** When the EventON RSVP Waitlist addon is active and its waitlist is enabled for an event, the invitee UI is suppressed for that event with a notice. The two sub-addons cannot be active simultaneously on the same event.

---

## 3. No Other External Integrations

This plugin has no integrations with:
- Any payment processor (Stripe, PayPal, WooCommerce)
- Any email marketing service (Mailchimp, ConvertKit, etc.)
- Any CRM or external HTTP endpoint
- Any REST or webhook outbound calls
- Any third-party JavaScript libraries beyond what EventON already loads (jQuery, jQuery UI)

---

## Integration Summary Table

| Integration | Required? | Direction | Key Mechanism |
|---|---|---|---|
| EventON Core | Yes | Bidirectional | `evo_addons`, EVO() singletons, shared template/element/lang systems |
| EventON RSVP | Yes | Extension (parasitic) | Extends `EVO_RSVP_CPT` / `EVORS_Event`; hooks into RSVP form, email, and save pipeline |
| EventON RSVP Waitlist | Mutual exclusion | — | UI suppressed when waitlist active on same event |

---

## Dateline Design Notes

1. **Invitee gating is a first-class feature on top of the base RSVP module.** Dateline should model it as an opt-in per-event flag on the RSVP configuration, not a separate plugin.
2. **No external dependencies** means the entire invite-token + messaging feature set can be fully implemented within `@dateline/core` or a thin `@dateline/rsvp-invitees` package without any third-party service accounts.
3. **Token security gap**: The original uses `base64(email-id)` which is trivially guessable. Dateline must use `HMAC-SHA256(invitee_id:event_id, secret)` tokens (per AGENTS.md on signed tokens and KV-backed verification).
4. **Message delivery** in the original is fire-and-forget within the AJAX request. Dateline must route message notification emails through `ctx.waitUntil` (per AGENTS.md on bare promise cancellation).
5. **Mutual exclusion with waitlist** should be enforced at the data-validation layer in Dateline (a single event cannot have both `inviteeOnly: true` and a waitlist enabled simultaneously).
