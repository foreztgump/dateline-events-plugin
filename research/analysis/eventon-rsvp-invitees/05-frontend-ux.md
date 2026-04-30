---
plugin: eventon-rsvp-invitees
version: 1.0.2
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 05-frontend-ux
note: >
  Static-analysis walkthrough — no live site. All UX described from PHP
  source in includes/class-frontend.php, class-template_views.php, and
  templates/invitation_email.php. See 00-overview.md and 02-hooks.md for
  architectural context.
---

# eventon-rsvp-invitees 1.0.2 — Frontend UX

---

## Display Model

The plugin adds no new pages and no new URL patterns. All frontend output appears as modifications to the standard EventON RSVP event card. The key mechanism is a URL parameter: any event URL appended with `?invite=<token>` activates invite mode for that page load.

---

## 1. Token Activation

When a page loads with `?invite=<token>` in the query string, `evorsi_frontend` checks the token against the invitee list for the current event. The token is `base64_encode(email . '-' . rsvp_post_id)`. If a matching, confirmed invitee record exists, the frontend caches the `EVORSI_Invitee` object for the rest of the page lifecycle.

If no valid token is present and the event has "Enable Invitee Only RSVP" active, the RSVP card content is hidden (`evors_eventcard_content_show` returns false) and an unauthenticated gate message is shown instead.

---

## 2. Gate: Non-Invited Visitors

When invitee-only mode is on and no valid `?invite=` token is present, the standard RSVP form is entirely suppressed. In its place, via the `evors_eventcard_notshow_content` action, the plugin outputs a single line of text:

```
Only invited guests are allowed to RSVP!
```

No form, no attendance counts, no capacity information is shown to non-invited visitors. The EventTop bar RSVP count/one-click button is also hidden (via `evors_eventtop_show_content` returning false when invitee mode is on).

---

## 3. RSVP Form: Invited Guest View

When a valid token is present, the RSVP form is rendered with several modifications applied via filters on the RSVP addon's form rendering pipeline:

**Form customisations:**
- **Title**: Changed from the standard event name to `"You are invited to [event-name]"`.
- **Subtitle**: Cleared (empty string).
- **Prompt text**: A paragraph `"Please use the form below to let us know your attendance!"` is injected below the subtitle.
- **Name and email fields**: Pre-filled from the invitee record (`first_name`, `last_name`, `email`).
- **RSVP type**: Form's hidden `rsvp_type` field is set to `invitee` (not the default `y/n/m` types).
- **Remaining spaces section**: Hidden — capacity is not surfaced to invitees.
- **Hidden field `invite_status`**: Set to `first_time` if the invitee has not yet responded, or `na` if they have. This determines the post-submit thank-you message.

The RSVP choice buttons (yes/no/maybe) are inherited from the base RSVP addon without modification.

---

## 4. Post-Submit Confirmation

After a successful RSVP submission, the form area is replaced by a confirmation panel. The message shown depends on `invite_status`:

- **First time responding**: `"Thank you for responding to our invitation!"`
- **Updating an existing response**: `"Thank you for making changes to your reservation!"`

On the RSVP card (outside the form), after responding, a status line is shown beneath the invitee's name:
- RSVP "yes": `"We look forward to seeing you at the event!"`
- RSVP "no": `"Sorry to hear you can not make it to the event!"`
- No response yet: `"We look forward to seeing you at our event! Please let us know your attendance!"`

The invitee's name is displayed in a styled badge (`<i class='evorsi_invitee_name'>`) alongside this message.

---

## 5. Message Wall (When Enabled)

If the event has messaging enabled (`_evorsi_messaging = yes`), a message section is rendered at the bottom of the RSVP card via the `evors_eventcard_end_rsvp` action — but only for visitors with a valid token.

### Message Wall Layout

```
Message Wall
─────────────────────────────────
[preload skeleton while messages load]

[message text]
[sender name] - [time ago] - [public|private]
...

─────────────────────────────────
[Post a message to wall or message host]
OR
[Send a message to host]         ← depending on whether wall is enabled

[textarea: "Type your message here..."]
[Post Message button]  [Post message to wall as well ○●]
```

The title "Message Wall" and the prompt text both adapt: if `_evorsi_invitee_wall` is enabled, the prompt reads "Post a message to wall or message host"; if only private messaging is enabled, it reads "Send a message to host". The "Post message to wall as well" toggle only affects whether the message's visibility is `public` or `private`.

Messages are loaded asynchronously on page load via the `evorsi_get_msgs` AJAX action (available to non-logged-in users). The number of messages shown initially is controlled by the `evorsi_msg_wall_messages` filter (default: 2).

Each message in the wall is rendered via a Handlebars template. Public messages show the sender name, relative time (e.g., "3 days ago"), and visibility label. Private messages (host-only) are hidden from the wall view — they appear only in the admin's Invitee Manager message thread.

### Sending a Message

Submitting the message form calls the `evorsi_new_msg` AJAX action (available to non-logged-in users). On success, the wall reloads with the updated public message list. On failure, an inline notice displays "Message could not be saved, try again later!" — or "Message successfully posted!" on success.

When a guest posts a message, a notification email is sent to the admin (via the RSVP addon's notification email system). When the admin replies from the Invitee Manager, a notification email is sent to the guest.

---

## 6. Invitation Email

The invitation email is sent when an admin creates a new invitee via the manager. The template is `templates/invitation_email.php`, overrideable by placing a copy in the theme at `templates/email/rsvp/`.

### Email Structure

```
You are Invited!
[Event Title]
Please RSVP to let us know if you can make it!
[Yes ▸]  [No ▸]
Event Time: [formatted event time]
Location: [location name - address]
```

The Yes/No buttons are anchor links to `event_permalink?invite=<token>&rsvp=y` and `?invite=<token>&rsvp=n` respectively — clicking either opens the event page with the token pre-set and the RSVP response pre-selected. Additional data rows (event time, location) are filterable via the `evorsi_invitation_email_data` filter.

The email subject is configurable in global settings (`evors_invitation_e_subject`); it can be suppressed entirely with the `evors_dis_invitation_email` toggle.

A confirmation email (using the base RSVP addon's standard confirmation template, including any QR code if that addon is active) is sent to the invitee after they respond via the form.

---

## 7. JavaScript & AJAX

Frontend assets `evorsi.js` and `evorsi.css` are enqueued on all pages with EventON output (co-loaded alongside the base RSVP addon's scripts). The JS global `evorsi_ajax_script` provides `ajaxurl` and a nonce (`evorsi_nonce`).

**AJAX actions (frontend-accessible, no login required):**

| Action | Handler | Purpose |
|---|---|---|
| `evorsi_get_msgs` | `EVORSI_Manager::get_msgs` | Load message thread for an invitee |
| `evorsi_new_msg` | `EVORSI_Manager::new_msg` | Post a message to wall or host |

**AJAX actions (admin-only):**

| Action | Handler | Purpose |
|---|---|---|
| `evorsi_content` | `EVORSI_Manager::get_manager_content` | Load Invitee Manager lightbox |
| `evorsi_form_submit` | `EVORSI_Manager::submit_form` | Add/edit invitee |
| `evorsi_d_msg` | `EVORSI_Manager::delete_msg` | Delete a message |
| `evorsi_resent_invite` | `EVORSI_Manager::resend_invite` | Resend invitation email |
| `evorsi_email_preview` | `EVORSI_Manager::invitation_email_preview` | Preview invitation email HTML |

The `?invite=` token is also passed into the event JSON payload via the `evo_event_json_data` filter and forces the EventON event card JS to run on page load (`evo_event_run_json_onclick` filter) so the RSVP card opens automatically when following an invite link.
