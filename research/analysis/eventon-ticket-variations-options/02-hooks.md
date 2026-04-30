---
plugin: eventon-ticket-variations-options
version: 1.1.4
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-ticket-variations-options — Hooks

## Registered Hooks (hooks this plugin listens to)

### Bootstrap / Lifecycle

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `plugins_loaded` | action | `eventon-ticket-variations-options.php:39` | Main plugin init — checks dependencies and conditionally loads all sub-classes |
| `init` | action | `eventon-ticket-variations-options.php:67` | Loads all includes and instantiates frontend class |
| `admin_init` | action | `includes/admin/class-admin.php:8` | Admin init — loads post-meta and AJAX classes, registers duplicate-event hook |

### Frontend Assets

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evo_register_other_styles_scripts` | action | `includes/class-frontend.php:11` | Registers plugin CSS and JS with WordPress (with nonce for AJAX) |
| `eventon_enqueue_styles` | action | `includes/class-frontend.php:12` | Enqueues the registered CSS and JS on frontend |
| `admin_print_styles-post.php` | action | `includes/admin/class-admin.php:26` | Enqueues admin CSS/JS only on event edit screen |
| `admin_print_styles-post-new.php` | action | `includes/admin/class-admin.php:26` | Same, for new event screen |

### Event Tickets (evotx) Integration

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evotx_single_product_temp` | filter | `includes/class-integration-tickets.php:13` | Replaces the default ticket template HTML with the VO selection UI (variations dropdowns + price options list) |
| `evotx_add_to_cart_evotxdata` | filter | `includes/class-integration-tickets.php:14` | Pass-through; reserved for addon data merging |
| `woocommerce_get_cart_item_from_session` | filter | `includes/class-integration-tickets.php:17` | Restores `evovo_data` from session to cart item on page reload |
| `evotx_addtocart_text_strings` | filter | `includes/class-integration-tickets.php:20` | Adds VO-specific error strings (out-of-stock, unavailable) to the tickets error string dictionary |
| `evotx_add_cart_item_meta` | filter | `includes/class-integration-tickets.php:21` | Core add-to-cart handler: resolves selected variation and price options, computes `evovo_price`, handles "sold as separate" branching |
| `evotx_ticket_item_price_for_cart` | filter | `includes/class-integration-tickets.php:22` | Overrides the cart item price with the pre-computed `evovo_price` |
| `evotx_is_ticket_in_stock` | filter | `includes/class-integration-tickets.php:23` | Delegates stock check to variation-level stock instead of WC product stock |
| `evotx_cart_item_name` | filter | `includes/class-integration-tickets.php:26` | Appends selected variation/option names and prices to cart item display label |
| `evotx_cart_item_quantity` | filter | `includes/class-integration-tickets.php:27` | Replaces the default quantity input with one limited by variation-specific stock |
| `evotix_cart_item_validation` | action | `includes/class-integration-tickets.php:28` | Validates variation and option stock at cart validation; removes item and shows error if out of stock or membership-restricted |
| `evotx_checkout_create_order_line_item` | action | `includes/class-integration-tickets.php:37` | Saves `_evovo_data` to WooCommerce order item meta at checkout |
| `woocommerce_before_cart_item_quantity_zero` | action | `includes/class-integration-tickets.php:38` | Hook registered but handler body is empty (stub) |
| `evotx_adjust_orderitem_ticket_stockother` | filter | `includes/class-integration-tickets.php:39` | Adjusts variation and price option stock counts when an order is completed or refunded |
| `evotx_tix_save_field_meta` | filter | `includes/class-integration-tickets.php:40` | Copies `_evovo_data` into the ticket CPT meta fast-path field |
| `evotx_checkout_addnames_other_vars` | filter | `includes/class-integration-tickets.php:41` | Appends selected variation-type labels to the checkout ticket info string |
| `evotx_hidden_order_itemmeta` | filter | `includes/class-integration-tickets.php:44` | Controls which order item meta fields are hidden in the WC admin order view |
| `woocommerce_order_item_get_formatted_meta_data` | filter | `includes/class-integration-tickets.php:45` | Injects variation and option details into the formatted order item meta display in WC admin |
| `evotix_confirmation_email_additional_data` | action | `includes/class-integration-tickets.php:47` | Adds variation and option display rows to the ticket confirmation email |
| `evotx_get_attendees_for_event` | filter | `includes/class-integration-tickets.php:49` | Merges selected variation/option data into attendee list display |
| `eventontx_tix_post_table` | action | `includes/class-integration-tickets.php:53` | Admin: adds VO data rows to the ticket CPT list table |
| `evotx_csv_headers` | filter | `includes/class-integration-tickets.php:54` | Adds variation type and option columns to attendee CSV export |
| `evotx_csv_row` | filter | `includes/class-integration-tickets.php:55` | Populates those columns per row in the attendee CSV |
| `evotx_sales_insight_data_item` | filter | `includes/class-integration-tickets.php:58` | Adds VO breakdowns to the per-order sales insight data array |
| `evotx_sales_insight_after` | filter | `includes/class-integration-tickets.php:59` | Renders a "Sales by Ticket Variations & Options" section in the sales insight UI |

### Seats (evost) Integration

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evost_admin_formfields` | action | `includes/class-integration-seats.php:13` | Injects VO editor (list + action buttons) into the seat section edit form |
| `evovo_after_save` | action | `includes/class-integration-seats.php:14` | After a VO is saved for a seat parent, updates the seat section's `has_vos` flag and refreshes the VO list HTML |
| `evovo_after_delete` | action | `includes/class-integration-seats.php:15` | After a VO is deleted for a seat parent, refreshes the VO list HTML |
| `evovo_variations_form_fields` | filter | `includes/class-integration-seats.php:16` | Removes stock/stock_status fields from the variation form when parent is a seat section (stock comes from seat capacity) |
| `evost_duplicate_section_after_save` | action | `includes/class-integration-seats.php:17` | When a seat section is duplicated, clones all its VO items with new IDs and the new section as parent |
| `evost_delete_item` | action | `includes/class-integration-seats.php:18` | When a seat section is deleted, removes all its VO items |
| `evovo_ticket_frontend_mod` | filter | `includes/class-integration-seats.php:22` | If seats addon is active, shows the seat map instead of the standalone VO selector |
| `evost_seat_preview` | filter | `includes/class-integration-seats.php:23` | Injects VO selection UI into the seat-selection preview panel |
| `evost_seat_prev_before_total_price` | filter | `includes/class-integration-seats.php:24` | Injects price option price containers before the seat total price display |
| `evovo_add_to_cart_before` | action | `includes/class-integration-seats.php:25` | Registers a closure to override the seat base price with the selected variation's price |
| `evost_seats_in_cart_json` | filter | `includes/class-integration-seats.php:26` | Adds VO/option data (labels + prices) to the seat-in-cart JSON used to render the cart summary on the seat map |
| `evovo_is_instock_check` | filter | `includes/class-integration-seats.php:29` | Short-circuits stock check to `true` if seats addon is active (seat map manages its own availability) |
| `evovo_var_in_stock` | filter | `includes/class-integration-seats.php:30` | For assigned seats returns `1` (one seat = one unit); for unassigned seats delegates to variation stock |

### Booking (evobo) Integration

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evobo_new_block_form` | action | `includes/class-integration-booking.php:14` | Injects VO editor into the booking block edit form (only for existing blocks, not new) |
| `evovo_after_save` | action | `includes/class-integration-booking.php:15` | After a VO is saved for a booking parent, flags the block with `has_vos` and returns updated HTML |
| `evobo_after_save_block` | filter | `includes/class-integration-booking.php:16` | When a booking block is saved, syncs block capacity from total variation stock |
| `evovo_variations_form_fields` | filter | `includes/class-integration-booking.php:17` | Adds a notice to the variation form showing the booking block's capacity as a guide |
| `evobo_auto_generator_form` | action | `includes/class-integration-booking.php:19` | Injects VO editor into the booking auto-generator form |
| `evobo_autogen_after_saved` | action | `includes/class-integration-booking.php:20` | After auto-generated booking slots are created, clones VO items from the generator template to each new slot |
| `evobo_delete_all_blocks` | action | `includes/class-integration-booking.php:22` | Removes all VO items for the event when all booking blocks are deleted |
| `evobo_delete_single_blocks` | action | `includes/class-integration-booking.php:23` | Removes VO items for a specific booking block when it is deleted |
| `evobo_block_preview` | filter | `includes/class-integration-booking.php:28` | Injects VO selection UI into the booking block preview panel |
| `evovo_ticket_frontend_mod` | filter | `includes/class-integration-booking.php:29` | If booking blocks are active, shows the booking UI instead of the standalone VO selector |
| `evovo_add_to_cart_before` | action | `includes/class-integration-booking.php:30` | Registers closures to override the booking block base price and capacity from the selected variation |
| `evovo_vo_item_stock_return` | filter | `includes/class-integration-booking.php:32` | For booking-parented variations with no explicit stock, returns the block's available capacity |
| `evobo_blocks_json` | filter | `includes/class-integration-booking.php:35` | Marks booking block JSON with `vo_var` / `vo_opt` flags for the frontend to know whether to show a VO selector |

### Admin / Post Meta

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evotx_event_metabox_end` | action | `includes/admin/class-post_meta.php:9` | Appends the "Enable ticket variations & options" toggle to the evotx event metabox |
| `evotx_save_eventedit_page` | filter | `includes/admin/class-post_meta.php:10` | Adds `_evovo_activate` to the list of fields saved on the event edit page |
| `evotx_after_saving_ticket_data` | filter | `includes/admin/class-post_meta.php:11` | Post-save hook (currently a stub) |
| `evonton_duplicate_product` | action | `includes/admin/class-admin.php:38` | When an event is duplicated, copies all VO postmeta (updating parent_id references to the new event) |
| `evonton_settings_lang_tab_content` | filter | `includes/admin/class-lang.php:8` | Adds VO-specific language strings ("Your Total", "Base Price", "Add", "Added", "remove", "Out of Stock", "Sold Out", "Optional Ticket Additions") to the EventON language settings tab |
| `evo_addons_details_list` | filter | `includes/admin/class-admin.php:35` | Registers this addon in EventON's addon list |
| `woocommerce_hidden_order_itemmeta` | filter | `includes/admin/class-admin.php:32` | Hides `_ticket_var_index` from WC order item meta display |

---

## Emitted Hooks (hooks this plugin fires for extension)

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evovo_before_tickets_meta_box` | filter | `includes/admin/class-post_meta.php:27` | Allows other plugins to suppress or modify the VO metabox display condition |
| `evovo_ticket_frontend_mod` | filter | `includes/class-integration-tickets.php:69` | Allows integration addons (seats, booking) to override the frontend VO selector with their own UI |
| `evovo_is_instock_check` | filter | `includes/class-integration-tickets.php:116` | Allows integration addons to override the variation stock check result |
| `evovo_add_cart_item_meta` | filter | `includes/class-integration-tickets.php:330` | Final hook on cart item data after all VO processing; allows external extension |
| `evovo_var_in_stock` | filter | `includes/class-integration-tickets.php:460` | Allows integration addons (seats) to override per-variation stock at cart validation |
| `evovo_po_in_stock` | filter | `includes/class-integration-tickets.php:488` | Allows integration addons to override per-option stock at cart validation |
| `evovo_vo_item_stock_return` | filter | `includes/class-event-variations_options.php:146` | Allows modification of the raw stock value before any stock comparison (used by booking integration) |
| `evovo_evotx_addon_data` | filter | `includes/class-event-variations_options.php:933` | Allows modification of the full VO data JSON embedded in the frontend HTML (used to pass state to JavaScript) |
| `evovo_add_to_cart_before` | action | `includes/class-event-variations_options.php:879` | Fired just before the add-to-cart form fields; used by seats and booking integrations to inject price overrides |
| `evovo_after_save` | action | `includes/admin/class-admin-ajax.php:480` | Fired after a VO item is saved; used by seats and booking integrations to update their own data |
| `evovo_after_save_wc` | action | `includes/admin/class-admin-ajax.php:493` | Fired after WooCommerce product stock management is updated following a VO save |
| `evovo_after_delete` | action | `includes/admin/class-admin-ajax.php:559` | Fired after a VO item is deleted; used by seats and booking integrations to clean up |
| `evovo_new_edit_form` | action | `includes/admin/class-admin-ajax.php:410` | Fired at end of the VO creation/edit form; allows integrations to inject extra fields |
| `evovo_variations_form_fields` | filter | `includes/admin/class-admin-ajax.php:301,325` | Allows integrations to add, remove, or modify variation/option form fields |
| `evovo_variationtype_form_fields` | filter | `includes/admin/class-admin-ajax.php:307` | Allows integrations to modify variation-type form fields |

---

## AJAX Actions

All admin AJAX actions are registered for both logged-in (`wp_ajax_`) and logged-out (`wp_ajax_nopriv_`) contexts, though access in practice is gated by nonces and the admin-only inclusion path.

| Action name | Auth required | Source file:line | Purpose |
|---|---|---|---|
| `evovo_get_vo_form` | Nonce (`eventonto_nonce`) | `includes/admin/class-admin-ajax.php:10` | Renders the lightbox form for creating or editing a variation type, variation row, or price option |
| `evovo_new_options_form` | Nonce | `includes/admin/class-admin-ajax.php:11` | Legacy alias for `evovo_get_vo_form` |
| `evovo_save_vo_form` | Nonce | `includes/admin/class-admin-ajax.php:12` | Saves a variation type / variation / option to the event's postmeta and returns updated list HTML |
| `evovo_save_dataset` | Nonce | `includes/admin/class-admin-ajax.php:13` | Legacy alias for `evovo_save_vo_form` |
| `evovo_save_neworder` | Nonce | `includes/admin/class-admin-ajax.php:14` | Saves a new drag-drop sort order for VO items under a parent |
| `evovo_delete_item` | Nonce | `includes/admin/class-admin-ajax.php:15` | Deletes a single VO item from postmeta and returns updated list HTML |
| `evovo_get_settings` | Nonce | `includes/admin/class-admin-ajax.php:16` | Renders the VO settings panel (sell-as-separate, hide-sold toggles) in a lightbox |
| `evovo_save_settings` | Nonce | `includes/admin/class-admin-ajax.php:17` | Saves VO-level settings back to event postmeta |

**Note:** The deprecated `evovo_add_to_cart` action in `class-ajax.php` is commented out and never registered. There are **no** active frontend (non-admin) AJAX actions. Price recalculation is handled **client-side in JavaScript** (`evovo_script.js`) using the VO data JSON embedded in the page HTML — no server-side price-recalculation AJAX call is made when the user changes a dropdown selection.

---

## REST Routes

No REST routes registered. Zero hits on `register_rest_route` in the entire codebase.

---

## Shortcodes

None. Zero hits on `add_shortcode`.
