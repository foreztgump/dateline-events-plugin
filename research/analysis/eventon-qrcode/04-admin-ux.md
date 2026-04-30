---
plugin: eventon-qrcode
version: 2.0.3
analyzed: 2026-04-30
analyst: static-analysis
phase: 2
doc: 04-admin-ux
note: >
  Static analysis of PHP source only — no live site. Plugin is a P2 add-on
  for ticket/RSVP check-in via QR codes. Source at
  research/sources/eventon-qrcode/. See 00-overview.md for architecture.
---

# eventon-qrcode 2.0.3 — Admin UX

---

## Navigation & Menu Structure

eventon-qrcode does **not** add a top-level menu. All admin surfaces live inside the existing EventON settings framework.

```
EventON (top-level menu)
└── Settings → admin.php?page=eventon
    └── QR Code tab (eventon_qr)   ← add-on settings

Pages (WP menu)
└── "Checkin" page                  ← auto-created on first admin load
    (post_state label: "EventON QR Checking Page")
```

The QR Code tab appears in the EventON Settings top-rail navigation alongside General, Language, Licenses, Appearance, and Support. The admin settings link injected into the plugin row ("Settings") points directly to `admin.php?page=eventon#eventon_qr`.

---

## 1. QR Code Settings Tab (`/wp-admin/admin.php?page=eventon#eventon_qr`)

The settings section is registered via the `eventon_settings_tab1_arr_content` filter. All fields are rendered using EventON's standard settings framework (dropdowns, yes/no toggles, checkboxes).

### 1.1 Access Control

| Field | Key | Type | Notes |
|---|---|---|---|
| Allowed check-in roles | `evoqr_001` | Multi-checkbox | Additional WP user roles (beyond administrator) that can use the check-in page; lists all WP roles via `wp_roles` |

### 1.2 Check-in Page

| Field | Key | Type | Notes |
|---|---|---|---|
| QR Code Check-in page | `eventon_checkin_page_id` | Dropdown | Select from all published WP pages; auto-set on first activation |
| Note (static) | — | Note field | Instructs admin to create a page with `[evo_checking_page]` shortcode if using a custom page |

On plugin activation (`admin_init`), if `eventon_checkin_page_id` is not set, the plugin auto-creates a WP page with slug `checkin`, content `[evo_checking_page]`, and saves its ID as `eventon_checkin_page_id`. The page edit screen shows a green notice badge: "This is the EventON QR Code checkin page."

### 1.3 Ticket Encoding

| Field | Key | Type | Notes |
|---|---|---|---|
| Disable encrypted ticket numbers | `evoqr_encrypt_dis` | Yes/No | When Yes, ticket numbers appear as plain text in QR URLs; when No (default), they are base64-encoded |

### 1.4 Scanning Mode

| Field | Key | Type | Options |
|---|---|---|---|
| QR code scanning Mode | `evoqr_mode` | Dropdown | "Using QR Code scanner app (Default)" (`def`) / "QR Code scanner gun" (`gun`) |

Legend: Scanner gun mode keeps the text input focused on page load and submits automatically when the scanner delivers a Return keystroke (i.e., the scan is treated like typing + Enter). Default mode targets a separate QR-scanner app that navigates directly to the check-in URL.

### 1.5 Media Library

| Field | Key | Type | Notes |
|---|---|---|---|
| Show QR Code Images in Media Page | `evoqr_show_in_media` | Yes/No | When No (default), QR images in `evo_qr_codes/` are hidden from `upload.php` and the media library AJAX panel |

### 1.6 API Access (Sub-section)

| Field | Key | Type | Notes |
|---|---|---|---|
| Enable API Access to Mobile APP | `evoqr_enable_api_access` | Yes/No | Gates registration of the four REST routes; disabled by default |

The legend explains that enabling this activates a check-in API for use with mobile apps to read event/attendee data.

---

## 2. Appearance Settings (QR Checking Styles)

The admin settings also contribute a hidden section to EventON's Appearance tab via the `eventon_appearance_add` filter. This section exposes colour pickers for the check-in page's four visual states:

| State | Background key | Font key | Default background |
|---|---|---|---|
| Success (checked) | `evoqr_1` | `evoqr_1a` | `#7ab954` (green) |
| Invalid | `evoqr_2` | `evoqr_2a` | `#ff5c5c` (red) |
| Already checked | `evoqr_3` | `evoqr_3a` | `#25b8ff` (blue) |
| Refunded | `evoqr_4` | `evoqr_4a` | `#7d7d7d` (grey) |

These values are emitted as inline CSS targeting `.evo_checkin_page`, `.evo_checkin_page.no`, `.evo_checkin_page.already_checked`, and `.evo_checkin_page.refunded` via the `eventon_inline_styles_array` filter.

---

## 3. Language Settings

The plugin adds a "ADDON: QR Codes" section to EventON's Language settings tab via the `eventon_settings_lang_tab_content` filter. All check-in page strings are editable there:

| String | Key | Default |
|---|---|---|
| Successfully un-checked ticket! | `evoQR_001` | — |
| Ticket already un-checked! | `evoQR_002` | — |
| Successfully Checked! | `evoQR_003` | — |
| Already checked! | `evoQR_004` | — |
| You have RSVPed NO! | `evoQR_003x` | — |
| Un-check this ticket | `evoQR_005` | — |
| You do not have permission! | `evoQR_007` | — |
| Other Ticket Information | `evoQR_007a` | — |
| Message for RSVP (email intro) | `evoQR_008` | "You can use the below QRcode to checkin at the event" |

Strings without a named key (`var=>1`) in the language tab are translated via the `.po` text domain only (not in-UI editable).

---

## 4. RSVP Admin Post Table Integration

When the RSVP addon is active, the plugin hooks into `eventonrs_rsvp_post_table` to inject a QR code row directly into the admin RSVP record list. Each row shows:

```
QR Code: [QR image — 200×200 px]  # {rsvp_id}
```

This gives check-in staff a visual QR reference in the WordPress admin list view without navigating to the check-in page.

---

## 5. No Custom CPT or Post List Screens

eventon-qrcode does not register any custom post types or add any post list screens. All QR images are stored as WP attachment posts (hidden from the media library by default) and there is no dedicated admin view for QR image management.
