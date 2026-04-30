---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough on Site B. WooCommerce not installed — eventon-seats
  requires both EventON core and eventon-tickets (which requires WC).
  Admin UX is completely degraded without WC: no seat-map metabox, no editor
  lightbox. Documentation derived from static analysis + source code review.
  Screenshots show WC-absent state. Screenshots in screenshots/.
---

# eventon-seats 1.2.6 — Admin UX

> **WooCommerce + evonton-tickets dependency:** eventon-seats requires evonton-tickets, which requires WooCommerce ≥ 6.0. Without WC, the seat editor and all seating management surfaces are absent. The feature descriptions below are based on static analysis.

---

## WC-Degraded State (Live Observation)

### Admin Notices

> Screenshot: `admin-100-events-list.png`

Same three WC-missing banners as all WC-dependent add-ons. No seat-specific additional notice.

### Event Edit Screen

> Screenshots: `admin-200-*` through `admin-203-*`

The `evotx_mb1` (Event Tickets) metabox is absent, so the seat map editor trigger button (which lives inside the tickets metabox) does not appear. The event edit screen shows only the 5 standard EventON metaboxes.

The "Seat Map Editor" button is **not found** in the degraded state.

> Screenshot: `admin-300-seat-map-editor-notfound.png`

---

## Full Admin UX (with WooCommerce + eventon-tickets)

### Where Seating Surfaces in Admin

1. **Inside the Event Tickets metabox** — seat configuration fields and the "Seat Map Editor" button appear as an extension of the evotx metabox, not as a standalone metabox.
2. **Inside the Seat Map Editor lightbox** — full AJAX-loaded drag-and-drop canvas.
3. **Seat settings section** (within the tickets metabox's seat group).

---

## 1. Seat Configuration Fields (inside evotx metabox)

These fields appear within the `evotx_mb1` metabox when eventon-seats is active:

| Field | Key | Notes |
|---|---|---|
| Enable Event Seating | `_enable_seat_chart` | yes/no toggle |
| Enable one-click adding seats direct to cart | `_allow_direct_add` | Skips preview popup |

**Constraint:** Seat maps are only available for **simple-product events with no repeat instances**. The toggle is suppressed for recurring events.

When seating is enabled, a "Seat Map Editor" button appears below these fields, opening the editor lightbox via `evost_editor_content` AJAX.

---

## 2. Seat Map Editor Lightbox

The most complex admin UI in the P1 set. Loaded via AJAX (`evost_editor_content`), renders in an `evo_lightbox` overlay.

### Editor Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  SEAT MAP EDITOR                                                │
│                                                                 │
│  [Configure Seat Map]  [Upload JSON]  [Clear Map]  [Close]      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ CANVAS (drag-and-drop sections)                        │    │
│  │                                                        │    │
│  │  [Section A]     [Section B]     [Section C]           │    │
│  │  (12 seats)      (unassigned)    (VIP booth)           │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [+ New Section]  [View Attendees]  [Make All Seats Available]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Section Types

| Type | Code | Description |
|---|---|---|
| Assigned Seating | `def` | Named rows and numbered seats; each seat tracked individually |
| Unassigned Area | `una` | Capacity pool; customers pick a quantity, not a specific seat |
| Booth | `boo` | Group seating; sold as a unit or by quantity |
| Area-of-Interest | `aoi` | Decorative element — not purchasable; labels stage, exits, etc. |

### Section Create/Edit Form (lightbox-in-lightbox)

Opened by "New Section" or editing an existing section:

| Field | Notes |
|---|---|
| Section Name | e.g., "Balcony", "Floor", "VIP" |
| Section Letter Index | Single letter displayed on canvas |
| Section Type | `def` / `una` / `boo` / `aoi` |
| Background Color | Hex color picker |
| Font Color | |
| Border Style | |
| Alignment | CSS alignment of section on canvas |
| Seat Shape | Circle / Square / etc. |
| Icon | Optional icon for aoi elements |
| Capacity | For `una` and `boo` types |
| Default Price | Price override for this section (overrides WC product base price) |

### Row Create/Edit Form (within assigned sections)

| Field | Notes |
|---|---|
| Row Letter | A, B, C, ... |
| Number of Seats | Seats auto-numbered from 1 |
| Row-Level Price Override | Optional; overrides section price for this row |

### Seat Create/Edit Form (within rows)

| Field | Notes |
|---|---|
| Seat Number Label | Override auto-number |
| Price | Overrides row/section price for this seat |
| Status | Available / Unavailable |
| Handicap Accessible | Flag |

### Bulk Actions

| Action | AJAX endpoint | Notes |
|---|---|---|
| Save section positions | `evost_editor_save_changes` | After drag-drop rearrange |
| Duplicate section | Inline | Copies all rows/seats; offsets 100px; resets all to `av` |
| Upload JSON | File input | Replaces entire seat map; format matches export |
| Clear entire map | `evost_clear_seats` | Irreversible without JSON backup |
| Make all seats available | Bulk restock | Useful after test purchases |
| View attendees | Panel overlay | Attendee list alongside seat canvas |

**WC product stock sync:** After every map save, `evost` updates the WC product's managed-stock quantity to match the count of currently available seats.

---

## 3. Seat Map Configuration Panel

Opened via "Configure Seat Map" button within the editor:

| Setting | Notes |
|---|---|
| Background image | Upload image for the canvas background (e.g., venue floor plan) |
| Map area size | CSS class selector: small / medium / large / full-width |
| Seat size | CSS class: small / medium / large |
| Lightbox mode for frontend picker | Frontend seat selection in lightbox vs. inline |
| Cart session timeout duration | Minutes; default 10; seats held in cart expire after this |
| Hide seat expiration time in cart pages | Suppress the countdown timer display |
| Enable copying seat status to duplicate event | Carry over sold seats when duplicating |

---

## 4. Attendees Panel (inside editor)

Accessible from the editor without leaving the lightbox:
```
Attendees
─────────────────────────
Row A, Seat 1  — John Smith      ✓ Checked In
Row A, Seat 2  — Jane Doe
Row B, Seat 5  — Bob Johnson     ✓ Checked In
...
```

Shows attendee name and check-in status per seat.

---

## 5. Cart Session Timeout Indicator

On WC Cart and Checkout pages (not the seat editor), eventon-seats injects a notice:

```
Your seats will expire in [countdown] minutes of inactivity in cart.
Seats added to cart will expire in 10 minutes of inactivity in cart.
```

This notice is managed by `EVOST_Expirations` and appears via `woocommerce_before_cart` / `woocommerce_before_checkout_form` hooks.

---

## Admin UX Design Patterns

**All seat management is event-scoped.** There is no global seat-map library — each event has its own seat map, stored as serialized postmeta (`_evost_sections`).

**JSON import/export** enables map templates: design a venue layout once, export JSON, import into other events.

**Section duplication** is the primary way to create symmetric venues (e.g., left section and right section of a theater).

**The editor is a separate application.** It loads its own HTML via AJAX into an `evo_lightbox` container. All communication between editor and WordPress is via AJAX endpoints (`evost_*`). The main page post form is never involved — saving seats is independent of saving the event post.
