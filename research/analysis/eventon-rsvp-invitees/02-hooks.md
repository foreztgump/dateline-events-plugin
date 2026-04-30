# eventon-rsvp-invitees — Hooks & Integration Points

## Actions Consumed

| Hook | Purpose |
|------|---------|
| `evors_rsvp_updated` | Update invitee status to check-in; send confirmation + admin notification emails |
| `evors_eventcard_end_rsvp` | Render the message wall panel inside the RSVP event card |
| `evors_eventcard_notshow_content` | Show "only invited guests" message if no valid token |
| `evors_attendee_notification_invitation` | Build and send the custom invitation email |
| `evors_form_under_subtitle` | Inject "Please use the form below..." text into RSVP form |

## Filters Consumed

| Hook | Purpose |
|------|---------|
| `evors_rsvp_byauthor` | Override RSVP identity lookup to return invitee ID from token |
| `evo_event_json_data` | Inject invite token into event JSON payload |
| `evo_event_run_json_onclick` | Force event JS to run when invite param present |
| `evors_eventcard_content_show` | Hide RSVP card entirely if invitees-only and no valid token |
| `evors_eventcard_show_subtitle` | Show/hide subtitle based on invite state |
| `evors_evc_user_rsvp_txt` | Personalized greeting + attendance status text |
| `evors_eventcard_show_remaining_rsvp_section` | Hide remaining-spots section when invite mode active |
| `evors_eventcard_selection_data_array` | Inject invite token + cap into JS data |
| `evors_form_rsvp_type` | Override rsvp_type to 'invitee' when invite token present |
| `evors_rsvp_form_args` | Pre-fill name/email fields from invitee record |
| `evors_form_event_title` | Change form title to "You are invited to [event-name]" |
| `evors_form_event_subtitle` | Clear subtitle |
| `evors_form_hidden_values` | Inject `invite_status` (first_time / na) into hidden fields |
| `evors_rsvp_form_message` | Return personalized thank-you message after RSVP |
| `evors_eventtop_show_content` | Hide event-top RSVP count when invitees enabled |
| `evo_single_event_content_data` | Load message wall template data via AJAX event content |
| `evors_checking_status_text_ar` | Add 'created', 'waiting' status labels |

## REST Endpoints

None. Messaging uses WordPress AJAX via `evorsi.js`.

## Dateline Design Implications

- **Token format is weak**: `base64(email-id)` has no HMAC. Dateline should use a signed token (HMAC-SHA256 over `invitee_id:event_id:secret`).
- **Message wall**: Stored as postmeta; Dateline needs a `messages` table with `(invitee_id, event_id, body, visibility, sender, created_at)`.
- **Visibility model**: `public` = all invitees see it; `private` = host only. Dateline can implement this as a `visibility` enum field.
- **Invitation email** is a dedicated email type (not a standard RSVP confirmation). Dateline needs a separate `invitation` email template.
- **No rate limiting on messaging** — Dateline must add per-invitee message rate limit.
