---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON Seats — Data Model

## Custom Post Types

No `register_post_type` calls found in this plugin. The plugin **reuses** the `ajde_events` post type (EventON core) and the `evo-tix` ticket CPT (eventon-tickets). It stores all seat data as postmeta on these existing CPTs.

## Custom Taxonomies

None registered. No `register_taxonomy` calls found.

## Custom Database Tables

No `dbDelta` calls found. The plugin uses **no custom tables**. Seat-hold state is stored in the WordPress options table, not a dedicated table (see below).

## Post Meta Keys

All seat postmeta is stored on the `ajde_events` post type (EventON events). The `evo-tix` ticket CPT receives seat identification fields at order time.

### On `ajde_events` posts

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_evost_sections` | `ajde_events` | Primary seat map: serialised PHP array containing all sections, rows, and individual seats. This is the authoritative source for seat topology and per-seat status. The key may have a suffix (e.g. `_evost_sections_<custom_id>`) when custom identifiers are passed, enabling multi-occurrence seat maps on the same event post. |
| `_evost_settings` | `ajde_events` | Serialised array of seat-map display settings: background image attachment ID, map area class, seat size class, lightbox-mode flag, and other editor preferences. |
| `_enable_seat_chart` | `ajde_events` | Yes/no flag: whether seating is active for this event. Checked before rendering seat picker. |
| `_allow_direct_add` | `ajde_events` | Yes/no flag: allow one-click add-to-cart (bypasses seat preview lightbox). Only for assigned seats. |

### Seat Map Array Structure (inside `_evost_sections`)

The value is a nested associative array. Top-level keys are random integer section IDs. Each section entry contains:

- Section metadata: `section_name`, `section_index` (letter label), `type` (`def` = assigned rows/seats, `una` = unassigned capacity, `boo` = booth, `aoi` = area-of-interest decorative), `top`, `left` (canvas position in px), `bgc` (background color hex), `fc` (font color hex), display flags.
- For assigned sections (`type = def`): a `rows` sub-array keyed by random integer row IDs. Each row contains `row_index` (letter), `row_price`, and individual seat entries keyed by random integer seat IDs. Each seat entry contains: `status` (`av`, `uav`, `tuav`), `number` (display label), `price`, `handicap` flag, and optionally `id`.
- For non-assigned sections (`type = una` or `boo`): `capacity` (integer), `sold` (integer, incremented on temp-hold), `def_price`.

Seat slugs are composed as `{section_id}-{row_id}-{seat_id}` for assigned seats, or the bare `{section_id}` for unassigned/booth sections.

### On `evo-tix` ticket posts (written at checkout)

| Postmeta key | Purpose |
|---|---|
| `Seat-Number` | Human-readable seat number (e.g. `A1`, `B3`); displayed in admin order view and confirmation email. Also stored under lowercase key for backward compatibility. |
| `_evost_seat_slug` | Machine-readable seat identifier; used to look up seat data for restocking on cancellation. |
| `_seat_type` | Seat type string (`seat`, `unaseat`, `booseat`); stored as order item meta. |
| `_seat_number` | Copy of `Seat-Number` for faster retrieval (saved as convenience alias). |

## WordPress Options

All seat-hold state is stored in a single site-wide option entry. There are no per-event or per-section option keys.

| Option key | Default | Purpose |
|---|---|---|
| `_evost_expiration` | `array()` (set via `update_option`) | Seat-hold registry. Nested structure: `[event_id][seat_slug][cart_item_key] = ['time' => unix_timestamp, 'qty' => integer]`. Tracks all in-cart seat holds across all events. Read and written on every cart operation (add, remove, update, checkout). Expired entries are pruned during expiration check sweeps. |
| `evcal_options_evcal_tx` | — | EventON Tickets options (owned by evotx); read by this plugin for `evost_session_time` (hold duration in minutes, default 10) and `_evost_hide_cart_exp`. |
| `evcal_options_evcal_2` | — | EventON core options; read for language customisations. |

### `_evost_expiration` Structure (paraphrased)

The option stores a three-level dictionary: the first level is keyed by WordPress event post ID; the second by seat slug; the third by WooCommerce cart item key. Each leaf value is an array with two fields: the Unix timestamp at which the hold expires, and the quantity held. For unassigned sections the timestamp may also be stored as a bare scalar (legacy format from pre-1.2).
