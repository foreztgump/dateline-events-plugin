---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-rsvp — Features

## Admin Screens

### RSVP Settings Tab

Accessible via EventON → Settings → RSVP. Rendered by `EVORS_Settings::evo_tab_content()`. Contains:

- **General Settings**: Logged-in-only restriction with optional user-role filter; nonce on/off toggle; capacity options.
- **Form Fields**: Up to 5 configurable additional form fields (label, field type — text, select, file, etc.).
- **Email Settings**: From name/address per email type; subject lines with `{event-name}` and `{rsvp-id}` tokens; notification recipients; daily digest toggle and recipient.
- **Appearance**: RSVP colour and font overrides injected into EventON's inline CSS pipeline.
- **Language**: All frontend and email label strings editable through a dedicated language panel.

### Attendee Management List

Standard WordPress CPT list screen for `evo-rsvp` posts. Customised by `class-admin-evo-rsvp.php`:

- Custom columns: RSVP status (yes/no/maybe), checkin status, attendee name, email, event, count, repeat instance.
- Columns are sortable; default sort is by last name or first name depending on the global orderby setting.
- Full-text search extended to query attendee meta fields (name, email) via `pre_get_posts`.

### Per-Event RSVP Meta Box

Shown on the `ajde_events` edit screen. Contains two distinct UI areas:

1. **RSVP Event Options meta box** (`evors_mb1` on `ajde_events`): top-level toggle to enable RSVP; once enabled reveals a stats bar (current yes/no/maybe counts with a sync button), capacity settings (flat limit or per-repeat-instance limits), per-event email recipient overrides, daily-digest toggle, custom description/image fields, and additional-field filter.

2. **RSVP CPT admin meta boxes** (`evors_mb1`, `evors_mb3`, `evors_mb4`, `evors_mb5` on `evo-rsvp`): show the individual attendee's details, provide email resend and custom-message buttons, display and manage internal admin notes, and surface webhook trigger options.

## Email Templates

All templates live in `templates/` and can be overridden by placing a copy in the active theme under `eventon/templates/email/rsvp/`. All are rendered server-side via `ob_start()` / `include()` and use the EventON global email header/footer wrappers.

### confirmation_email.php

**Trigger**: Sent to the attendee after a new RSVP is saved (unless disabled globally or for waitlist RSVPs; optionally suppressed for "no" answers unless `evors_send_all_confirmations` is on).  
**Recipient**: Attendee's submitted email address.  
**Content summary**: EventON email header; event name, date/time, location, RSVP status badge, event description excerpt. Optional RSVP image. Virtual event link section appended via the `eventonrs_confirmation_email` action hook. EventON email footer.

### notification_email.php

**Trigger**: Sent to the admin (and optional additional recipients) on every new or updated RSVP.  
**Recipient**: Configured admin email; optionally the event author and any per-event `evors_add_emails` addresses.  
**Content summary**: EventON header; attendee name, email, RSVP answer, count, event name, event date/time, location, admin edit links. An action hook (`evors_notification_email_top`) fires at the top. A second action fires based on notice type for customisation.

### attendee_notification_email.php

**Trigger**: Sent to the attendee when an admin manually sends an update notice or specific programmatic events occur (e.g., status change notices).  
**Recipient**: Attendee email.  
**Content summary**: EventON header; notice title and an optional attendee data block (event name, date/time). Notice type and title are configurable per send. Exposes `evors_attendee_notification_{notice_type}` action for content extension. Embeds a filterable data array in the template for programmatic callers.

### digest_email.php

**Trigger**: Sent daily via the `evors_daily_action` cron hook for each event that has `evors_daily_digest = yes` and whose start time has not yet passed.  
**Recipient**: Configured digest recipient email (defaults to admin email).  
**Content summary**: EventON header; event name, date/time, current RSVP counts (yes/no/maybe), and a guest list summary. Provides a daily snapshot of RSVP activity without per-submission noise.

### newuser_email.php

**Trigger**: Sent when the plugin automatically creates a WordPress user account for a new RSVP submitter (only when `evors_reg_user` is not disabled and the email address has no existing account).  
**Recipient**: Attendee email (which becomes the new account username).  
**Content summary**: EventON header; the generated password. Minimal template — no event details. The attendee is expected to log in and change their password through WordPress.

## Frontend Features

### RSVP Form

Rendered by `evors_form::get_form()`. Supports two display modes:

- **Popup/lightbox**: The default; triggered from the event card or event-top.
- **In-card**: When enabled globally or per-event, the form renders inline within the EventON event card.

Form fields: first name, last name, email, phone, RSVP choice (yes/no/maybe radio buttons), space count (when max-per-submission is configured), opt-in for email updates, additional notes, and up to 5 configurable additional fields (text, select, file upload, etc.).

**Update flow**: If the submitter's email already has an RSVP for this event, the same form is reused in "update" mode; the existing `rsvp_type`, count, and field values are pre-populated.

**Capacity gating**: Before saving, the RSVP logic checks `EVORS_Event::has_space_to_rsvp(count)`. If no space remains the form returns a "no space" status code. Waitlist RSVPs bypass the capacity check.

**User creation**: If automatic account creation is enabled and the email is not registered, a WordPress subscriber account is created and a new-user email is dispatched before the RSVP confirmation.

### Confirmation Display

After a successful RSVP, the form is replaced by a success-message section rendered by `evors_form::form_message()`. Shows a header confirming the RSVP, a summary of the submitted data, and optionally a guest-list update (re-fetched to reflect the new attendee).

The event card and event-top section are refreshed via the AJAX response with updated capacity/count data and choice-button HTML.

### User RSVP Manager

Accessed via the `[evo_rsvp_manager]` shortcode. Requires login. Renders through `evors_event_manager::get_user_events()`, which queries all `evo-rsvp` posts authored by the current user. Displays each event with its RSVP status and provides links/actions to update or cancel the RSVP.

The ActionUser integration extends this concept into the ActionUser manager panel, adding RSVP stats boxes per event.

## i18n Feature Taxonomy

All strings use the `evors` text domain. Runtime label customisation is available through the RSVP language settings panel (stored in `evcal_options_evcal_2`), providing multi-language support independent of `.po` translation files.

### RSVP Form

- Form title / subtitle
- RSVP choice labels: "Yes", "No", "Maybe"
- Field labels: first name, last name, email, phone, notes
- Count / spaces label
- Submit button label
- Success message header
- Update confirmation text

### Email Notifications

- Confirmation email subject (supports `#{rsvp-id}` token)
- Notification email subject (new and update variants)
- Attendee notification email subject
- Digest email subject (supports `{event-name}` token)
- New user password email subject

### Attendee Management

- Guest list heading
- "Who's coming" / "Who's not coming" labels
- Checkin status labels: "Check-in", "Checked"
- RSVP manager heading: "Events I have RSVPed to"
- Login prompt text for unauthenticated manager access

### Admin Settings

- RSVP meta box labels in event edit
- Settings tab field labels and tooltips
- Capacity, waitlist, and close-time field labels

### Error Messages

- "There are not enough space!" (capacity exceeded)
- "User is not logged in" (eventtop path)
- "Required Fields Missing"
- "Invalid Nonce"
- "Login Needed" (nopriv fallback)
- Form-level error codes (err7, err8, status 11) translated through frontend message lookup (internal AJAX error codes, not exposed as user-facing strings; included for completeness)

## Integrations

### Virtual Events (`class-intergration-virtual.php`)

Extends `evors_front`. Adds a per-event admin toggle ("User must RSVP to view virtual event information"). When enabled, the virtual event's meeting link, live-now content, and sign-in box are suppressed until the user has an active `y` RSVP. The `eventonrs_confirmation_email` action hook is used to append the virtual meeting link to the RSVP confirmation email after RSVP is confirmed.

Also integrates with "Virtual Plus" (evovp): the user's RSVP status is checked inside the `evovp_signin_user` filter to approve or block virtual-event sign-in.

### QR Code (`class-intergration-qrcode.php`)

Stub integration. Registers a filter on `evoqr_checkin_otherdata_ar` to pass RSVP data through the QR Code addon's checkin pipeline when the check-in type is `rsvp`. The current implementation returns the output unchanged — the hook stub is present as an extension point.

### Webhooks (`class-intergration-webhooks.php`)

Registers two webhook trigger events in EventON's webhook system:

1. **new_rsvp** — fires on `evors_new_rsvp_saved`; payload includes RSVP ID, RSVP status, first name, last name, email, count, event ID, event name, and any configured additional field values.

2. **rsvp_status_changed** — fires on `evors_checkin_guest`; payload includes RSVP ID, RSVP status (y/n/m), first name, last name, email, count, and event ID.

Both are delivered synchronously during the request that triggers them (no queue). Payload is built and dispatched via `EVO()->webhooks->send_webhook()`.

### ActionUser (`class-intergration-actionuser.php`)

Bridges RSVP with the ActionUser addon (frontend event-submission form):

- Adds an "Allow RSVP" toggle and capacity fields to ActionUser's event-creation form, saving them as event meta on form submit.
- Adds RSVP stats columns to the ActionUser event manager panel, showing yes/no/maybe counts per event the user created.
- Provides an AJAX endpoint (`evors_ajax_get_auem_stats`) that the ActionUser manager panel calls to refresh RSVP stats without a full page reload.
- Adds RSVP language strings to the ActionUser language settings panel.
