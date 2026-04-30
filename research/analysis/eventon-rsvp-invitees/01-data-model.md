# eventon-rsvp-invitees — Data Model

## Post Types Used

| CPT | Usage |
|-----|-------|
| `evo-rsvp` | Invitee records (overloads RSVP CPT with `rsvp_type='invitee'`) |

## Post Meta on `ajde_events`

| Key | Values | Meaning |
|-----|--------|---------|
| `evorsi_invitees` | `yes` / `no` | Invitee mode active for event |
| `_evorsi_messaging` | `yes` / `no` | Host–guest private messaging enabled |
| `_evorsi_invitee_wall` | `yes` / `no` | Public message wall enabled |

## Post Meta on `evo-rsvp` (invitee record)

| Key | Type | Meaning |
|-----|------|---------|
| `rsvp_type` | string | `'invitee'` — distinguishes from regular RSVP |
| `status` | string | `'created'` → `'email-sent'` → `'email-opened'` → `'check-in'` → `'checked'` |
| `e_id` | int | Parent event post ID |
| `first_name` | string | Invitee first name |
| `last_name` | string | Invitee last name |
| `email` | string | Invitee email |
| `count` | int | Party size |
| `rsvp` | `y`/`n`/`m` | Attendance response (yes/no/maybe) |
| `msgs` | array | Timestamped message objects `{t, n, v}` (text, name, visibility) |

## Invite Token Format

```
base64_encode(email . '-' . rsvp_post_id)
```

`is_invited()` decodes, splits on `-`, verifies email matches the `evo-rsvp` record. Token is **not signed** — guessable if email + post ID are known. Security note: low entropy for private events.

## Status State Machine

```
created
  → email-sent      (after invitation email delivered)
  → email-opened    (tracked if email client fires pixel)
  → check-in        (after guest responds yes/no/maybe)
  → checked         (after physical check-in at event)
```

Stats surface:
- `invited` = created | email-sent | email-opened
- `attending` = check-in + rsvp='y'
- `not-attending` = check-in + rsvp='n'

## Message Schema

`msgs` postmeta is a PHP-serialized array keyed by Unix timestamp:
```php
[
  1735000000 => ['t' => 'message text', 'n' => 'sender name', 'v' => 'private|public']
]
```
`v='public'` = wall-visible to all invitees; `v='private'` = host only.

## Options

No new `wp_options`. Admin UI adds a tab to EventON's RSVP settings.
