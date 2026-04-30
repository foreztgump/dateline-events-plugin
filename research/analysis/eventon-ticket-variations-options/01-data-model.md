---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-ticket-variations-options — Data Model

## Custom Post Types

None found. The plugin stores all data as postmeta on existing `ajde_events` posts (EventON's event CPT) and attaches sold-ticket data to the `evo-tix` CPT managed by evotx.

## Custom Taxonomies

None found.

## Custom Tables (dbDelta)

None found. No `dbDelta` or direct `$wpdb->query` calls detected. All persistence is through the WordPress postmeta API.

---

## Post Meta Keys

All keys are stored on the **event post** (`ajde_events` CPT), accessed through EventON's `EVO_Event::get_prop()` / `set_prop()` / `get_meta()` wrapper which ultimately calls `get_post_meta` / `update_post_meta`.

### Event-level control flags

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_evovo_activate` | `ajde_events` | Toggle (yes/no) — whether variations & options are enabled for this event |
| `_evovo_var_sep_sold` | `ajde_events` | Toggle — sell variations as separate WooCommerce cart items (single variation type only) |
| `_evovo_po_sep_sold` | `ajde_events` | Toggle — sell price options as separate cart items instead of additions |
| `_evovo_po_uncor_qty` | `ajde_events` | Toggle — price option quantities are independent of ticket quantity |
| `_evovo_v_hide_sold` | `ajde_events` | Toggle — hide sold-out variations on frontend |
| `_evovo_op_hide_sold` | `ajde_events` | Toggle — hide sold-out price options on frontend |

### Variation data arrays (the core storage keys)

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_evovo_variation_type` | `ajde_events` | Serialized PHP array: all variation type definitions (the "axes" of variation, e.g., "Shirt Size") |
| `_evovo_variation` | `ajde_events` | Serialized PHP array: all concrete ticket variation rows (each row = one combination of type-option values with its own price and stock) |
| `_evovo_option` | `ajde_events` | Serialized PHP array: all price option add-ons (each row = an optional add-on with its own price and optional stock) |

### Per-ticket (attendee) order item meta

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_evovo_data` | `evo-tix` (ticket CPT) | Serialized PHP array: the snapshot of which variation and which price options were selected at purchase time; used for confirmation emails, attendee list, and CSV export |

---

## Variant Data Structure (Prose)

The plugin uses three separate postmeta keys on the event post to represent the full variation/option data model. Each key holds a PHP-serialized associative array indexed by a random integer ID (generated at creation time in the range 100 001–900 001).

### `_evovo_variation_type`

Each element defines a named "axis" of variation. The array element contains: `name` (a human-readable label, e.g., "Section"), and `options` (a comma-separated string of the allowed values for that axis, e.g., "Floor,Balcony,VIP"). The comma-separated string is processed at read time into an array by splitting on commas after normalising whitespace. Dashes in stored values represent spaces (spaces are replaced with dashes on save, reversed on display).

### `_evovo_variation`

Each element defines one concrete, purchasable ticket tier — a single row on the price matrix. An element contains:

- `parent_id` — the ID of the parent entity (event post ID, seat section ID, or booking block ID)
- `parent_type` — one of `event`, `seat`, or `booking`
- `variations` — a nested associative array, keyed by `variation_type` ID, whose value is the selected option value (or the special string `"All"` which matches any option in that axis)
- `regular_price` — the flat price for this tier as a numeric string
- `sales_price` — optional discounted price
- `stock` — numeric quantity available (blank/null = unlimited)
- `stock_status` — `"instock"` or `"outofstock"`
- `loggedin` — access restriction: `"nonmember"` (everyone) or `"member"` (logged-in users only)

**Key design pattern:** There is no combinatorial lookup table. Instead, each `_evovo_variation` element pre-encodes a specific combination of type-option values in its `variations` sub-array. The frontend renders dropdowns for each variation type and resolves which variation row matches the user's current selection by comparing the selected value against each row's `variations` map. The `"All"` wildcard allows a single row to cover all values of an axis.

### `_evovo_option`

Each element defines an optional add-on that can be stacked on top of the selected variation. An element contains:

- `parent_id` / `parent_type` — same scoping as variations
- `name` — display label
- `regular_price` — the add-on price as a numeric string
- `description` — optional explanatory text
- `stock` / `stock_status` — same semantics as variations
- `sold_style` — `"one"` (toggle add/remove) or `"mult"` (quantity adjuster)

### `_evovo_data` (ticket snapshot)

Stored on the `evo-tix` CPT at purchase time. Contains:

- `var_id` — the ID of the selected `_evovo_variation` element
- `vart` — associative array of `{variation_type_id => selected_value}` for display purposes
- `options` — associative array of `{option_id => quantity_selected}`
- `po` — full price option detail array (including price and quantity snapshots for accounting)
- `def_price` — the base price at time of purchase

---

## WordPress Options

| Option key | Default | Purpose |
|---|---|---|
| `evcal_options_evcal_2` | (set by EventON) | Read-only by this plugin; used by `evovo_frontend` to retrieve language strings via EventON's language helper |

No options are written by this plugin.

---

## Variant Data Structure Summary

The plugin implements **flat-list pricing with inline combination matching**. Rather than a relational cross-product table, the admin pre-creates each desired (variation-combination → price) row explicitly. If an event has two variation types ("Section": Floor/Balcony and "Day": Sat/Sun), the admin manually creates up to four variation rows:

- Floor + Sat → $50
- Floor + Sun → $45
- Balcony + Sat → $70
- Balcony + Sun → $65

This approach is simple to implement but **does not scale** automatically to many axes — each new combination must be explicitly authored. The `"All"` wildcard partially addresses this: a single variation row with `variations["Section"] = "All"` matches regardless of which section is chosen, allowing a per-day price that applies uniformly across sections.

Price options are always **additive**: the final cart price is `variation.regular_price + sum(option.regular_price × option.qty)`. There is no multiplicative or percentage-based option pricing. The WooCommerce product's own base price is overridden at add-to-cart time by injecting `evovo_price` into the cart item data.
