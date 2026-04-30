# eventon-qrcode — Data Model

## Post Meta on `evo-rsvp`

| Key | Type | Meaning |
|-----|------|---------|
| `_qrimg_{rsvp_id}_{ri}` | string (URL) | Cached QR code image URL for RSVP; key includes repeat_interval |
| `status` | string | `'check-in'` (scanned, not yet checked) → `'checked'` (checked in) |

## Post Meta on `evo-tix` (ticket posts)

| Key | Type | Meaning |
|-----|------|---------|
| `_qrimg_{ticket_number}_` | string (URL) | Cached QR code image URL for ticket |
| `status` | string | `'check-in'` → `'checked'` → `'refunded'` |

## Options (`evcal_options_evcal_1`)

| Key | Values | Meaning |
|-----|--------|---------|
| `eventon_checkin_page_id` | int | WP page ID of the check-in page |
| `evoqr_001` | array of user roles | Extra roles allowed to perform check-in (beyond admins) |
| `evoqr_mode` | `'gun'` / default | Scanner gun mode (auto-focus input on load) |
| `evoqr_encrypt_dis` | `yes`/`no` | Disable base64 encoding of ticket numbers in QR URLs |
| `evoqr_show_in_media` | `yes`/`no` | Show QR images in WP media library |

## Ticket Number Format

- **RSVP**: integer post ID (e.g., `1234`)
- **Ticket (EVOTX)**: `{evotix_post_id}-{variant}` (e.g., `567-1`)

## QR Code Data Encoded

```
{checkin_page_url}?id={base64(ticket_number)}&ri={repeat_interval}
```

`base64` encoding is the only protection (not cryptographically secure). An optional AES-256-CBC `evo_crypt()` function exists in the code but is **not called** in the main flow — `encrypt_TN()` only uses base64 or plain pass-through.

## Check-in Status Flow

```
(none) → 'check-in' → 'checked'
                    ← 'check-in'  (un-check action: ?action=unc)
```

For tickets: also `'refunded'` state (blocks check-in).
