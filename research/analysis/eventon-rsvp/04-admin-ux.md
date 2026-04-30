---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough on Site B (https://dateline-site-b.ddev.site:8443),
  WordPress 6.7 + EventON 4.8 + all add-ons. No WooCommerce installed
  (RSVP does not require WC — fully functional). RSVP enabled on event
  "Annual Tech Conference 2026" (ID 8) for live UX capture. Screenshots in
  screenshots/. See 00-overview.md and 01-data-model.md for static-analysis context.
---

# eventon-rsvp 3.0.3 — Admin UX

---

## Navigation & Menu Structure

eventon-rsvp adds surfaces to the existing EventON admin menus — it does **not** create a top-level menu of its own.

```
EventON (Dashicons calendar-alt)
└── Settings → admin.php?page=eventon
    └── RSVP tab (evcal_rs)        ← add-on settings

Events (CPT menu)
└── All Event RSVPs                ← evo-rsvp CPT list
    admin.php?post_type=evo-rsvp
```

The RSVP tab appears in the EventON Settings top-rail navigation alongside General, Language, Licenses, Styles, and Support.

---

## 1. RSVP Settings Tab (`/wp-admin/admin.php?page=eventon&tab=evcal_rs`)

> Screenshots: `admin-100-settings-rsvp.png`, `admin-101` through `admin-104`

The settings tab uses EventON's standard settings framework. A left-rail sub-navigation switches between four sections without page reload:

```
General | Emails | RSVP Form | Waitlist
```

### 1.1 General RSVP Settings

| Field / Option | Description |
|---|---|
| Allow only logged-in users | Hidden toggle (`evors_onlylogu`); when on, reveals role checkboxes |
| Role filter | Multi-checkbox: Administrator, Editor, Author, Contributor, Subscriber |
| Pre-fill fields for logged-in users | Auto-populate name/email from WP user profile |
| Activate uneditable pre-filled fields | Makes pre-filled fields read-only inputs |
| Disable new account creation | Suppresses auto WP account creation on new RSVP |
| Order attendees by | Select: Last Name / First Name |
| Show guest list as | Select: Initials / Full Name |
| Link guests to matching user profile | Toggle + custom link structure field (supports `{user_id}`, `{user_nicename}`) |
| Disable nonce verification | Debug toggle — removes CSRF check on submission |
| Show RSVP form within EventCard | In-card mode vs. lightbox mode |
| When to close RSVP | Select: When event starts / Allow until event ends / Never close |
| **EventTop Data** | |
| Activate one-click RSVP from eventTop | Logged-in-only quick RSVP from event title bar |
| Show attending guest count | Display yes-count in eventTop bar |
| Show not attending guest count | Display no-count |
| Show remaining spaces count | Display capacity remainder |
| Do NOT show "RSVP Closed" / "No more spaces" tag | Suppress eventTop status badge |
| **ActionUser Integration** | |
| Allow front-end CSV download | Let event submitter download attendee CSV |
| Allow front-end guest checking | Enable front-end check-in |
| Auto-add submitter email to notifications | CC event creator on each new RSVP |

**Key UX observation:** The "EventTop Data" group controls what appears in the compact eventTop bar above events in the EventON calendar view — attendance counts are displayed as small badges without opening the full event card.

### 1.2 Email Templates

Sub-section "Emails" contains:

| Field | Key |
|---|---|
| Disable sending all emails | `evors_disable_emails` |
| Receive email notifications on new RSVP | `evors_notif` |
| "From" Name | `evors_notfiemailfromN` |
| "From" Email Address | `evors_notfiemailfrom` |
| "To" Email Address | `evors_notfiemailto` |
| Email Subject (new RSVP) | `evors_notfiesubjest` — supports `{event-name}`, `{rsvp-id}` |
| Email Subject (update) | `evors_notfiesubjest_update` |
| Daily Digest | `evors_digest` toggle |
| Digest "From" Name / Email | `evors_digestemail_fromN`, `evors_digestemail_from` |
| HTML Template | Toggle; overrideable by placing template in active theme |

### 1.3 RSVP Form Settings

Additional form fields configuration (up to 5 custom fields):

| Field | Key |
|---|---|
| RSVP form title | Editable string |
| Show RSVP choice buttons | Yes / No / Maybe visibility toggles |
| Allow "Maybe" | Toggle |
| Require email address | Toggle |
| Require phone number | Toggle |
| Custom field 1–5 | Name, type (text/select/file), required flag |
| Max submission count | Per-RSVP "count" max (group registrations) |
| File upload field | Optional; submitted files stored in WP uploads |

### 1.4 Waitlist Settings

| Field | Description |
|---|---|
| Enable waitlist | Toggle; waitlist RSVPs bypass capacity and get `waitlist` status |
| Waitlist email template | Separate from confirmation; notified when space opens |
| Waitlist auto-promote | Auto-confirm next waitlisted RSVP when a "yes" cancels |

---

## 2. RSVP Records List (`/wp-admin/edit.php?post_type=evo-rsvp`)

> Screenshot: `admin-200-rsvp-records-list.png`

Standard WP list table for the `evo-rsvp` CPT. Custom columns added by `class-admin-evo-rsvp.php`:

| Column | Notes |
|---|---|
| RSVP Type | yes / no / maybe / waitlist badge |
| Check-in | Checked / not checked indicator |
| Name | Attendee first + last name (from post title) |
| Email | Attendee email |
| Event | Linked event title |
| Count | Number of spaces the RSVP covers |
| Repeat | Occurrence identifier for recurring events |

**Filtering:** Standard WP "All / Published / Draft / Trash" status filter. No EventON-custom filter dropdowns on the list screen (filtering is done from within the event edit RSVP metabox instead).

**Search:** Extended to match attendee name and email meta fields via `pre_get_posts` hook.

**Bulk actions:** Standard WP Edit + Move to Trash only.

**Gotcha:** Post status "Published" = active RSVP. There is no custom "confirmed/cancelled" WP post status — status is stored in postmeta (`_evo_rsvp_type`), not in `post_status`.

---

## 3. Per-Event RSVP Metabox (`#evors_mb1` on `ajde_events`)

> Screenshots: `admin-400-*`

**Metabox ID:** `evors_mb1` | **Label:** "RSVP Event"

The metabox appears on every EventON event edit screen regardless of whether RSVP is enabled — the first thing it shows is the enable/disable toggle.

### State A — RSVP Disabled (default)

Single toggle "Enable RSVP for this event" (`evors_rsvp` hidden input). No other fields visible.

### State B — RSVP Enabled

Enabling the toggle reveals the full RSVP configuration panel (rendered via AJAX):

**Stats bar** (top of metabox when at least one RSVP exists):
```
Yes: [count]  No: [count]  Maybe: [count]  [Sync ↻ button]
[CSV Download button]
[View All RSVPs link → filtered evo-rsvp list]
```

**Capacity group:**
| Field | Key | Notes |
|---|---|---|
| Max RSVP count | `evors_max_rsvp` | 0 = unlimited |
| Manage capacity per repeat instance | Toggle | Shows per-occurrence inputs for recurring events |
| Per-occurrence capacity | `evors_rsvp_max_repeat[]` | One input per recurrence |

**Email overrides (per-event):**
| Field | Notes |
|---|---|
| Additional notification email | Extra recipient for this event's RSVP emails |
| Daily digest for this event | Toggle + recipient |

**Additional field filter:**
- Which of the global custom fields to show on THIS event's RSVP form (multi-select)

**Custom description / image:**
- RSVP section description (rendered above the form in the event card)
- RSVP image (shown in the confirmation email)

**Waitlist per-event:**
- Enable waitlist toggle (overrides global setting)
- Waitlist capacity (separate from main cap)

**Close time override:**
- When to stop accepting RSVPs for this specific event (overrides global setting)

### State C — RSVPs Exist

When attendees have submitted RSVPs, the metabox also shows a compact inline attendee list with:
- Name / RSVP type / count per row
- Quick check-in toggle per attendee
- "Email notification" button per attendee (sends custom message)

---

## 4. evo-rsvp Single Record Edit Screen

Each RSVP is a `post_type=evo-rsvp` post. The edit screen contains four custom metaboxes:

| Metabox | Content |
|---|---|
| `evors_mb1` — Attendee Data | Editable: first name, last name, email, phone, RSVP status, count, associated event, repeat occurrence |
| `evors_mb3` — Notes | Admin-only internal notes field |
| `evors_mb4` — Notifications | Buttons: Resend confirmation email / Send custom notification |
| `evors_mb5` — Webhook | Manual trigger button for `rsvp_status_changed` webhook |

Post title is auto-generated as `"RSVP {first_name} {last_name}"`.

---

## 5. WP Admin Notices

No persistent admin notices from eventon-rsvp (unlike eventon-tickets which warns about WooCommerce). RSVP operates without any external plugin dependencies.
