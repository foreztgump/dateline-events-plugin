# eventon-qrcode — Hooks & Integration Points

## Actions Consumed

| Hook | Purpose |
|------|---------|
| `template_include` | Intercept WP template loading for the check-in page |
| `init` | Register styles; set up plugin |
| `eventonrs_rsvp_post_table` | Render QR code in admin RSVP post table row |
| `eventonrs_confirmation_email` | Render QR code in RSVP confirmation email |
| `evors_confirmation_email_before` | Pre-generate and cache QR image before email sends |
| `evotx_one_ticket_extra` | Render QR code on single ticket display (completed orders only) |

## Filters Consumed

| Hook | Purpose |
|------|---------|
| `evotx_tixPost_tixid` | Intercept ticket ID display (hook exists, returns unchanged) |
| `evotx_email_tixid_list` | Replace ticket ID text with QR image in ticket emails |
| `upload_dir` | Redirect QR image uploads to `evo_qr_codes/` subdirectory |
| `wp_unique_filename` | Append random suffix to QR filenames |
| `posts_where` | Exclude QR images from WP media library (unless setting enabled) |

## REST Endpoints

Namespace: `eventon` (WP REST API)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/eventon/events_list` | None (public) | List all published events with type (rsvp/tickets/none) |
| GET | `/eventon/attendees_list/{event_uid}` | None (public) | All attendees for event (RSVP + ticket) |
| GET | `/eventon/one_attendee/{ticket_number}` | None (public) | Single attendee data |
| GET | `/eventon/checkin/{ticket_number}?checkin_status=checked\|check-in` | None (public) | Check in or uncheck a ticket/RSVP |

**Critical security gap**: All four endpoints have `permission_callback => return true` — **no authentication**. The commented-out alternative was `is_user_have_permission_to_checkin()`. This means any public request can check in attendees or view all attendee PII.

## External Dependencies

- **api.qrserver.com** — QR image generation (HTTP GET, synchronous at email-send time). Failure falls back to empty string (no QR shown).

## Dateline Design Implications

- **QR encoding**: Use HMAC-signed tokens, not base64. Format: `HMAC-SHA256(ticket_id:event_id:timestamp, secret)` with short TTL for one-time check-in.
- **Check-in endpoint**: Must require authentication (staff role). REST API with proper `permission_callback`.
- **QR generation**: Generate server-side or use a well-known library; don't depend on third-party HTTP service during email delivery. Use `ctx.waitUntil` for image pre-generation.
- **Un-check support**: The `?action=unc` pattern maps cleanly to a `PATCH /checkin/{id}` with `status: 'check-in'`.
- **Attendee list API**: Needs pagination and authentication. Current WP implementation has neither.
