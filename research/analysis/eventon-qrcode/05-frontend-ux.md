---
plugin: eventon-qrcode
version: 2.0.3
analyzed: 2026-04-30
analyst: static-analysis
phase: 2
doc: 05-frontend-ux
note: >
  Static analysis of PHP source only — no live site. Frontend surfaces are
  the QR code display locations and the check-in page itself.
---

# eventon-qrcode 2.0.3 — Frontend UX

---

## Display Model

QR codes surface in **three frontend locations**:

1. **RSVP confirmation email** — QR image embedded inline for RSVP "yes" guests
2. **Ticket purchase email / order details** — QR image embedded per ticket line item
3. **Single ticket page** — QR image shown on the "My Account → Orders → order → ticket" view

The **check-in page** is a staff-facing frontend page (not public-facing), rendered by a dedicated PHP template and gated behind a login + role check.

---

## 1. QR Code in RSVP Confirmation Email

When the RSVP addon sends a confirmation email (`eventonrs_confirmation_email` action), the plugin appends a QR code block for any guest whose RSVP status is "yes" (`rsvp == 'y'`). Guests who RSVPed "no" receive no QR code. The block renders as:

```html
<p style="...uppercase...">QR Code</p>
<p style="...gray italic...">You can use the below QRcode to checkin at the event</p>
<p><img src="{qr_image_url}" /></p>
```

The introductory sentence is language-customizable via `evoQR_008`. Before the email is sent, `evors_confirmation_email_before` fires to pre-generate and cache the QR image so the email includes an already-uploaded WordPress attachment URL rather than a direct qrserver.com URL.

---

## 2. QR Code in Ticket Emails and Order Details

The plugin hooks `evotx_email_tixid_list` to replace the plain ticket ID string in ticket emails with a combined QR image + ticket number block:

```html
<em><img src="{qr_image_url}" /></em>
<em style="display:block; ...font-size:14px">{encrypted_ticket_number}</em>
```

Refunded tickets show only the plain encrypted ticket number — no QR image. The image size for emails can be overridden via the `evotx_qrcode_email_size` filter (default 200 px).

On the WooCommerce order details page ("My Account → Orders → {order}"), the plugin hooks `evotx_one_ticket_extra` to inject a QR image beneath each ticket entry, but **only** when the WooCommerce order status is `completed` and the ticket status is not `refunded`. The image size is overrideable via the `evotx_qrcode_size` filter.

---

## 3. Check-in Page

The check-in page is a standard WP page (the one stored in `eventon_checkin_page_id`) that renders the plugin's `checking.php` template instead of the active theme's page template. The template intercepts via the `template_include` filter at priority 99. It enqueues `checkin_styles.css` and adds the body class `evocheckin`.

The page content is driven by the `[evo_checking_page]` shortcode (aliases: `[add_eventon_checkin]`), which calls `evoqr_checkin::checkin_page_content()`. The shortcode can accept a `lang` attribute to set a per-page language override.

### 3.1 Authentication and Permission Gate

Before rendering any check-in UI, the page enforces two gates in sequence:

1. **Login check** — unauthenticated visitors see a "Login required to checkin guests" message with a login link. The login redirect returns to the check-in page with the ticket ID preserved in the query string.
2. **Role check** — logged-in users must have administrator role or one of the additional roles configured in `evoqr_001`. Non-authorized users see "You do not have permission!" (`evoQR_007`).

### 3.2 No-Ticket State

If no `?id=` parameter is present, the page renders a minimal form:

```
[Heading: "Type in Ticket ID"]
[Text input: name="id", placeholder="Type another Ticket #"]
[Submit button → GET to check-in page URL]
```

In scanner gun mode, a JavaScript snippet auto-focuses the input on DOM ready and submits on `keyCode 13` (Enter / scanner carriage return).

### 3.3 Ticket Validation

When `?id={value}` is present, the value is decoded as follows:

1. `#` characters are stripped.
2. If the value contains `http`, it is parsed as a full URL and the `id` query param is extracted from it (handles the case where a scanner delivers the entire QR URL as the scan output).
3. If the value is numeric, it is used as-is (RSVP post ID, plain mode).
4. Otherwise, base64 decoding is attempted (the standard encoded case).

The decoded ticket ID is then validated: the WP post must exist, and for ticket-type IDs (`{post_id}-{variant}` format), the stored ticket number must match exactly.

If validation fails, the page shows "This is an invalid ticket ID!" with a link back to the empty check-in form.

### 3.4 Check-in Result UI

Successful validation renders the check-in result page (`div.evo_checkin_page`):

```
Ticket # {decoded_ticket_number}
[Large icon: ✓ or ! or ✗ (Font Awesome)]
[Result message heading]
[Other Ticket Information section (if applicable)]
[HTML extras: related tickets in same order]
```

Result states and their visual treatment:

| State | Icon | CSS class | Background (default) |
|---|---|---|---|
| Successfully checked | ✓ (check) | `yes` | green (`#7ab954`) |
| Already checked | ! (exclaim) | `yes already_checked` | blue (`#25b8ff`) |
| RSVP is "no" | ✗ (times) | `no` | red (`#ff5c5c`) |
| Refunded ticket | ! (exclaim) | `refunded` | grey (`#7d7d7d`) |
| Order not completed | ! (exclaim) | `{order_status} no` | red |
| Invalid ID | ✗ (times) | `no` | red |

After a successful check-in, the page shows two action links:
- "Un-check this ticket" → same URL + `&action=unc`
- "Enter a New Ticket ID" → bare check-in page URL

After an "already checked" result, the same two links appear.

### 3.5 Un-check Flow

Visiting the check-in URL with `?id={ticket}&action=unc` reverses check-in:
- If the ticket is currently `checked`, status is set back to `check-in` and "Successfully un-checked ticket!" is displayed.
- If the ticket is already at `check-in`, "Ticket already un-checked!" is displayed.

### 3.6 Other Ticket Information Panel

Below the main result, the page renders a supplementary data list under the heading "Other Ticket Information" (`evoQR_007a`):

For **tickets**: attendee name, ticket count, order ID (as a link to the WP admin order edit screen), order status.
For **RSVPs**: attendee name (first + last), count, event name, event time, event type taxonomy terms.

If multiple tickets exist in the same WooCommerce order, a secondary panel "tickets in the same order" renders each sibling ticket number as a button linking to its own check-in URL, styled with the ticket's current status as a CSS class.

### 3.7 Scanner Gun Mode

When `evoqr_mode == 'gun'`, the check-in result page also renders a persistent re-scan form below the ticket ID heading:

```
[Text input: name="id", placeholder="Type another Ticket #"]
[Submit button]
```

The input is auto-focused via inline JavaScript so the scanner operator can immediately scan the next ticket without clicking.

---

## 4. Enqueued Styles

- `evo_checkin` — registered from `assets/checkin_styles.css`; enqueued only when the check-in page template loads or when the `[evo_checking_page]` shortcode is rendered.

No scripts are enqueued globally. The scanner gun JS is emitted as an inline `<script>` block only on check-in pages where gun mode is active.
