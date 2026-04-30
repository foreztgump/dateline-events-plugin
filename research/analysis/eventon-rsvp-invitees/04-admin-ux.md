---
plugin: eventon-rsvp-invitees
version: 1.0.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Static-analysis walkthrough — no live site. All UX described from PHP
  source in includes/class-admin.php, class-invitee_manager.php, and
  class-template_views.php. See 00-overview.md through 03-features.md for
  data-model and hook context.
---

# eventon-rsvp-invitees 1.0.2 — Admin UX

---

## Navigation & Menu Structure

This add-on adds no top-level or sub-menu items of its own. All admin surfaces are embedded within EventON RSVP's existing admin structure.

```
EventON → Settings → RSVP tab (evcal_rs)
    └── Emails sub-section
        └── "Invitation Emails" block    ← new section added by this plugin

Events → evo-rsvp list
    └── RSVP record columns              ← status column extended for invitees

ajde_events post edit screen
    └── RSVP metabox
        └── "Enable Invitee Only RSVP" toggle + Invitee Manager launcher
```

---

## 1. RSVP Global Settings Extension

Within the EventON RSVP Settings tab → **Emails** sub-section, the plugin appends an "Invitation Emails" block with three fields:

| Field | Key | Type | Default |
|---|---|---|---|
| Disable sending out invitation email | `evors_dis_invitation_email` | Yes/No toggle | (not set = enabled) |
| Email Subject Line (Invitation Email) | `evors_invitation_e_subject` | Text input | `'You are invted!'` (sic) |

The block is a sub-header + two settings rows inserted after the standard RSVP email settings — no separate settings page.

The plugin also appends an **"RSVP Invitee Styles"** block to EventON's Appearance settings panel with six colour pickers:

| Setting | Key |
|---|---|
| Public Message Background Color | `_evorsi_1` (default `#eaeaea`) |
| Public Message Font Color | `_evorsi_2` (default `#808080`) |
| Private Message Background Color | `_evorsi_3` (default `#ded3bb`) |
| Private Message Font Color | `_evorsi_4` (default `#808080`) |
| Admin Message Background Color | `_evorsi_5` (default `#d2ebf9`) |
| Admin Message Font Color | `_evorsi_6` (default `#808080`) |

These colours are injected as inline CSS targeting `.evorsi_message_wall` descendants and take effect globally across all events using the message wall.

All invitee-specific language strings are also exposed in EventON's Language settings panel under an "Invitees" collapsible group (approximately 20 strings covering gate messages, form prompts, wall labels, and email subjects — see 03-features.md i18n table for the full list).

---

## 2. Per-Event RSVP Metabox — Invitee Section

On the `ajde_events` post edit screen, inside the existing RSVP metabox, the plugin injects its controls via the `evors_event_metafields` action hook.

**Compatibility guards rendered before showing the toggle:**

- If the event is a **repeating event**: displays "Invitees for RSVP: Is not available for repeating events." and returns without rendering any invitee controls.
- If the **RSVP waitlist addon is active** for this event: displays "Invitees for RSVP: Can not use invitees while waitlist is active." and returns.
- If invitee mode **is** active: displays a note "When invitees active, you can not set capacity." above the standard RSVP capacity settings.

**Controls rendered (when compatible):**

| Control | Key | Notes |
|---|---|---|
| Enable Invitee Only RSVP | `evorsi_invitees` | Yes/No toggle; revealing sub-panel below |
| RSVP Invitee Manager (button) | — | Opens the Invitee Manager lightbox (AJAX, `action=evorsi_content`) |
| Enable messaging on eventcard | `_evorsi_messaging` | Yes/No toggle; reveals the wall sub-toggle when on |
| Enable invitees only message wall | `_evorsi_invitee_wall` | Yes/No toggle; nested, visible only when messaging is enabled |

When "Enable Invitee Only RSVP" is saved as `yes`, the plugin also forces `evors_capacity` to `no` in the POST data, removing capacity limits (capacity is implicit from the invitee list size).

---

## 3. Invitee Manager Lightbox

Clicking "Configure" (RSVP Invitee Manager button) makes an AJAX call (`action=evorsi_content`, passing the event ID) that returns an HTML panel displayed in a lightbox. This is the primary admin UI for managing an event's invite list.

### Lightbox Layout

```
[Invited: N] [Attending: N] [Not-attending: N]     [Invite a New Attendee ▸]

Name            Email           Status      Actions
──────────────────────────────────────────────────
[First Last]    [email]         [status]    [Link] [status badge] [👁 view]
...
```

**Stats bar** — Rendered via a Handlebars template (`evorsi_stats`); three counters: `invited` (includes `created`/`email-sent`/`email-opened` states), `attending` (responded yes), `not-attending` (responded no). Counts reflect party size (`count` field), not number of records.

**Invitee rows** — Rendered via `evorsi_invitee_rows` Handlebars template. Each row shows: name (with `+N` party size indicator if count > 1), email, RSVP status label, and three action elements:
- **Link** — the invitee's unique token URL; clicking copies/opens it.
- **Status badge** — current `status` value from the state machine (`created`, `waiting`, `check-in`, `checked`, or derived `attending`/`not-attending`).
- **Eye icon** — opens the individual invitee detail/edit panel within the same lightbox.

---

## 4. Add / Edit Invitee Form

"Invite a New Attendee" opens an inline form within the lightbox. The same form is reused for editing existing invitees (determined by a `type` field: `new` vs. `edit`).

### Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| First Name | Text input | Yes | |
| Last Name | Text input | No | |
| Email Address | Text input | Yes | |
| Number of people in the party | +/− number | No | Corresponds to `count` meta; note shown about enabling count field in global RSVP form settings |
| Additional Information (edit only) | Read-only display | — | Shows RSVP addon custom field values; not editable here |
| Messages tab (edit only) | Message thread UI | — | Shows admin ↔ invitee message thread; admin can compose and send messages |

### Form Actions (New)

Submit button labelled **"Send Invite"** (`evorsi_form_submit` AJAX action, `type=new`):
1. Creates a new `evo-rsvp` post with `rsvp_type=invitee`.
2. Sends the invitation email (unless globally disabled), using the configured subject.
3. Sets invitee status to `waiting` after successful email send.
4. Notifies the admin via RSVP addon's notification email.
5. Refreshes the invitee rows in the lightbox.

### Form Actions (Edit)

Two buttons:
- **"Resend Invitation"** — calls `evorsi_resent_invite` AJAX action, resends the invitation email.
- **"Save Changes"** — calls `evorsi_form_submit` AJAX action with `type=edit`; updates postmeta fields for the existing record.

---

## 5. RSVP Record List Extension

On the `evo-rsvp` CPT list table, the plugin hooks into two column rendering actions:

- `evors_admin_cpt_column_rsvp_`: For invitee records that have not yet responded (no RSVP), renders the current `status` value (e.g., `created`, `waiting`) as a `<p>` element with the status as the CSS class.
- `evors_admin_cpt_column_rsvp_status`: For records where status is not `checked` or `check-in`, replaces the default status text with the invitee's `status` field value.

These hooks integrate invitee status display into the standard RSVP list without adding new columns.

---

## 6. RSVP Record Single Edit Screen Extension

On the `evo-rsvp` single post edit screen, for invitee records, the plugin appends a note below the standard resend-email button:

> "To resend the invitation email to invitee please go to Event Edit > RSVP Invitee Manager"

It also adds an **"Preview RSVP Email"** trigger that opens a lightbox displaying the rendered invitation email HTML for that invitee (`evorsi_email_preview` AJAX action). This lets admins inspect the invitation email without sending it.

---

## 7. Admin Script/Style Loading

Admin-side assets (`admin.js`, `admin.css`) are enqueued on RSVP admin screens via the `evors_enqueue_admin_scripts` action. The localized script object (`evorsi_admin_ajax_script`) provides `ajaxurl` and a nonce (`wp_create_nonce(AJDE_EVCAL_BASENAME)`). EventON's default frontend scripts are also loaded in admin context for the UI component library (`EVO()->frontend->load_default_evo_scripts()`).
