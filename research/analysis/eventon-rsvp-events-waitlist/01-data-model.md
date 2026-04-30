# eventon-rsvp-events-waitlist — Data Model

## Post Types Used

| CPT | Usage |
|-----|-------|
| `evo-rsvp` | Waitlist entries (no new CPT; overloads RSVP CPT) |

## Post Meta on `ajde_events` (per-event config)

| Key | Values | Meaning |
|-----|--------|---------|
| `_evorsw_waitlist_on` | `yes` / `no` | Whether waitlist is active for this event |

## Post Meta on `evo-rsvp` (per-waitlist-entry)

| Key | Values | Meaning |
|-----|--------|---------|
| `rsvp_type` | `'waitlist'` | Distinguishes waitlist from normal RSVP entries |
| `status` | `'waitlist'` | Check-in status while on waitlist |
| `e_id` | `{event_post_id}` | Parent event ID |
| `repeat_interval` | integer | Repeat instance index (recurring events) |

All other `evo-rsvp` fields (`first_name`, `last_name`, `email`, `count`, etc.) are inherited from the RSVP addon schema.

## State Machine

```
[submitted when capacity full]
  → rsvp_type='waitlist', status='waitlist'

[space freed / offered]
  → rsvp_type='normal', status='check-in'
  → emails sent: confirmation + attendee_notification + admin notification

[removed voluntarily]
  → wp_trash_post(rsvp_id)
```

## Capacity Logic

Capacity check delegates entirely to `EVORS_Event::remaining_rsvp()` (from the RSVP addon). Waitlist activates when `remaining_rsvp()` returns `0` or `'wl'`. No independent capacity counter.

## Options

No new `wp_options` keys. Settings are embedded in EventON's main settings pages under the RSVP tab.
