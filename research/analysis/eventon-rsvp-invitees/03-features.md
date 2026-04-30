# eventon-rsvp-invitees — Features & i18n

## Core Features

1. **Invitee-only RSVP gating** — When active, only guests with a valid `?invite=` token can access the RSVP form; others see "Only invited guests are allowed to RSVP!"
2. **Invite token links** — Each invitee gets a unique URL `event_permalink?invite=base64(email-id)`. Token pre-fills the RSVP form with name/email.
3. **RSVP response tracking** — Invitee can respond yes/no/maybe; status tracked per-record.
4. **Attendance stats** — Admin sees invited/attending/not-attending counts per event.
5. **Invitation email** — Custom template (not the standard RSVP confirmation) sent on invite creation.
6. **Confirmation email** — Sent after invitee responds (delegates to RSVP addon's confirmation flow).
7. **Private messaging** — Invitee ↔ host private messages, stored per RSVP record; host can delete messages.
8. **Public message wall** — Optional wall where invitees can post publicly visible messages.
9. **Invitee manager** — Admin panel to add/edit/delete invitees, send/resend invitations.
10. **Invitee wall toggle** — Separate toggle for wall vs. private-only messaging.

## Known Gaps

- **Token is not signed**: `base64(email-id)` is guessable for motivated attackers.
- **No message pagination**: All messages fetched via WP_Query with `posts_per_page=-1`.
- **No bulk invite import**: Must add invitees one at a time via admin UI (CSV importer plugin covers bulk events, not bulk invitees).

## i18n Strings (text domain: `evorsi`)

| Context | Default English |
|---------|----------------|
| Gate message | `'Only invited guests are allowed to RSVP!'` |
| Form title | `'You are invited to [event-name]'` |
| Form prompt | `'Please use the form below to let us know your attendance!'` |
| Response: yes | `'We look forward to seeing you at the event!'` |
| Response: no | `'Sorry to hear you can not make it to the event!'` |
| No response yet | `'We look forward to seeing you at our event! Please let us know your attendance!'` |
| First-time thanks | `'Thank you for responding to our invitation!'` |
| Update thanks | `'Thank you for making changes to your reservation!'` |
| Message wall label | `'Message Wall'` |
| Post message | `'Post Message'` |
| Message to wall | `'Post message to wall as well'` |
| Status labels | `'created'`, `'waiting'` |

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| Invitee CPT | `invitees` table (event_id, name, email, party_size, status, token_hash, created_at) |
| Token URL | HMAC-signed token in email; verified server-side on RSVP form load |
| Messages postmeta | `invitee_messages` table (invitee_id, event_id, body, visibility, sender, created_at) |
| Admin invitee manager | Admin route: `admin.entry` with invitee list view + add/edit forms |
| Invitation email | Dedicated `invitation` email event; sent via `ctx.waitUntil` |
| Stats | Computed on-read from `invitees` table; cache in KV (TTL 5 min) |
