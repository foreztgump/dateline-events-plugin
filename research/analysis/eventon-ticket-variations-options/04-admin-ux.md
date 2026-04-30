---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 2
doc: 04-admin-ux
note: >
  Live walkthrough on Site B. WooCommerce not installed. Admin UI is fully
  degraded — variations toggle and settings are absent. Documentation derived
  from static analysis of plugin source. Screenshots show WC-absent state.
  Screenshots in screenshots/.
---

# eventon-ticket-variations-options 1.1.4 — Admin UX

> **WooCommerce + evonton-tickets dependency:** This add-on requires evonton-tickets (which requires WooCommerce). Without WC, no variations UI appears — not even the enabling toggle. The feature descriptions below are derived from static analysis.

---

## WC-Degraded State (Live Observation)

> Screenshots: `admin-100-events-list.png`, `admin-200-*`, `admin-300-variations-wc-degraded.png`

### Admin Notices

Same three WC-missing banners as all WC-dependent add-ons.

### Event Edit Screen

The variations feature (`_evovo_activate` toggle) is added **inside the evotx metabox** (`evotx_mb1`), which is not registered without WooCommerce. Therefore:
- No variations toggle appears
- No "Variations & Options Settings" link appears
- The variations lightbox is unreachable

The event edit screen shows only the 5 standard EventON metaboxes.

---

## Full Admin UX (with WooCommerce + evonton-tickets)

### Entry Point

All variations configuration is accessed from the event edit screen, within the `evotx_mb1` (Event Tickets) metabox. There is no standalone menu item or settings page for evovo.

---

## 1. Enable Variations Toggle (inside evotx metabox)

| Field | Key | Notes |
|---|---|---|
| Enable ticket variations & options | `_evovo_activate` | yes/no toggle; reveals the Settings link when on |

When enabled, a "Variations & Options Settings" link appears below the toggle. Clicking it triggers `evovo_get_settings` AJAX, loading the VO configuration panel in a lightbox.

---

## 2. Variations Settings Lightbox

Opened via AJAX (`evovo_get_settings`). Returns a full settings panel:

### Global Toggles

| Toggle | Key | Effect |
|---|---|---|
| Sell Variations as separate tickets | `_evovo_sell_var_sep` | Only when single variation type; each value = independent WC cart item |
| Sell Price Options as separate tickets | `_evovo_sell_op_sep` | Disables variation display; each option = independent cart add |
| Hide sold-out variations | `_evovo_op_hide_sold` | Removes out-of-stock variation rows from frontend |
| Hide sold-out price options | `_evovo_op_hide_op_sold` | Removes out-of-stock option items from frontend |

### Variation Types

A list of all configured variation types with edit / delete controls and an **"+ New Variation Type"** button.

**Variation Type form** (opened by "New Variation Type"):

| Field | Notes |
|---|---|
| Name | Axis label, e.g., "Section", "Age Group", "Day" |
| Options | Comma-separated values, e.g., "Floor, Balcony, VIP" |

Saved via `evovo_save_vo_form`. The type and its option values are stored in event postmeta.

### Variation Rows

A matrix of ticket pricing rows. Each row defines a price for a specific combination of variation type values.

**Variation form** (opened by "New Variation"):

| Field | Notes |
|---|---|
| [Type dropdown per variation type] | Select a value from each type's option list, or "All" |
| Ticket Variation Price | Price for this combination |
| Stock Quantity | Leave blank = unlimited |
| Stock Status | In Stock / Out of Stock |
| Who can purchase | Everyone / Only logged-in members |

**Matrix logic example:**
- Variation types: Section (Floor, Balcony) × Day (Friday, Saturday)
- Creates 4 variation rows: Floor/Friday, Floor/Saturday, Balcony/Friday, Balcony/Saturday
- Each row has its own price and stock

### Price Options

A list of additive price options shown below the variation selector on the frontend.

**Price Option form** (opened by "New Price Option"):

| Field | Notes |
|---|---|
| Name | e.g., "Parking", "Meal Package", "T-Shirt" |
| Price | Flat amount added to base ticket price |
| Description | Short description shown on frontend |
| Stock | Quantity; blank = unlimited |
| Stock Status | In Stock / Out of Stock |
| Sold Style | **Individually** — Add/Remove toggle; **Multiples** — qty adjuster |

### Reorder

Variation types, variation rows, and price options can all be drag-drop reordered. Reorder is saved via `evovo_save_neworder` AJAX on drop.

---

## 3. AJAX Endpoints (Admin)

| Action | Description |
|---|---|
| `evovo_get_settings` | Load full variations settings panel HTML |
| `evovo_save_settings` | Save the four global toggles |
| `evovo_get_vo_form` | Load create/edit form for a variation type, variation, or option |
| `evovo_save_vo_form` | Save a variation type / variation row / price option |
| `evovo_delete_item` | Delete a variation / option with postmeta cleanup |
| `evovo_save_neworder` | Persist drag-drop reorder |

---

## 4. Seat Map Integration (admin side)

When evonton-seats is active, the VO editor is also embedded in the seat section edit form (inside the seat map editor lightbox). Variation rows scoped to a seat section omit the stock/stock_status fields (stock derived from seat capacity).

Seat section duplication clones all variation rows to the new section with new IDs.

---

## 5. Booking Integration (admin side)

When evonton-booking is active, the VO editor is embedded in the booking block edit form. Auto-generated booking slots receive cloned VO items from a generator template.

---

## Admin UX Design Patterns

**Everything lives in lightboxes.** There are no standalone admin pages — variations configuration is nested 2–3 levels of lightbox-within-lightbox-within-metabox. The UX pattern prioritizes screen real estate but at the cost of discoverability.

**AJAX-first.** Every interaction (create, edit, delete, reorder, save settings) is an AJAX call. There are no full-page refreshes in the variations workflow.

**No dedicated CPT.** Variations and options are stored as serialized arrays in event postmeta (`_evost_sections` prefix for seat-scoped, `_evovo_variations` for standalone). There is no list screen, no WP query for variations, no WP admin edit screen per variation row.

**Constraint: single variation type for separate-ticket mode.** The "Sell as separate tickets" toggle is explicitly restricted to the case where there is exactly one variation type. Multiple types can coexist but only in dropdown-select mode.
