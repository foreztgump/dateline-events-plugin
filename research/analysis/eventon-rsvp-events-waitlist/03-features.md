# eventon-rsvp-events-waitlist — Features & i18n

## Core Features

1. **Per-event toggle** — Waitlist is enabled/disabled per event (`_evorsw_waitlist_on`).
2. **Auto-redirect to waitlist** — When RSVP capacity is reached and waitlist is active, the submission form automatically sets `rsvp_type='waitlist'` instead of rejecting the request.
3. **Party-size awareness** — Waitlist offer respects group size: a party of 3 is only offered space when 3+ spots are freed simultaneously.
4. **FIFO offer order** — `get_waitlist()` orders by post date ASC; first to join is first offered.
5. **Live waitlist size display** — Frontend shows current waitlist count in the event card.
6. **Email notifications** — On waitlist join: attendee notification. On space offer: confirmation email + attendee notification + admin notification.
7. **Remove from waitlist** — Guest can opt out; form action `wl-remove` trashes the RSVP CPT.
8. **ActionUser integration** — Waitlist count and list appear in the per-event admin panel.
9. **Sync on update** — After offering space, `sync_rsvp_count()` is called to keep counters consistent.

## Known Gaps / Race Conditions

- **No atomic write**: `offer_space_to_waitlist()` is not wrapped in a transaction. If two RSVP cancellations arrive concurrently, the same slot could be offered twice.
- **No waitlist cap**: Unlimited number of entries can join the waitlist.
- **No notification on removal**: `remove_from_waitlist()` method exists but body is empty (TODO).
- **Email sends are synchronous**: Could time out on large guest lists.

## i18n Strings (text domain: `evorsw`)

| Key / Context | Default English |
|--------------|----------------|
| form subtitle | `'All the spaces are filled, but you will be added to our waitlist!'` |
| badge | `'Get on the waitlist'` |
| count display | `'Waitlist is Open'` / `'Current waitlist size'` |
| user status | `'You are in our waitlist!'` |
| join CTA | `'Join the waitlist!'` |
| remove CTA | `'Remove me from waitlist'` |
| success header | `'Successfully added to waitlist for [event-name]'` |
| party note | `'NOTE: You will be offered space only when all your party size spaces available'` |
| offer notice | `'You have been offered confirmed space!'` |
| offer message | `'Your waitlist status has been moved to confirmed...'` |
| admin notice title | `'Attendee Offered Space'` |
| removed | `'You are successfully removed from waitlist!'` |

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| Waitlist CPT | `waitlist_entries` table (event_id, rsvp_id, party_size, position, created_at) |
| Auto-redirect on full | RSVP submit handler checks capacity atomically; returns waitlist confirmation |
| FIFO offer | Order by `created_at` ASC when scanning for next entry to offer |
| Email notifications | `ctx.waitUntil(sendEmail(...))` — never synchronous |
| Remove from waitlist | DELETE waitlist_entry; no KV decrement needed |
