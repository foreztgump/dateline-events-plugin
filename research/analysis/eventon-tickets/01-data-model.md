---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON — Event Tickets: Data Model

## Custom Post Types

| CPT Slug | Label (singular / plural) | Key Args |
|----------|---------------------------|----------|
| `evo-tix` | Event Ticket / Event Tickets | `public: false`, `show_ui: true`, `capability_type: eventon`, `create_posts: do_not_allow` (no UI creation), `show_in_menu: ajde_events`, `supports: title + custom-fields`, `has_archive: true` |

One `evo-tix` post is created per ticket per quantity unit when a WC order is processed. The post title is auto-generated ("TICKET {date}"); all meaningful data lives in post meta.

## Custom Taxonomies

No `register_taxonomy` calls found. The plugin uses WooCommerce's native `product_cat` taxonomy and auto-creates a "Ticket" product category term for WC products it generates.

## Custom Tables

No `dbDelta` calls found. All storage uses WordPress post meta and WooCommerce order meta. No custom database tables are created.

## Post Meta Keys

### Keys on `evo-tix` posts (per-ticket records)

These are written by `evotx_tix::create_tickets_for_order()` and related ticket-management methods.

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_eventid` | `evo-tix` | ID of the parent EventON event post |
| `_orderid` | `evo-tix` | WooCommerce order ID this ticket belongs to |
| `_order_item_id` | `evo-tix` | WC order line-item ID, for cross-referencing quantity rows |
| `wcid` | `evo-tix` | WooCommerce product ID for the ticket product |
| `wc_var_id` | `evo-tix` | WC variation ID, if ticket is a variable product variation |
| `repeat_interval` | `evo-tix` | Index of the repeating event occurrence this ticket is for |
| `name` | `evo-tix` | Ticket-holder's display name (from checkout or ActionUser form) |
| `email` | `evo-tix` | Ticket-holder's email address |
| `qty` | `evo-tix` | Quantity of tickets in this evo-tix record |
| `cost` | `evo-tix` | Line-item subtotal paid for this ticket |
| `type` | `evo-tix` | Ticket type flag: `Normal` or `Variation` |
| `status` | `evo-tix` | Current check-in status: `check-in` (unchecked) or `checked` |
| `ticket_ids` | `evo-tix` | Associative array mapping ticket-number string to its status (legacy multi-ticket support) |
| `_ticket_number` | `evo-tix` | Canonical ticket number string in format `{evotix_id}-{order_id}-{product_id}T{index}` |
| `_ticket_number_index` | `evo-tix` | Zero-based position within the order line item (distinguishes multiple quantities) |
| `_ticket_number_instance` | `evo-tix` | Event-instance counter for the same event appearing multiple times in one cart |
| `_ticket_holder_data` | `evo-tix` | Serialised array of ticket-holder name/email snapshot at time of purchase |
| `_customerid` | `evo-tix` | WordPress user ID of the purchaser (0 for guest orders) |
| `signin` | `evo-tix` | Virtual-events sign-in flag; value `y` means the attendee has signed in to the live event |

### Keys on `ajde_events` (EventON event) posts

These control whether/how tickets are offered for a specific event.

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `evotx_tix` | `ajde_events` | Feature flag: `yes` enables ticket selling for this event |
| `tx_woocommerce_product_id` | `ajde_events` | ID of the linked WC ticket product |
| `_manage_repeat_cap` | `ajde_events` | `yes` to track capacity separately per repeating-event occurrence |
| `ri_capacity` | `ajde_events` | Serialised indexed array — capacity per occurrence index for repeating events |
| `_show_remain_tix` | `ajde_events` | `yes` to display remaining ticket count on the event card |
| `remaining_count` | `ajde_events` | Stock threshold below which the remaining-count label appears |
| `_name_yprice` | `ajde_events` | `yes` to enable "name your price" mode (customer sets their own price) |
| `_evotx_nyp_min` | `ajde_events` | Minimum price floor for "name your price" mode |
| `_xmin_stopsell` | `ajde_events` | Minutes before event start (or end) at which ticket sales are automatically cut off |
| `_already_purchased` | `ajde_events` | `yes` to show a "you already purchased" notice to logged-in repeat buyers |
| `_sold_individually` | `ajde_events` | Mirrors WC product `_sold_individually`; limits one ticket per customer |
| `_tx_show_guest_list` | `ajde_events` | `yes` to render the public guest list inside the event card |
| `_tx_text` | `ajde_events` | Short subtitle text rendered inside the ticket section of the event card |
| `_tx_subtiltle_text`* | `ajde_events` | Rich-text field description shown above the add-to-cart area |
| `_tx_add_info` | `ajde_events` | Rich-text additional info sent in the confirmation email after purchase |
| `_tix_image_id` | `ajde_events` | WordPress attachment ID for the ticket product image |
| `_tx_img_text` | `ajde_events` | Caption displayed below the ticket image |
| `_allow_inquire` | `ajde_events` | `yes` to show a pre-purchase inquiry form on the event card |
| `_tx_inq_email` | `ajde_events` | Override email address that receives inquiry form submissions for this event |
| `_tx_inq_subject` | `ajde_events` | Override subject line for inquiry form emails |
| `_evotx_show_next_avai_event` | `ajde_events` | `yes` to auto-advance the event card to the next available repeat occurrence with stock |
| `_vir_after_tix` | `ajde_events` | `yes` to gate virtual event content behind ticket purchase (virtual events integration) |
| `_vir_hide_tcount` | `ajde_events` | `yes` to suppress the attendee/checked-in count from the live-now virtual badge |
| `_vir_preevent_tix` | `ajde_events` | `yes` to gate pre-event content behind ticket purchase |
| `_vir_afterevent_tix` | `ajde_events` | `yes` to gate post-event content behind ticket purchase |

### Keys on WC `product` posts

These are stored on the WooCommerce product record created by the plugin.

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `_eventid` | `product` | Back-reference to the EventON event ID (legacy; stored via `product->add_meta_data`) |
| `event_id` | `product` | Duplicate back-reference to EventON event ID (newer path, same purpose) |
| `_tx_text` | `product` | Ticket section subtitle text (mirrored on WC product for display) |
| `_tx_subtiltle_text`* | `product` | Ticket description (mirrored on WC product) |

\* Typo preserved from source plugin; the key is `_tx_subtiltle_text`, not `_tx_subtitle_text`.

## WordPress Options

| Option key | Default / Source | Purpose |
|---|---|---|
| `evcal_options_evcal_tx` | Written by EventON core's settings framework | Main plugin settings bag (email sender name/address, subject, display flags like `evotx_hide_thankyou_page_ticket`, `evotx_tix_email`, `evotx_hideadditional_guest_names`, `evotx_stop_selling_tickets`, `evotx_wc_prod_redirect`, `evotx_wc_prodname_update`, `evotx_wc_prodname_structure`) |
| `woocommerce_manage_stock` | `yes` | Forced to `yes` via admin-ajax when the admin activates stock management for tickets |
