---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough on Site B (https://dateline-site-b.ddev.site:8443),
  WordPress 6.7 + EventON 4.8. WooCommerce is NOT installed on Site B.
  All three WC-dependent add-ons (eventon-tickets, eventon-seats,
  eventon-ticket-variations-options) operate in fully degraded mode —
  settings pages are empty, metaboxes are absent, CPTs are inaccessible.
  Documentation of the full admin UX is derived from static analysis
  (03-features.md). Live observations confirm the WC dependency surface.
  Screenshots in screenshots/.
---

# eventon-tickets 2.4.7 — Admin UX

> **WooCommerce dependency:** eventon-tickets requires WooCommerce ≥ 6.0. Without it, the admin surface is almost entirely hidden. The feature descriptions below reflect what the admin UX looks like **when WooCommerce is installed** (derived from static analysis of the plugin source). The "WC-degraded" sections document what was observed live.

---

## WC-Degraded State (Live Observation)

### Admin Notices

Three persistent yellow banners appear across **all** EventON admin screens when WooCommerce is absent:

```
Eventon Tickets needs WooCommerce plugin to function properly. Please install WooCommerce
Eventon Seats need Woocommerce plugin to function properly. Please install woocommerce
Eventon Ticket Variations & Options need Woocommerce plugin to function properly. Please install woocommerce
```

> Screenshot: `admin-200-events-list-wc-notices.png`

These notices are permanent and cannot be dismissed.

### Settings Tab (`/wp-admin/admin.php?page=eventon&tab=evcal_tx`)

> Screenshot: `admin-100-settings-tickets.png`

The "Tickets" tab exists in the EventON Settings top navigation, but its **content area is entirely empty** — the settings framework renders no fields when WooCommerce is not active.

### Event Edit Screen

> Screenshots: `admin-300-*`, `admin-301-*`

The `evotx_mb1` metabox ("Event Tickets") is **not registered** without WooCommerce. It does not appear on the event edit screen. Only the 5 standard EventON metaboxes are visible:
- RSVP Event (`evors_mb1`)
- Main Event Details (`ajdeevcal_mb1`)
- Event Custom Meta Fields (`ajdeevcal_mb1_cmf`)
- Event Colors (`ajdeevcal_mb2`)
- Event Options (`ajdeevcal_mb3jd`)
- Event Extra Images (`ajdeevcal_mb_ei`)

### evo-tix CPT

`/wp-admin/edit.php?post_type=evo-tix` returns **"Invalid post type."** — the CPT is not registered without WooCommerce.

### Ticket Orders Screen

`/wp-admin/admin.php?page=evo-ticket-orders` returns **"Sorry, you are not allowed to access this page."** — the submenu is registered under WooCommerce which is absent.

---

## Full Admin UX (with WooCommerce)

### Navigation

```
EventON Settings → Tickets tab (evcal_tx)   ← add-on settings
WooCommerce menu
└── Ticket Orders                            ← evo-tix filtered orders view
Events CPT list → "Tickets" column          ← stock status per event
```

### 1. Tickets Settings Tab (`/wp-admin/admin.php?page=eventon&tab=evcal_tx`)

Sub-navigation (left rail): **General | Support**

#### General sub-section

| Setting Group | Fields |
|---|---|
| **Ticket Sales** | Guest-only sales toggle; thank-you page display; sold-out tag suppression; auto-restock on refund/cancel/fail; WC product page redirect; add-to-cart redirect destination |
| **Stop Selling** | Before event start / before event end (configurable minutes) |
| **WC Product Settings** | Auto-update product name on event rename; product name structure template tokens |
| **Email / Notifications** | From-address, from-name; email subject; send trigger (order-completed vs. manual); BCC address |
| **Inquiry Form** | Global default inquiry recipient email and subject |
| **Checkout Fields** | Configurable: collect ticket-holder names and emails at checkout (1 or more "attendee info" field groups) |

Key field names (from static analysis):
```
evotx_guestonly       — guest-only sales
evotx_thankyou        — thank-you page display
evotx_soldout_tag     — show/hide sold-out tag
evotx_auto_restock    — auto-restock on refund
evotx_wc_product_page_redirect
evotx_add_cart_redirect
evotx_stop_selling    — stop-sell trigger type
evotx_stop_selling_time — minutes before
evotx_email_from      — from email
evotx_email_fromN     — from name
evotx_email_subject   — "Event Ticket" default
evotx_email_trigger   — order-completed or manual
evotx_inq_email       — inquiry form default email
evotx_inq_subject     — inquiry form default subject
```

### 2. Event Edit — "Event Tickets" Metabox (`evotx_mb1`)

The largest and most complex admin surface. Appears on every `ajde_events` edit screen (when WC is active).

#### Toggle
- **Sell tickets for this event** — master on/off. Enabling reveals all fields below.

#### WC Product Association
| Field | Notes |
|---|---|
| Associated WC Product ID | Auto-creates a WC simple or variable product; displays product edit link |
| Product Type | Simple / Variable (for seat-mapped events) |

#### Ticket Pricing
| Field | Notes |
|---|---|
| Ticket Price (Required) | WC product price |
| Sale Price | WC sale price |
| Ticket SKU | WC SKU (Required) |
| Short Ticket Detail | Description shown on event card |
| Enable name-your-price | Toggle; reveals minimum floor price field |

#### Stock Management
| Field | Notes |
|---|---|
| Total Tickets in Stock | WC managed stock quantity |
| Manage capacity per repeat instance | For recurring events; one capacity input per occurrence |
| Show remaining tickets | Toggle; "Only for WooCommerce simple tickets" |
| Show remaining count at | Threshold (e.g., show "X left" when ≤ 10 remaining) |
| Place ticket on out-of-stock | Manual override toggle |
| Sold Individually | WC sold-individually flag |

#### UX / Display Options
| Field | Notes |
|---|---|
| Ticket Section Subtitle | Shown above ticket section on event card |
| Ticket Field Description | Rich-text description |
| Ticket Image | Shown in ticket section |
| Ticket Image Title / Caption | |
| Show guest list for event | Show attendee list on event card |
| Show next available repeating instance | When current occurrence is sold out |
| Already-purchased notice | For returning logged-in buyers |

#### Post-Purchase Information
- Rich-text field; content sent in ticket confirmation email
- Separate fields for pre-event / live / post-event information (for virtual events)

#### Inquiry Form (per-event)
| Field | Notes |
|---|---|
| Allow customers to submit inquiries | Toggle |
| Override inquiry email | Per-event recipient (overrides global) |
| Override inquiry subject | |

#### Virtual Events Gate (per-event)
| Field | Notes |
|---|---|
| User must purchase a ticket to view: | Three independent toggles for pre-event / live / post-event content |

#### Metabox Bottom: Stats & Actions
- Quick stats: Sold count, Revenue
- "Sales Insight" button → opens sales insight panel (revenue, attendee breakdown, CSV export)
- "Seat Map Editor" button (if eventon-seats active) → opens seat map lightbox

### 3. WooCommerce Ticket Orders (`/wp-admin/admin.php?page=evo-ticket-orders`)

Filtered view of WC orders containing `evo-tix` line items. Provides ticket-specific order management without navigating general WC orders.

Columns: Order # | Customer | Event | Ticket count | Amount | Status | Date

### 4. evo-tix CPT List (`/wp-admin/edit.php?post_type=evo-tix`)

One `evo-tix` post per ticket sold. Custom columns:

| Column | Notes |
|---|---|
| Post title | "TICKET {date} — {event name}" auto-generated |
| Event | Linked event |
| Order ID | Linked WC order |
| Ticket holder | Name from checkout field |
| Email | Email from checkout field |
| Check-in | Checked / not checked status |
| Ticket type | Simple / Seat-assigned |

### 5. evo-tix Single Record Edit

Three metaboxes:

| Metabox | Content |
|---|---|
| `evo_mb1` — Event Ticket Data | Full attendee/ticket data view: name, email, status (editable); event title, order ID, event time |
| `evotx_mb3` — Ticket Data | Compact side: raw postmeta (qty, cost, type, repeat interval) |
| `evotx_mb2` — Event Ticket Confirmation | Button to manually re-send ticket confirmation email |

### 6. WC Product Edit — "Associated Event Data" Metabox

On WC product pages for products created by eventon-tickets:
- Read-only back-link to parent EventON event
- Ticket status summary (in-stock / sold-out / enabled)

### 7. WC Admin Order Screen — Ticket Info Panels

Two injections into the WC order detail view:
- Ticket-holder names and emails collected at checkout
- Per-ticket status summary with check-in state

### 8. Events List Table — Tickets Column

The `ajde_events` list table gains a "Tickets" column showing:
- "In Stock" / "Out of Stock" / "—" (not enabled) per event

### 9. Sales Insight Panel

Accessible from the event edit metabox. Built by `admin/class-admin_sales_insight.php`:

| Data | Notes |
|---|---|
| Revenue | Total sales for this event |
| Sold count | Tickets sold |
| Attendee breakdown | Per-ticket-holder table |
| CSV export | Configurable column headers |

---

## Admin UX Design Patterns

**Everything flows through WooCommerce:**
- Ticket = WC product
- Purchase = WC order
- Attendee = WC order line item + custom `evo-tix` post

**Settings architecture:** EventON framework (single options page with tab/section navigation). The Tickets settings are a subset of the EventON settings page, not a standalone plugin page.

**Per-event configuration priority:** All global settings in the settings tab can be overridden per-event in the event metabox. The precedence is always per-event > global.
