---
plugin: eventon-tickets
version: 2.4.7
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# EventON — Event Tickets: Hooks

## Registered Hooks (plugin listens to these)

| Hook name | Type | Source file:line | Purpose (paraphrased) |
|---|---|---|---|
| `plugins_loaded` | action | eventon-tickets.php:54 | Bootstraps plugin after all plugins loaded; checks for EventON core and WC |
| `admin_notices` | action | eventon-tickets.php:60,69,81 | Displays admin warnings when EventON core or WooCommerce is missing or wrong version |
| `init` | action | eventon-tickets.php:75 | Fires plugin initialisation (load text domain, includes, register hooks) |
| `before_woocommerce_init` | action | eventon-tickets.php:115 | Declares WooCommerce cart/checkout blocks incompatibility |
| `plugin_action_links_*` | filter | eventon-tickets.php:79 | Adds "Settings" link to the plugin list row |
| `evo_elm_def_css` | filter | class-appearance.php:9 | Appends ticket-specific CSS defaults into EventON's style system |
| `evo_appearance_button_elms` | filter | class-appearance.php:11 | Adds ticket "buy" button to EventON appearance panel |
| `evo_appearance_button_elms_hover` | filter | class-appearance.php:12 | Adds hover states for ticket button to appearance panel |
| `eventon_inline_styles_array` | filter | class-appearance.php:14 | Injects dynamic CSS variables for ticket UI into EventON's inline-style output |
| `eventon_appearance_add` | filter | class-appearance.php:17 | Adds ticket appearance settings section to EventON admin appearance tab |
| `evoau_form_fields` | filter | class-integration-actionuser.php:13 | Registers ticket fields block in the ActionUser form builder |
| `evoau_frontform_evotx` | action | class-integration-actionuser.php:17 | Renders ticket fields within the ActionUser front-end event submission form |
| `evoau_save_formfields` | action | class-integration-actionuser.php:19 | Saves ticket field values submitted through ActionUser form |
| `evoau_frontend_scripts_enqueue` | action | class-integration-actionuser.php:20 | Enqueues ticket JS alongside ActionUser's front-end scripts |
| `evoau_manager_row_title` | action | class-integration-actionuser.php:23 | Injects ticket column title into the ActionUser event-manager table |
| `evoau_manager_row` | action | class-integration-actionuser.php:24 | Injects ticket data cell into the ActionUser event-manager table |
| `evoau_event_manager_delete_btn` | filter | class-integration-actionuser.php:26 | Conditionally modifies the delete button in ActionUser manager |
| `wp_ajax_evotx_ajax_get_auem_stats` | action | class-integration-actionuser.php:29 | AJAX: Returns ticket statistics for ActionUser event manager (admin only) |
| `wp_ajax_nopriv_evotx_ajax_get_auem_stats` | action | class-integration-actionuser.php:30 | AJAX: Same stats endpoint for non-logged-in users |
| `eventon_core_capabilities` | filter | class-integration-actionuser.php:33 | Registers ticket-related user capabilities into EventON's capability system |
| `eventonau_language_fields` | filter | class-integration-actionuser.php:37 | Adds ticket label strings to ActionUser's language/translation fields |
| `init` | action | class-integration-woocommerce_myaccount.php:13 | Registers the "evo-tickets" WC My Account endpoint rewrite rule |
| `query_vars` | filter | class-integration-woocommerce_myaccount.php:16 | Adds `evo-tickets` as a recognised query variable |
| `evotx_activate` | action | class-integration-woocommerce_myaccount.php:19 | Flushes rewrite rules on plugin activation |
| `evotx_deactivate` | action | class-integration-woocommerce_myaccount.php:20 | Flushes rewrite rules on plugin deactivation |
| `woocommerce_account_menu_items` | filter | class-integration-woocommerce_myaccount.php:21 | Adds "My Tickets" item to WC My Account navigation |
| `woocommerce_account_evo-tickets_endpoint` | action | class-integration-woocommerce_myaccount.php:22 | Renders the My Tickets tab content in WC My Account |
| `woocommerce_add_cart_item_data` | filter | class-integration-woocommerce.php:~25 | Attaches event ID, repeat interval, language, and location data to cart item on add |
| `woocommerce_get_cart_item_from_session` | filter | class-integration-woocommerce.php:~26 | Restores ticket metadata from WC session on page load |
| `evotx_after_ticket_added_to_cart` | action | class-integration-woocommerce.php:~27 | Persists ticket cart data into the WC session after add-to-cart |
| `woocommerce_cart_item_product` | filter | class-integration-woocommerce.php | Modifies the cart product object for ticket items |
| `woocommerce_cart_item_class` | filter | class-integration-woocommerce.php | Appends CSS class to ticket cart rows for styling |
| `woocommerce_get_item_data` | action | class-integration-woocommerce.php | Displays event date/time in the cart line-item meta list |
| `woocommerce_cart_item_name` | filter | class-integration-woocommerce.php | Replaces the default WC product name with a rich event-info label in the cart |
| `woocommerce_order_item_class` | filter | class-integration-woocommerce.php | Appends ticket-type CSS class to order line items |
| `woocommerce_check_cart_items` | action | class-integration-woocommerce.php | Validates that ticket dates/stock are still valid when cart is recalculated |
| `woocommerce_before_calculate_totals` | action | class-integration-woocommerce.php | Applies "name your price" custom price to the cart item before totals run |
| `woocommerce_after_calculate_totals` | action | class-integration-woocommerce.php | Runs post-total hooks for ticket pricing adjustments |
| `woocommerce_store_api_product_quantity_limit` | filter | class-integration-woocommerce.php | Enforces per-event quantity limits for the WC Store API (Blocks checkout) |
| `woocommerce_cart_item_quantity` | filter | class-integration-woocommerce.php:~443 | Enforces max-quantity UI limit for ticket cart items |
| `woocommerce_cart_emptied` | filter | class-integration-woocommerce.php | Cleans up ticket session data when the cart is emptied |
| `woocommerce_remove_cart_item` | filter | class-integration-woocommerce.php | Cleans up ticket session data when a cart item is removed |
| `woocommerce_cart_item_removed` | filter | class-integration-woocommerce.php | Same cleanup for the "item removed" cart state |
| `woocommerce_update_cart_action_cart_updated` | filter | class-integration-woocommerce.php | Recalculates ticket quantities after cart quantity edit |
| `woocommerce_checkout_create_order_line_item` | action | class-integration-woocommerce.php | Saves event and repeat-interval metadata to WC order line items at checkout |
| `woocommerce_checkout_order_processed` | action | class-integration-woocommerce.php:64,65 | Creates `evo-tix` posts; reduces stock at checkout |
| `woocommerce_reduce_order_stock` | action | class-integration-woocommerce.php:67 | Secondary stock-reduction hook |
| `woocommerce_checkout_fields` | filter | class-integration-woocommerce.php:73 | Injects ticket-holder name/email fields into WC checkout form |
| `woocommerce_after_order_notes` | action | class-integration-woocommerce.php:74 | Renders ticket-holder additional field section in checkout |
| `woocommerce_after_checkout_validation` | action | class-integration-woocommerce.php:75 | Validates required ticket-holder fields before order is placed |
| `woocommerce_checkout_update_order_meta` | action | class-integration-woocommerce.php:78 | Saves ticket-holder data (`_tixholders`) to WC order meta |
| `woocommerce_order_details_after_order_table` | action | class-integration-woocommerce.php:81 | Displays ticket-holder info on WC order-detail pages |
| `woocommerce_thankyou` | action | class-integration-woocommerce.php:86 | Renders ticket download/QR display on the thank-you page |
| `woocommerce_view_order` | action | class-integration-woocommerce.php:90 | Same ticket display on the WC "view order" page |
| `woocommerce_order_status_{old}_to_{new}` | action | class-integration-woocommerce.php:100–141 | Multiple dynamic hooks: refund/cancel/fail → restock tickets; fail→complete or cancel→complete → re-process and reduce stock |
| `woocommerce_order_refunded` | action | class-integration-woocommerce.php:145 | Marks ticket status as refunded and restocks when WC refund is processed |
| `woocommerce_order_status_completed` | action | class-integration-woocommerce.php:150 | Sends ticket confirmation email when order reaches Completed status |
| `woocommerce_order_item_name` | filter | class-integration-woocommerce.php:152 | Adjusts order item display name for ticket line items |
| `woocommerce_new_order_item` | action | class-integration-woocommerce.php:153 | Sets event title as the WC order item name on creation |
| `woocommerce_email_order_meta_fields` | filter | class-integration-woocommerce.php:154 | Appends ticket meta fields to WC order notification emails |
| `woocommerce_email_after_order_table` | action | class-integration-woocommerce.php:155 | Appends ticket details block to WC transactional emails |
| `woocommerce_ajax_order_items_removed` | action | class-integration-woocommerce.php:158 | Restocks ticket when an order item is removed via admin AJAX |
| `woocommerce_payment_complete_order_status` | filter | class-integration-woocommerce.php:161 | Optionally overrides WC's "payment complete" status to autocomplete ticket orders |
| `woocommerce_order_status_processing` | action | class-integration-woocommerce.php:168 | Autocomplete orders from real-time payment gateways |
| `woocommerce_bacs_process_payment_order_status` | filter | class-integration-woocommerce.php:172 | Autocomplete BACS (bank transfer) ticket orders |
| `woocommerce_cheque_process_payment_order_status` | filter | class-integration-woocommerce.php:175 | Autocomplete cheque ticket orders |
| `woocommerce_cod_process_payment_order_status` | filter | class-integration-woocommerce.php:178 | Autocomplete COD ticket orders |
| `woocommerce_default_address_fields` | filter | class-integration-woocommerce.php:182 | Adjusts default WC address fields for ticket checkout |
| `add_meta_boxes` | action | admin/class-meta_boxes.php:15 | Registers all ticket meta boxes on event, evo-tix, and product edit screens |
| `eventon_save_meta` | action | admin/class-meta_boxes.php:16 | Saves ticket settings from the event edit screen |
| `save_post` | action | admin/class-meta_boxes.php:17,18 | Saves `evo-tix` post data and processes new ticket orders from admin |
| `evo_eventedit_repeat_metabox_top` | action | admin/class-meta_boxes.php:22 | Injects repeat-capacity UI into the EventON repeat metabox |
| `evo_eventedit_pageload_data` | filter | admin/class-meta_boxes.php:25 | Provides ticket section HTML for the event-edit AJAX page load |
| `evo_eventedit_pageload_dom_ids` | filter | admin/class-meta_boxes.php:26 | Registers the ticket DOM section ID for the event-edit AJAX refresh |
| `woocommerce_admin_order_data_after_payment_info` | action | admin/class-meta_boxes.php:30,31 | Injects ticket info panels into WC admin order screen |
| `admin_init` | action | admin/class-admin.php:12 | Registers admin scripts/styles and initialises admin sub-components |
| `admin_head` | action | admin/class-admin.php:13 | Outputs admin-only inline CSS |
| `wp_trash_post` | action | admin/class-admin.php:29 | Handles cleanup when a ticketed event is moved to trash |
| `evo_after_duplicate_event` | action | admin/class-admin.php:31 | Duplicates the linked WC product when an event is duplicated |
| `eventon_duplicate_event_exclude_meta` | action | admin/class-admin.php:32 | Excludes `tx_woocommerce_product_id` from meta duplication (new product created fresh) |
| `transition_post_status` | action | admin/class-admin.php:34 | Synchronises WC product publish/draft status with the event's post status |
| `admin_menu` | action | admin/class-admin.php:36,37 | Registers Tickets submenu under EventON and Ticket Orders submenu under WooCommerce |
| `pre_get_posts` | filter | admin/class-admin.php:38 | Adds postmeta-based filtering to the event list table for ticket queries |
| `eventon_shortcode_popup` | filter | admin/class-admin.php:41 | Adds ticket-related options to EventON's shortcode builder popup |
| `woocommerce_order_query_args` | action | admin/class-admin.php:43 | Filters WC orders list to show only ticket orders when requested |
| `evo_eventcard_vir_before_after_event` | action | class-integration-virtualevents.php:8 | Injects ticket-gate toggle into virtual event admin settings |
| `evo_editevent_vir_after_event_end` | action | class-integration-virtualevents.php:9 | Injects after-event ticket gate toggle into virtual settings |
| `evovp_editevent_vir_pre_event_end` | action | class-integration-virtualevents.php:10 | Injects pre-event ticket gate toggle (VirtualPlus) |
| `evo_vir_initial_setup` | action | class-integration-virtualevents.php:13 | Initialises ticket-gate state for each event card render |
| `evo_eventcard_vir_txt_cur` | filter | class-integration-virtualevents.php:15 | Replaces virtual event text with "paid attendees only" message when gated |
| `evo_eventcard_vir_details_bool` | filter | class-integration-virtualevents.php:16 | Hides virtual details from non-ticket-holders |
| `evo_eventcard_virtual_livenow_html` | filter | class-integration-virtualevents.php:17 | Appends guest/checked-in count to the live-now badge |
| `evo_eventcard_vir_after_details` | filter | class-integration-virtualevents.php:18 | Appends purchase-prompt or "you have a ticket" message after virtual details |
| `evo_eventcard_virtual_after_content` | filter | class-integration-virtualevents.php:20 | Gates post-event content behind ticket ownership |
| `evovp_show_signin_box` | filter | class-integration-virtualevents.php:22 | Suppresses VirtualPlus sign-in box if user has already signed in |
| `evovp_signin_user` | filter | class-integration-virtualevents.php:23 | Records `signin=y` on the user's ticket post when they sign in |
| `evovp_eventcard_virtual_pre_content` | filter | class-integration-virtualevents.php:24 | Hides pre-event content from non-ticket-holders |
| `evotix_confirmation_email_data` | action | class-integration-virtualevents.php:26 | Appends the virtual event URL and access instructions to the confirmation email |
| `evo_webhook_triggers` | filter | class-integration-webhooks.php:5 | Registers `tickets_created` and `ticket_stock_modified` webhook events |
| `evotx_order_with_tickets_created` | action | class-integration-webhooks.php:6 | Fires the `tickets_created` webhook payload after order ticket posts are created |
| `evotx_adjust_orderitem_ticket_stockother` | filter | class-integration-webhooks.php:7 | Fires the `ticket_stock_modified` webhook payload when stock changes |
| `evo_webhooks_data` | filter | class-integration-webhooks.php:8 | Describes field names for each webhook event type |
| `evo_addon_styles` | action | class-frontend.php:11 | Registers front-end ticket CSS with EventON's style system |
| `eventon_eventcard_boxes` | filter | class-frontend.php:25 | Injects ticket section into the EventON event card box order |
| `eventon_eventCard_evotx` | filter | class-frontend.php:28 | Renders the ticket purchase UI content inside the event card |
| `eventon_eventcard_array` | filter | class-frontend.php:29 | Adds ticket-specific data to the event card render array |
| `evo_eventcard_adds` | filter | class-frontend.php:30 | Adds supplemental ticket HTML alongside the event card |
| `eventon_eventtop_abovetitle` | filter | class-frontend.php:33 | Injects ticket sold-out or availability badges above the event title |
| `template_redirect` | action | class-frontend.php:43 | Redirects WC product pages to their linked event page (if that option is enabled) |
| `evo_frontend_lightbox` | filter | class-frontend.php:46 | Injects ticket section into the EventON lightbox render |

## Emitted Hooks (plugin fires these for external extension)

| Hook name | Type | Source file:line | Purpose (paraphrased) |
|---|---|---|---|
| `evotx_activate` | action | eventon-tickets.php:224 | Fired on plugin activation; allows extensions to run setup routines |
| `evotx_deactivate` | action | eventon-tickets.php:227 | Fired on plugin deactivation; allows extensions to run teardown routines |
| `evotx_add_ticket_to_cart_before` | filter | class-event_ticket.php:167 | Allows external code to intercept or replace the add-to-cart flow before WC is called |
| `evotx_add_cart_item_meta` | filter | class-event_ticket.php:207 | Allows extension of the cart item data array before it is passed to `WC()->cart->add_to_cart()` |
| `evotx_add_cart_item_qty` | filter | class-event_ticket.php:213 | Allows overriding the ticket quantity added to cart |
| `evotx_after_ticket_added_to_cart` | action | class-event_ticket.php:227 | Fires after a ticket is successfully added to the WC cart |
| `evotx_ticket_added_cart_ajax_data` | filter | class-event_ticket.php:241 | Allows modification of the JSON response sent back to the browser after add-to-cart |
| `evotx_guestlist_guest` | filter | class-event_ticket.php:536 | Allows each guest list entry HTML span to be customised |
| `evotx_get_attendees_for_event` | filter | class-attendees.php:281, 404 | Allows enrichment of the attendee data array returned per ticket |
| `evotx_tixPost_tixid` | filter | class-attendees.php:575 | Allows transformation of the ticket number displayed in admin/front-end |
| `evotx_one_ticket_extra` | action | class-attendees.php:646 | Allows injection of extra HTML below each ticket row in the attendee display |
| `evotx_tix_save_field_meta` | filter | class-evo-tix.php:119 | Allows the array of postmeta fields saved to `evo-tix` posts to be modified at creation time |
| `evotx_order_with_tickets_created` | action | class-evo-tix.php:162 | Fires after all `evo-tix` posts for an order have been created |
| `evotx_beforesend_tix_email_data` | filter | class-email.php:125 | Allows modification of the email data (to, subject, body, bcc) before the ticket email is sent |
| `evotx_remaining_stock` | filter | class-helper.php:121 | Allows the displayed remaining-stock number to be overridden |
| `evotx_addtocart_text_strings` | filter | class-helper.php:254 | Allows customisation of the text strings shown in the add-to-cart helper HTML |
| `evotx_cart_session_item_values` | filter | class-integration-woocommerce.php:230 | Allows modification of cart session data array for a ticket item |
| `evotx_ticket_item_price_for_cart` | filter | class-integration-woocommerce.php:247 | Allows a price override for a specific ticket in the cart (used by variations plugin) |
| `evotx_get_cart_item_from_session` | filter | class-integration-woocommerce.php:258 | Final modification point for restored cart-session ticket data |
| `evotx_ticket_item_meta_data` | filter | class-integration-woocommerce.php:335, 395 | Allows extension of the order line-item meta displayed in cart and checkout |
| `evotx_cart_item_name` | filter | class-integration-woocommerce.php:426 | Allows the cart item display name string to be customised |
| `evotx_cart_item_max_qty` | filter | class-integration-woocommerce.php:523 | Allows the per-cart-item max quantity to be overridden |
| `evotix_cart_item_validation` | action | class-integration-woocommerce.php:573 | Fires during cart validation for each ticket item; allows custom validation logic |
| `evotx_checkout_create_order_line_item` | action | class-integration-woocommerce.php:610 | Fires when each ticket order line-item is created; allows custom meta to be saved |
| `evotx_cart_ticket_removed` | action | class-integration-woocommerce.php:628 | Fires when a ticket is removed from the cart |
| `evotx_cart_tickets_updated` | action | class-integration-woocommerce.php:647 | Fires when cart quantities are updated for ticket items |
| `evotx_adjust_orderitem_ticket_stockother` | filter | class-integration-woocommerce.php:794 | Allows external stock-adjustment logic during order-status transitions |
| `evotx_after_order_stock_adjusted` | action | class-integration-woocommerce.php:799 | Fires after stock is adjusted for all items in an order |
| `evotx_cart_item_before_total` | action | class-integration-woocommerce.php:501 | Fires inside `woocommerce_before_calculate_totals` per ticket item |
| `evotx_checkout_addnames_other_vars` | filter | class-integration-woocommerce.php:912 | Filters the checkout additional-names HTML for non-simple product types |
| `evotx_checkout_fields` | filter | class-integration-woocommerce.php:943 | Allows ticket-holder field HTML to be modified for each ticket in checkout |
| `evotx_checkout_addnames_label` | filter | class-integration-woocommerce.php:973 | Allows the "Full Name" checkout field label to be overridden |
| `evotx_additional_ticket_info_fields` | filter | class-integration-woocommerce.php:1000 | Allows additional custom checkout fields to be registered |
| `evotx_checkout_fields_saving` | action | class-integration-woocommerce.php:1053 | Fires after ticket-holder checkout fields are saved to order meta |
| `evotx_checkout_fields_display_orderdetails` | action | class-integration-woocommerce.php:1085, 1096 | Fires when displaying ticket-holder fields on WC order-detail pages |
| `evotx_wc_thankyou_page_end` | action | class-integration-woocommerce.php:1150 | Fires at the end of the ticket block on the WC thank-you page |
| `evotx_cart_add_field_eventtime` | filter | class-integration-woocommerce.php:896 | Allows the formatted event-time string shown in cart item meta to be altered |
| `evotx_add_meta_boxes` | action | admin/class-meta_boxes.php:48 | Fires after the plugin's own meta boxes are registered; allows third-party meta boxes |
| `evotx_admin_before_settings` | action | admin/class-meta_boxes.php:147 | Fires before the ticket settings fieldset renders in the event metabox |
| `evotx_event_metabox_end` | action | admin/class-meta_boxes.php:167 | Fires at the end of the event ticket metabox; allows addition of custom fields |
| `evotx_ticketpost_confirmation_end` | action | admin/class-meta_boxes.php:490 | Fires at the end of the "Confirmation" side metabox on an `evo-tix` admin edit screen |
| `evotx_save_eventedit_page` | filter | admin/class-meta_boxes.php:559 | Allows modification of the postmeta fields saved from the event edit page |
| `evotx_after_saving_ticket_data` | action | admin/class-meta_boxes.php:580 | Fires after all ticket settings are saved for an event |
| `evotx_eventedit_fields_array` | filter | admin/views-event_settings.php:377 | Allows fields array for the event ticket settings form to be modified |
| `evotx_tixpost_data` | filter | admin/view-meta_boxes-evo-tix.php:135 | Allows the data fields array rendered in the evo-tix admin edit view to be modified |
| `eventontx_tix_post_table` | action | admin/view-meta_boxes-evo-tix.php:226 | Fires inside the ticket post admin view; allows custom table rows |
| `evotx_js_script_data` | filter | class-frontend.php:184 | Allows modification of the JS data object localised to the front-end ticket script |
| `evotx_is_ticket_in_stock` | filter | class-frontend.php:363 | Allows stock-availability check result to be overridden |
| `evotx_stop_selling` | filter | class-frontend.php:367 | Allows the "stop selling" cutoff result to be overridden |
| `evotx_single_product_temp` | filter | class-frontend.php:489 | Controls whether the plugin's own template is used for the single-product add-to-cart |
| `evotx_single_addtocart_templates` | filter | class-frontend.php:495 | Allows the list of add-to-cart template files to be modified |
| `evotx_add_to_cart_evotxdata` | filter | class-frontend.php:624 | Allows the data payload sent to the add-to-cart AJAX call to be modified |
| `evotx_inquiry_fields` | filter | class-frontend.php:691 | Allows the inquiry form fields array to be customised |
| `evotx_before_add_to_cart` | action | templates/template-add-to-cart-variable.php:78 | Fires before the variable-product add-to-cart button renders |
| `evotx_single_prod_price` | filter | templates/template-add-to-cart-single.php:47 | Allows the displayed ticket price to be modified in the single add-to-cart template |
| `evotx_single_prod_striked_price` | filter | templates/template-add-to-cart-single.php:49 | Allows the striked-through (original) price to be modified |
| `evotx_single_prod_label_add` | filter | templates/template-add-to-cart-single.php:51 | Allows extra text labels appended to the price display |
| `evotx_before_single_addtocart` | action | templates/template-add-to-cart-single.php:24 | Fires before the single-product add-to-cart section renders |
| `evotx_after_single_addtocart` | action | templates/template-add-to-cart-single.php:95 | Fires after the single-product add-to-cart section renders |
| `evotx_ticket_addcal_link` | filter | templates/email/ticket_confirmation_email.php:161 | Allows the "add to calendar" link in the confirmation email to be replaced |
| `evotx_confirmation_email_data_ar` | filter | templates/email/ticket_confirmation_email.php:209 | Allows the event-detail data array in the confirmation email to be modified |
| `evotx_email_tixid_list` | filter | templates/email/ticket_confirmation_email.php:254 | Allows the ticket-number display string in the email to be modified (e.g., for QR encoding) |
| `evotx_confirmation_email_additional_data_array` | filter | templates/email/ticket_confirmation_email.php:284 | Allows extra data sections to be appended to the confirmation email |
| `evotix_confirmation_email_data` | action | templates/email/ticket_confirmation_email.php:315 | Fires per ticket in the email; used by Virtual Events integration to append virtual URL |
| `evotix_confirmation_email_additional_data` | action | templates/email/ticket_confirmation_email.php:326 | Fires for extra data rows in the email |
| `evotix_confirmation_email_data_after_tr` | action | templates/email/ticket_confirmation_email.php:336 | Fires after each ticket's data row in the email table |
| `evotx_before_footer` | action | templates/email/ticket_confirmation_email.php:359 | Fires before the email footer; allows content injection at the bottom of the email |
| `evotx_csv_headers` | filter | admin/class-admin-ajax.php:332 | Allows the CSV export column headers to be customised |
| `evotx_csv_row` | filter | admin/class-admin-ajax.php:354 | Allows each attendee row in the CSV export to be modified |
| `evotx_after_duplicate_ticket_event` | action | admin/class-admin.php:233 | Fires after an event's ticket product is duplicated |
| `evotx_sales_insight_data_item` | filter | admin/class-admin_sales_insight.php:99 | Allows each sales-insight data item to be modified |
| `evotx_sales_insight_before_end` | action | admin/class-admin_sales_insight.php:428 | Fires before the sales insight panel closes |
| `evotx_sales_insight_after` | action | admin/class-admin_sales_insight.php:435 | Fires after the full sales insight panel renders |
| `evotx_checkout_additional_fields_settings` | filter | admin/class-settings.php:276 | Allows the settings array for additional checkout fields to be modified |
| `evotix_settings_page_content` | filter | admin/class-settings.php:24 | Allows the settings page content array to be modified |
| `evotx_additional_checkout_fields_settings` | filter | admin/class-settings.php:199 | Allows the additional checkout fields settings options to be modified |
| `evotx_admin_localize_data` | filter | admin/class-admin.php:347 | Allows the data object passed to admin JS to be extended |
| `evotx_hidden_order_itemmeta` | filter | class-int-wc-afterorder.php:26 | Allows the list of hidden order item meta keys to be modified |
| `evotx_order_item_meta_slug_replace` | filter | class-int-wc-afterorder.php:111 | Allows replacement mapping for order item meta key display labels |
| `evotx_wc_myaccount_tickettb_row` | filter | class-integration-woocommerce_myaccount.php:119 | Allows customisation of each row in the My Account "My Tickets" table |

## REST Routes

No `register_rest_route` calls found. The plugin does not register any WordPress REST API routes. All async operations use WordPress AJAX (`wp_ajax_*`).

## Shortcodes

| Shortcode | Source file:line | Purpose |
|---|---|---|
| `[evotx_btn]` | class-frontend.php:44 | Renders a standalone ticket purchase button for a specific event; can be placed anywhere on the site |
| `[evotx_attendees]` | class-frontend.php:45 | Renders the attendee/guest list for a specific event anywhere on the site (outside the event card) |
