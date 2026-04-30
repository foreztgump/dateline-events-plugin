# eventon-qrcode — Features & i18n

## Core Features

1. **QR code generation** — Generates QR images via api.qrserver.com, caches in WP media library per ticket/RSVP. Respects repeat intervals.
2. **QR in emails** — QR image embedded in RSVP confirmation and ticket purchase emails.
3. **QR in admin** — QR shown in admin RSVP post table row for manual verification.
4. **Check-in page** — Dedicated WP page (shortcode or template): staff visits URL with `?id=<ticket>` to check in.
5. **Scanner gun mode** — Auto-focus text input so barcode scanner can read directly without mouse click.
6. **RSVP check-in** — Read RSVP status; mark `checked`; block if RSVP is 'no'.
7. **Ticket check-in** — Verify WooCommerce order is `completed`; mark ticket `checked`; block if `refunded`/`cancelled`.
8. **Un-check** — `?action=unc` reverts a checked ticket to `check-in` state.
9. **Role-based access** — Check-in page verifies user role; configurable additional roles.
10. **REST API** — Four endpoints for external scanner apps (events list, attendees list, one attendee, check-in).
11. **Media isolation** — QR images stored in `evo_qr_codes/` with random filename suffixes; hidden from media library by default.
12. **Cross-addon** — Integrates with both RSVP and Tickets addons; works with either or both active.

## Security Issues

- REST endpoints have **no authentication** (commented out).
- QR encoding is **base64 only** (guessable).
- Check-in page uses `$_GET['id']` with minimal sanitization (`str_replace('#', '', $tn)`).

## i18n Strings (via `eventon_get_custom_language` / `evo_lang`)

| Lang key | Default English |
|----------|----------------|
| `evoQR_001` | `'Successfully un-checked ticket!'` |
| `evoQR_002` | `'Ticket already un-checked!'` |
| `evoQR_003` | `'Successfully Checked!'` |
| `evoQR_003x` | `'You have RSVPed NO!'` |
| `evoQR_004` | `'Already checked!'` |
| `evoQR_005` | `'Un-check this ticket'` |
| `evoQR_007` | `'You do not have permission!'` |
| `evoQR_007a` | `'Other Ticket Information'` |
| `evoQR_008` | `'You can use the below QRcode to checkin at the event'` |

## Dateline Feature Mapping

| WordPress feature | Dateline equivalent |
|------------------|-------------------|
| QR image via qrserver.com | Generate QR SVG/PNG server-side (e.g., `qrcode` npm package) |
| QR cached in postmeta | Cache QR image URL in KV `qr:{ticket_id}` (TTL: event date + 30 days) |
| Check-in page | Admin route: `admin.entry` check-in view; accepts scanner input |
| REST check-in endpoint | `POST /api/checkin` with staff auth; idempotent (repeated check-in returns 'already checked') |
| Un-check | `DELETE /api/checkin/{id}` or `PATCH` with `status: check-in` |
| Scanner gun mode | Frontend: auto-focus input field after render |
| Role-based access | Dateline capability: `write:checkin` — separate from event management |
