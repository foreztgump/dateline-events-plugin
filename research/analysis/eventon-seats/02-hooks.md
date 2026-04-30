---
plugin: eventon-seats
version: 1.2.6
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON Seats — Hooks

## Registered Hooks (consumed by this plugin)

### Actions consumed

| Hook name | Source file:line | Priority | Purpose |
|---|---|---|---|
| `plugins_loaded` | `eventon-seats.php:41` | 12 | Dependency check; conditionally continue boot |
| `admin_notices` | `eventon-seats.php:47,55,57,62,74` | default | Display admin warnings for missing dependencies |
| `init` | `eventon-seats.php:69` | 0 | Main plugin init: includes, object creation |
| `admin_init` | `admin/class-admin.php:17` | default | Admin meta box, settings, filter wiring |
| `admin_print_styles-post.php` / `admin_print_styles-post-new.php` | `admin/class-admin.php:38` | default | Enqueue admin seat-map editor assets on event edit pages |
| `evotx_event_metabox_end` | `admin/class-post_meta.php:10` | 10 | Inject seat-chart enable toggle into the tickets metabox |
| `evo_register_other_styles_scripts` | `class-frontend.php:20` | 12 | Register (not enqueue) frontend seat assets |
| `eventon_enqueue_scripts` | `class-frontend.php:21` | 12 | Enqueue frontend seat assets when EventON renders |
| `woocommerce_before_cart` | `class-integration-tickets.php:18` | 10 | Inject seat expiry countdown timer HTML above WC cart |
| `woocommerce_before_checkout_form` | `class-integration-tickets.php:19` | 10 | Same countdown timer on checkout page |
| `eventontx_tix_post_table` | `class-integration-tickets.php:21` | 10 | Add seat number rows to admin ticket detail table |
| `evotix_confirmation_email_additional_data` | `class-integration-tickets.php:23` | 10 | Append seat info block to ticket confirmation email |
| `evotx_after_ticket_added_to_cart` | `class-integration-tickets.php:36` | 10 | Place seat on temporary hold after successful add-to-cart |
| `evotx_cart_tickets_updated` | `class-integration-tickets.php:37` | 10 | Sync unassigned seat qty when cart quantity changes |
| `evotix_cart_item_validation` | `class-integration-tickets.php:42` | 10 | Validate seat availability; expire and remove if hold elapsed |
| `evotx_cart_ticket_removed` | `class-integration-tickets.php:45` | 1 | Restock seat when item removed from cart |
| `evotx_checkout_create_order_line_item` | `class-integration-tickets.php:49` | 1 | Write seat slug, number, and type to WC order line-item meta |
| `evotx_after_duplicate_ticket_event` | `admin/class-admin.php:56` | 10 | After event duplication, reset all seat statuses to available (unless admin option to preserve status is on) |
| `eventon_duplicate_event_exclude_meta` | `admin/class-admin.php:57` | 10 | Optionally exclude seat-map fields from duplicated event |
| `evo_temp_evost_seat_map` | `class-template_views.php:10` | 10 | Render Handlebars seat-map template HTML |
| `evo_temp_evost_cart_seats` | `class-template_views.php:11` | 10 | Render Handlebars cart-seats stub template HTML |
| `evo_temp_evost_tooltips` | `class-template_views.php:12` | 10 | Render Handlebars tooltip template HTML |

### Filters consumed

| Hook name | Source file:line | Priority | Purpose |
|---|---|---|---|
| `plugin_action_links_{slug}` | `eventon-seats.php:72` | default | Add Settings link to plugins list |
| `evotx_save_eventedit_page` | `admin/class-post_meta.php:11` | 10 | Register `_enable_seat_chart` and `_allow_direct_add` for saving |
| `evotix_settings_page_content` | `admin/class-admin.php:43` | 10 | Add Seat Settings tab to evotx settings page |
| `eventon_settings_lang_tab_content` | `admin/class-admin.php:46` | 10 | Add seat-related language strings to EventON language settings |
| `woocommerce_hidden_order_itemmeta` | `admin/class-admin.php:50` | 10 | Hide `_seat_id`, `_seat_num` from WC admin order view |
| `evotx_admin_events_column_title` | `admin/class-admin.php:53` | 10 | Append "With Seats" suffix in admin events list column |
| `evo_init_templates` | `class-template_views.php:14` | 10 | Inject all three Handlebars templates into EventON's template bag |
| `evo_ajax_script_data` | `class-frontend.php:22` | 10 | Add hover-tooltip text string to EventON's JS data object |
| `evotx_add_to_cart_evotxdata` | `class-integration-tickets.php:15` | 10 | Append `showmap` and `directadd` flags to cart AJAX data |
| `evotx_single_product_temp` | `class-integration-tickets.php:17` | 10 | Replace default ticket template with seat-map section when seats are enabled |
| `evotx_add_ticket_to_cart_before` | `class-integration-tickets.php:28` | 10 | Block add-to-cart if seat is no longer available |
| `evotx_add_cart_item_meta` | `class-integration-tickets.php:29` | 10 | Attach seat slug, seat number, seat type, and seat price to cart item |
| `evotx_ticket_added_cart_ajax_data` | `class-integration-tickets.php:30` | 10 | Return updated seat map JSON in add-to-cart AJAX response |
| `evotx_cart_session_item_values` | `class-integration-tickets.php:31` | 10 | Persist `evost_data` and `_evost_seat_price` in WC session |
| `evotx_ticket_item_price_for_cart` | `class-integration-tickets.php:32` | 10 | Override ticket price with seat-specific price |
| `evotx_cart_item_name` | `class-integration-tickets.php:40` | 1 | Append seat info HTML to cart item display name |
| `evotx_cart_item_quantity` | `class-integration-tickets.php:41` | 1 | Replace WC quantity input with seat-max-aware version |
| `evotx_checkout_addnames_other_vars` | `class-integration-tickets.php:46` | 10 | Append seat number span to checkout line-item names |
| `evotx_adjust_orderitem_ticket_stockother` | `class-integration-tickets.php:50` | 10 | Mark seat as sold or restock seat based on order status transition |
| `evotx_order_item_meta_slug_replace` | `class-integration-tickets.php:51` | 10 | Translate internal meta keys to readable labels |
| `evotx_tix_save_field_meta` | `class-integration-tickets.php:52` | 10 | Save seat number and slug to `evo-tix` post meta |
| `evotx_hidden_order_itemmeta` | `class-integration-tickets.php:55` | 10 | Hide `_evost_seat_slug` from admin order item meta display |
| `evotx_get_attendees_for_event` | `class-integration-tickets.php:25` | 10 | Enrich attendee data array with seat type, number, and slug |
| `evodp_event_edit_enable_dp` | `class-integration-general.php:10` | 10 | Unknown — deferred to dynamic analysis. Hook name suggests Dynamic Pricing addon integration. |
| `evoqr_data_output` | `class-integration-qrcode.php:8` | 10 | Append seat number and readable seat info to QR code data payload |

## Emitted Hooks (published by this plugin)

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evost_construct` | action | `class-event_seats.php:34` | Fires at end of `EVOST_Seats` constructor; receives the seats object; allows third-party modification before seat data is loaded |
| `evost_seat_data` | filter | `class-event_seats.php:55` | Filters raw seat map array read from postmeta; allows overriding the seat data source |
| `evost_front_before_seat_map` | action | `class-integration-tickets.php:113` | Fires before seat map section HTML is output on the frontend event card |
| `evost_front_seat_map_class` | filter | `class-integration-tickets.php:115` | Filters CSS class string for the frontend seat map wrapper div |
| `evost_seat_preview` | filter | `class-ajax.php:157` | Filters the seat preview popup content; allows injecting custom HTML before price display |
| `evost_seat_base_price` | filter | `class-ajax.php:176` | Filters the base price shown in the seat preview; allows price adjustments |
| `evost_seat_prev_before_total_price` | action | `class-ajax.php:190` | Fires inside seat preview, just before total price; allows injecting additional form fields |
| `evost_seats_in_cart_json` | filter | `class-event_seats_json.php:164` | Filters the per-cart-item seat data array built for the cart JSON response |
| `evost_before_tickets_meta_box` | filter | `admin/class-post_meta.php:19` | Controls whether seat-chart metabox content is displayed; returning false or a string suppresses the UI |
| `evost_duplicate_section` | filter | `admin/class-seat-map-editor.php:241` | Filters section data just before a duplicated section is saved |
| `evost_duplicate_section_after_save` | action | `admin/class-seat-map-editor.php:245` | Fires after a section duplicate has been saved; passes original and new section IDs |
| `evost_save_editor_form_beforesave` | action | `admin/class-seat-map-editor.php:286` | Fires before a section/row/seat form save in the editor |
| `evost_save_editor_form_aftersave` | action | `admin/class-seat-map-editor.php:311` | Fires after a section/row/seat form save completes |
| `evost_save_map_editor_aftersave` | action | `admin/class-seat-map-editor.php:358` | Fires after the bulk position-drag save completes |
| `evost_delete_item` | action | `admin/class-seat-map-editor.php:372` | Fires before a section/row/seat is deleted from the map |
| `evost_mapeditor_before` | action | `admin/class-seat-map-editor.php:408` | Fires before the main editor HTML is rendered in the lightbox |
| `evost_settings_map_area` | filter | `admin/class-seat-map-editor.php:783` | Filters the map area size options array in editor settings form |
| `evost_admin_formfields` | action | `admin/class-seat-map-editor.php:915` | Fires inside editor forms, allowing third-party fields to be added |

## AJAX Actions

All frontend AJAX actions are registered for **both** `wp_ajax_` (logged-in) and `wp_ajax_nopriv_` (public/unauthenticated). Additionally they are registered on `evo_ajax_` for EventON's own AJAX dispatcher. No nonce validation was found in the frontend AJAX handler class itself; the evotx integration layer owns nonce checks.

Admin (editor) AJAX actions are registered for **both** `wp_ajax_` and `wp_ajax_nopriv_` — the nopriv registration appears to be a copy-paste error since these actions require admin context to be useful, but no capability check was found at the class level. Dateline should restrict these to `wp_ajax_` only with a `current_user_can('manage_options')` capability check.

### Frontend AJAX Actions (class-ajax.php)

| Action name | Auth | Source file:line | Purpose |
|---|---|---|---|
| `evost_get_seats_data` | public | `class-ajax.php:37` | Primary seat map loader. Receives `eid` (event ID), `wcid` (WooCommerce product ID), `ri` (repeat interval), optional `type=lb` for lightbox HTML. Returns: seat settings, full seat map JSON (triggers expiry check), cart seats JSON, and frontend seat picker HTML. Also resets expiry timer for existing cart seats. |
| `evost_refresh_seat_map` | public | `class-ajax.php:196` | Lightweight seat map refresh. Receives `eventid` and `wcid`. Returns updated seat map JSON and cart seats JSON. Used after a seat status change to sync the map without full reload. Note: uses raw `$_POST` (not sanitised) in this handler. |
| `evost_seat_cart_preview` | public | `class-ajax.php:107` | Seat selection preview before add-to-cart. Receives `event_data` array including `eid`, `wcid`, `seat_slug`. Checks availability, renders price and quantity selector HTML, returns preview popup content and updated map JSON. Fires `evost_seat_preview` and `evost_seat_base_price` filters. |
| `evost_seat_direct_add_cart` | public | `class-ajax.php:68` | Direct add-to-cart for assigned seats (bypasses preview). Receives `event_data` including `eid`, `wcid`, `seat_slug`. Checks availability, calls evotx add-to-cart. Only for `seat` type; rejects `unaseat`/`booseat`. |
| `evost_remove_seat_from_cart` | public | `class-ajax.php:210` | Remove a seat from the WC cart and immediately mark the seat as available. Receives `key` (cart item key), `seat_slug`, `event_data`. Returns success/failure message. |

### Admin AJAX Actions (admin/class-seat-map-editor.php)

| Action name | Auth | Source file:line | Purpose |
|---|---|---|---|
| `evost_editor_content` | admin (wp_ajax) | `class-seat-map-editor.php:31` | Load the full seat map editor lightbox: returns seat JSON, editor HTML, Handlebars template, and attendee list. Entry point for the admin seat-map editor. |
| `evost_editor_forms` | admin (wp_ajax) | `class-seat-map-editor.php:118` | Return the edit/create form HTML for a section, row, seat, or settings item. Populates form with existing values for `edit` method. |
| `evost_save_editor_forms` | admin (wp_ajax) | `class-seat-map-editor.php:258` | Save a section, row, seat, or settings form. Creates or updates the relevant item in `_evost_sections` postmeta; syncs WC product stock. |
| `evost_delete_item` | admin (wp_ajax) | `class-seat-map-editor.php:363` | Delete a section, row, or seat from the map and return updated map JSON. |
| `evost_editor_save_changes` | admin (wp_ajax) | `class-seat-map-editor.php:322` | Save bulk drag-position changes: receives the full section map with updated `top`/`left` coordinates and persists them. Syncs WC stock. |
| `evost_duplicate_section` | admin (wp_ajax) | `class-seat-map-editor.php:211` | Duplicate an entire section (with all rows and seats), offset its canvas position, suffix its name, reset seat statuses to available. |
| `evost_get_upload_form` | admin (wp_ajax) | `class-seat-map-editor.php:79` | Return the JSON import form HTML for uploading a seat map file. |
| `evost_save_uploaded_map` | admin (wp_ajax) | `class-seat-map-editor.php:86` | Accept uploaded JSON seat map data and save it as the event's seat map, replacing any existing data. |
| `evost_clear_map` | admin (wp_ajax) | `class-seat-map-editor.php:102` | Clear all seat map data for an event (sets `_evost_sections` to empty array). |
| `evost_make_all_av` | admin (wp_ajax) | `class-seat-map-editor.php:117` | Reset all seat statuses to available for an event (bulk restock). |

## REST Routes

No `register_rest_route` calls found. **No REST API routes registered.**

## Shortcodes

No `add_shortcode` calls found. **No shortcodes registered.**
