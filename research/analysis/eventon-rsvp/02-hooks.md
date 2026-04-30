---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-rsvp — Hooks

## Registered Hooks (plugin subscribes to)

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `plugins_loaded` | action | eventon-rsvp.php:47 | Deferred init; checks for EventON core presence before loading |
| `admin_notices` | action | eventon-rsvp.php:53 | Shows "EventON not active" warning if core is missing |
| `init` | action | eventon-rsvp.php:60 | Main init: loads all includes, instantiates objects, registers CPT |
| `plugin_action_links_{slug}` | filter | eventon-rsvp.php:102 | Adds a "Settings" link to the plugin row in the plugins list |
| `wp` | action | eventon-rsvp.php:105 | Schedules the daily digest cron event if not already scheduled |
| `evors_daily_action` | action | eventon-rsvp.php:106 | Fires the daily digest email dispatch |
| `evo_load_event` | action | class-frontend.php:27 | Loads RSVP event data when the main EventON event card loads |
| `evo_addon_styles` | action | class-frontend.php:34 | Enqueues RSVP addon CSS through EventON's style pipeline |
| `eventon_eventCard_evorsvp` | filter | class-frontend.php:39 | Renders the RSVP section inside an event card |
| `eventon_eventcard_array` | filter | class-frontend.php:40 | Injects RSVP section identifier into the event card section array |
| `evo_eventcard_adds` | filter | class-frontend.php:41 | Adds RSVP box data to the event card extras array |
| `evo_eventtop_adds` | filter | class-frontend.php:44 | Adds RSVP box to the event-top extras array |
| `eventon_eventtop_evors` | filter | class-frontend.php:45 | Renders RSVP content in the event-top area |
| `eventon_eventtop_one` | filter | class-frontend.php:46 | Injects the RSVP section into the single event-top layout |
| `evo_register_other_styles_scripts` | action | class-frontend.php:50 | Registers RSVP JS/CSS assets with WordPress |
| `eventon_enqueue_styles` | action | class-frontend.php:51 | Enqueues RSVP CSS on frontend |
| `eventon_enqueue_scripts` | action | class-frontend.php:52 | Enqueues RSVP JS on frontend |
| `evo_frontend_lightbox` | filter | class-frontend.php:54 | Adds RSVP content to the event lightbox |
| `eventon_eventtop_abovetitle` | filter | class-frontend.php:57 | Injects RSVP count display above the event title in event-top |
| `evo_cal_eventtop_attrs` | filter | class-frontend.php:58 | Adds RSVP capacity data attributes to the event-top element |
| `evoau_form_fields` | filter | class-intergration-actionuser.php:11 | Adds RSVP field group to ActionUser's form field registry |
| `evoau_frontform_evors` | action | class-intergration-actionuser.php:15 | Renders RSVP fields inside the ActionUser frontend form |
| `evoau_save_formfields` | action | class-intergration-actionuser.php:16 | Saves RSVP meta when ActionUser form is saved |
| `evoau_frontend_scripts_enqueue` | action | class-intergration-actionuser.php:17 | Enqueues RSVP script in ActionUser context |
| `evoau_manager_row_title` | action | class-intergration-actionuser.php:20 | Adds "RSVP" column header to ActionUser event manager table |
| `evoau_manager_row` | action | class-intergration-actionuser.php:21 | Adds RSVP stats row to ActionUser event manager table |
| `evoau_event_manager_backlink_vars` | filter | class-intergration-actionuser.php:22 | Appends RSVP query vars to ActionUser manager back-link |
| `evoqr_checkin_otherdata_ar` | filter | class-intergration-qrcode.php:8 | Hook stub: passes RSVP data to QR Code addon checkin pipeline |
| `evo_webhook_triggers` | filter | class-intergration-webhooks.php:10 | Registers RSVP webhook trigger names in the EventON webhooks registry |
| `evo_webhooks_data` | filter | class-intergration-webhooks.php:11 | Registers RSVP webhook trigger field descriptions |
| `evors_new_rsvp_saved` | action | class-intergration-webhooks.php:13 | Fires outbound "new RSVP" webhook after a new RSVP is persisted |
| `evors_checkin_guest` | action | class-intergration-webhooks.php:14 | Fires outbound "status changed" webhook when checkin status is updated |
| `evo_editevent_vir_before_after_event` | action | class-intergration-virtual.php:14 | Adds Virtual+RSVP admin option fields in the event edit screen |
| `evo_editevent_vir_after_event_end` | action | class-intergration-virtual.php:15 | Adds "after event end" RSVP gate option for virtual events |
| `evovp_editevent_vir_pre_event_end` | action | class-intergration-virtual.php:16 | Adds "before event end" RSVP option for virtual-plus events |
| `evo_vir_initial_setup` | action | class-intergration-virtual.php:19 | Checks user RSVP status during virtual event initial setup |
| `evo_eventcard_vir_details_bool` | filter | class-intergration-virtual.php:20 | Controls whether virtual event details show based on RSVP status |
| `evo_eventcard_virtual_livenow_html` | filter | class-intergration-virtual.php:21 | Modifies "live now" HTML based on RSVP gating |
| `evo_eventcard_vir_after_details` | filter | class-intergration-virtual.php:22 | Injects RSVP-gated content after virtual event details |
| `evo_eventcard_virtual_after_content` | filter | class-intergration-virtual.php:23 | Adds RSVP-gated post-content to virtual event card |
| `evo_eventcard_vir_txt_cur` | filter | class-intergration-virtual.php:24 | Modifies virtual event "currently" text based on RSVP |
| `evovp_show_signin_box` | filter | class-intergration-virtual.php:27 | Controls sign-in box display based on RSVP status |
| `evovp_signin_user` | filter | class-intergration-virtual.php:28 | Hooks RSVP validation into virtual-plus sign-in flow |
| `evovp_eventcard_virtual_pre_content` | filter | class-intergration-virtual.php:29 | Injects RSVP status check before virtual-plus event content |
| `eventonrs_confirmation_email` | action | class-intergration-virtual.php:31 | Adds virtual event link section to confirmation email |
| `add_meta_boxes` | action | evo-rsvp_meta_boxes.php:17 | Registers all RSVP meta boxes on the event and RSVP CPT edit screens |
| `eventon_save_meta` | action | evo-rsvp_meta_boxes.php:18 | Saves RSVP event-level meta when an event post is saved |
| `save_post` | action | evo-rsvp_meta_boxes.php:19 | Saves RSVP CPT-level meta when an `evo-rsvp` post is saved |
| `evo_eventedit_pageload_data` | filter | evo-rsvp_meta_boxes.php:22 | Provides RSVP per-event settings data for the event edit AJAX load |
| `evo_eventedit_pageload_dom_ids` | filter | evo-rsvp_meta_boxes.php:23 | Provides RSVP DOM section IDs for the event edit AJAX load |
| `manage_edit-evo-rsvp_columns` | filter | class-admin-evo-rsvp.php:16 | Customises column headers in the `evo-rsvp` CPT list table |
| `manage_evo-rsvp_posts_custom_column` | action | class-admin-evo-rsvp.php:17 | Renders custom column values in the `evo-rsvp` list table |
| `request` | filter | class-admin-evo-rsvp.php:18 | Applies custom sort ordering to the `evo-rsvp` list table |
| `manage_edit-evo-rsvp_sortable_columns` | filter | class-admin-evo-rsvp.php:19 | Registers sortable columns for the `evo-rsvp` list table |
| `admin_init` | action | class-admin-evo-rsvp.php:21 | Registers admin scripts/styles for the `evo-rsvp` CPT list and edit screens, and wires up column, sort, and search handlers |
| `admin_init` | action | class-lang.php:9 | Bootstraps the RSVP language settings class; registers the language strings panel within EventON's settings |
| `admin_init` | action | class-settings.php:10 | Bootstraps the RSVP global settings class; registers the RSVP settings tab and its save handler |
| `pre_get_posts` | filter | class-admin-evo-rsvp.php:24, admin-init.php:76 | Extends search to query RSVP CPT attendee meta fields |
| `admin_menu` | action | admin-init.php:29 | Registers the RSVP submenu under the EventON admin menu |
| `wp_trash_post` | action | admin-init.php:32 | Decrements synced RSVP counts when an RSVP post is trashed |
| `publish_to_trash` | action | admin-init.php:33 | Same decrement on status transition to trash |
| `draft_to_trash` | action | admin-init.php:34 | Same decrement for draft→trash transition |
| `eventon_duplicate_product` | action | admin-init.php:38 | Resets RSVP counts when an event is duplicated |
| `eventon_duplicate_event_exclude_meta` | action | admin-init.php:39 | Excludes RSVP count meta keys from event duplication |
| `eventon_troubleshooter` | filter | admin-init.php:42 | Adds RSVP diagnostic data to the EventON troubleshooter panel |
| `eventon_custom_icons` | filter | admin-init.php:49 | Adds RSVP-specific icon to EventON icon picker |
| `eventon_eventcard_boxes` | filter | admin-init.php:52 | Registers the RSVP box in EventON's event card box ordering UI |
| `eventon_appearance_add` | filter | admin-init.php:22 | Adds RSVP colour/appearance fields to EventON's appearance settings |
| `eventon_inline_styles_array` | filter | admin-init.php:23 | Injects RSVP dynamic colour CSS variables |
| `evo_styles_primary_font` | filter | admin-init.php:24 | Passes primary font setting to RSVP CSS |
| `evo_styles_secondary_font` | filter | admin-init.php:25 | Passes secondary font setting to RSVP CSS |
| `eventon_settings_lang_tab_content` | filter | class-lang.php:13 | Adds RSVP language strings to the EventON language settings panel |
| `eventon_settings_tabs` | filter | class-settings.php:14 | Registers the "RSVP" tab in the EventON settings screen |
| `eventon_settings_tabs_evcal_rs` | action | class-settings.php:15 | Renders the RSVP settings tab content |
| `evo_frontend_lightbox` | filter | class-event-manager.php:15 | Adds the RSVP user manager section to the event lightbox |
| `eventon_shortcode_defaults` | filter | class-shortcode.php:20 | Adds RSVP-related default parameters to the main EventON shortcode |
| `eventon_shortcode_popup` | filter | class-shortcode.php:22 | Adds RSVP options to the EventON shortcode popup UI |
| `eventonau_language_fields` | filter | class-intergration-actionuser.php:30 | Adds RSVP language strings to ActionUser's language settings |

## Emitted Hooks (plugin fires for third parties)

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evors_new_rsvp_saved` | action | class-event_rsvp.php:900 | Fired after a new RSVP CPT post is fully saved and emails sent; passes rsvp ID, args array, `EVO_RSVP_CPT`, and `EVORS_Event` |
| `evors_rsvp_updated` | action | class-event_rsvp.php:1003 | Fired after an existing RSVP is updated |
| `evors_before_sync_query` | action | class-event_rsvp.php:1058 | Fired before the RSVP count sync query runs |
| `evors_checkin_guest` | action | class-ajax.php:73 | Fired after a checkin status is changed; passes RSVP ID, new status, and CPT object |
| `evors_after_rsvp_data_processed` | action | class-ajax.php:350 | Fired after the main RSVP form AJAX processes; passes status, RSVP ID, EVORS_Event, post array, and old status |
| `evors_after_rsvp_data_processed_eventtop` | action | class-ajax.php:174 | Same as above but for the event-top quick-RSVP path |
| `evors_newuser_email_before` | action | class-emailing.php:96 | Fired just before the new-user email is sent |
| `evors_confirmation_email_before` | action | class-emailing.php:110 | Fired just before the confirmation email is sent |
| `evors_load_event` | action | class-frontend.php:82 | Fired when the RSVP frontend loads a new event; passes EVORS_Event, CPT object, and frontend instance |
| `evors_evc_first_load` | action | class-frontend.php:369 | Fired on first render of the RSVP event card section |
| `evors_eventcard_after_subtitle` | action | class-frontend.php:452 | Fired after the subtitle section in the RSVP event card |
| `evors_eventcard_notshow_content` | action | class-frontend.php:465; class-ajax.php:193 | Fired when RSVP content is suppressed by a filter |
| `evors_eventcard_before_usertext` | action | class-frontend.php:487 | Fired before the user's RSVP status text in the event card |
| `evors_eventcard_after_usertext` | action | class-frontend.php:500 | Fired after the user's RSVP status text |
| `evors_eventcard_after_choices_title` | action | class-frontend.php:665, 686 | Fired after the RSVP choice buttons title area |
| `evors_eventcard_end_rsvp` | action | class-frontend.php:572 | Fired at the end of the RSVP event card section |
| `evors_eventcard_before_guestlist` | action | class-frontend.php:788 | Fired before the guest list is rendered |
| `evors_before_form` | action | class-form.php:154 | Fired before the RSVP form is output |
| `evors_form_under_subtitle` | action | class-form.php:179 | Fired after the form subtitle, before fields |
| `evors_after_form` | action | class-form.php:386 | Fired after all RSVP form fields are output |
| `evors_additional_field_{type}` | action | class-form.php:368; evo-rsvp_meta_boxes.php:442 | Fired for rendering custom additional field types |
| `evors_form_success_msg_updated_rsvp` | action | class-form.php:581 | Fired inside the RSVP update success message |
| `evors_form_success_msg_end` | action | class-form.php:633 | Fired at the end of the RSVP success message |
| `evoRS_add_meta_boxes` | action | evo-rsvp_meta_boxes.php:39 | Pluggable hook for third parties to add their own meta boxes to the RSVP screens |
| `evors_rsvppost_confirmation_end` | action | evo-rsvp_meta_boxes.php:185 | Fired at the end of the RSVP CPT confirmation meta box |
| `evors_admin_rsvp_cpt_checkinstatus` | action | evo-rsvp_meta_boxes.php:316 | Fired inside the RSVP CPT admin edit screen checkin status area |
| `eventonrs_rsvp_post_table` | action | evo-rsvp_meta_boxes.php:469 | Fired inside the RSVP post meta table in admin edit |
| `evors_save_other_metadata` | action | evo-rsvp_meta_boxes.php:521 | Fired after RSVP CPT meta is saved; allows extra meta fields to be saved |
| `evors_admin_rsvp_event_options_before` | action | metabox-content_event.php:16 | Fired before RSVP event options are rendered in the event edit meta box |
| `evors_admin_eventedit_stats_end` | action | metabox-content_event.php:50 | Fired at end of RSVP stats section in event edit |
| `evors_admin_eventedit_statbar_end` | action | metabox-content_event.php:60 | Fired at end of the RSVP stat bar in event edit |
| `evors_admin_before_settings` | action | metabox-content_event.php:89 | Fired before RSVP per-event settings fields are rendered |
| `evors_event_metafields` | action | metabox-content_event.php:90 | Fired to render RSVP event meta fields; allows extensions to add fields |
| `evors_admin_cpt_column_rsvp_` | action | class-admin-evo-rsvp.php:244 | Fired inside each RSVP CPT list column; allows appending to column output |
| `evors_rsvp_post_rsvp_column` | action | class-admin-evo-rsvp.php:250 | Fired for the RSVP status column in the list table |
| `evors_enqueue_admin_scripts` | action | admin-init.php:115 | Fired when RSVP admin scripts are enqueued |
| `evors_au_eventmanager_statbox` | action | class-intergration-actionuser.php:286 | Fired inside ActionUser event manager stats box |
| `evors_au_eventmanager_bar` | action | class-intergration-actionuser.php:300 | Fired inside ActionUser event manager bar area |
| `evors_au_eventmanager_stats` | action | class-intergration-actionuser.php:312 | Fired inside ActionUser event manager stats section |
| `evors_au_eventmanager_attendees_end` | action | class-intergration-actionuser.php:402 | Fired at the end of ActionUser attendee list section |
| `evors_attendees_csv_field_{field}` | action | class-functions.php:131 | Fired for each CSV column; allows custom columns to be written |
| `evors_notification_email_top` | action | templates/notification_email.php:64 | Fired at the top of the admin notification email body |
| `evors_admin_notification_{notice_type}` | action | templates/notification_email.php:71 | Fired inside the notification email body for specific notice types |
| `evors_attendee_notification_{notice_type}` | action | templates/attendee_notification_email.php:47 | Fired inside the attendee notification email body for specific notice types |
| `eventonrs_confirmation_email` | action | templates/confirmation_email.php:144 | Fired near the end of the confirmation email; Virtual Events uses this to inject the virtual link |

### Key Filters Emitted

| Hook name | Type | Source file:line | Purpose |
|---|---|---|---|
| `evors_remain_rsvp_output` | filter | class-event_rsvp.php:161 | Allows overriding the computed remaining capacity value |
| `evors_guest_list_metaquery` | filter | class-event_rsvp.php:332 | Allows modifying the WP_Query meta_query used to fetch the guest list |
| `evors_rsvp_byauthor` | filter | class-event_rsvp.php:462 | Short-circuits the default author-based RSVP lookup |
| `evors_new_rsvp_before_save` | filter | class-event_rsvp.php:758 | Allows modifying the RSVP args array before any meta is written |
| `evors_saversvp_meta_array` | filter | class-event_rsvp.php:764 | Allows adding extra field keys to be saved from the submission |
| `evors_admin_notification_args` | filter | class-event_rsvp.php:893 | Allows modifying the email args before the admin notification is sent |
| `evors_sync_after_query` | filter | class-event_rsvp.php:1100 | Allows modifying the synced count after the RSVP count query |
| `evors_rsvp_updated_before` | filter | class-event_rsvp.php:953 | Allows blocking an RSVP update before it is written |
| `evors_rsvp_submit_pre_validation` | filter | class-ajax.php:285 | Allows blocking form submission before standard validation runs |
| `evors_rsvp_submit_pre_validation_eventtop` | filter | class-ajax.php:154 | Same for the event-top quick-RSVP path |
| `evors_updatersvp_n_to_y` | filter | class-ajax.php:310 | Allows overriding the capacity check when changing RSVP from No to Yes |
| `evors_eventcard_content_show` | filter | class-ajax.php:188; class-frontend.php:458 | Allows suppressing RSVP content in the event card |
| `evors_beforesend_email_data` | filter | class-emailing.php:225 | Final filter on the complete email data array before dispatch |
| `evors_attendees_csv` | filter | class-functions.php:45 | Allows modifying or extending CSV column definitions |
| `evors_form_rsvp_type` | filter | class-form.php:66 | Allows overriding RSVP type (normal/waitlist/invitee) for a given submission |
| `evors_rsvp_form_args` | filter | class-form.php:111 | Allows modifying form display arguments |
| `evors_form_hidden_values` | filter | class-form.php:128 | Allows adding hidden fields to the RSVP form |
| `evors_form_event_title` | filter | class-form.php:164 | Allows overriding the event title displayed in the form |
| `evors_form_event_subtitle` | filter | class-form.php:173 | Allows overriding the subtitle displayed in the form |
| `evors_form_fields_array` | filter | class-form.php:480 | Allows modifying the full list of fields rendered in the form |
| `evors_rsvp_form_message` | filter | class-form.php:559 | Allows suppressing or replacing the post-submit message |
| `evors_form_success_msg_header` | filter | class-form.php:570 | Allows customising the success message header text |
| `evors_form_messages` | filter | class-frontend.php:845 | Allows modifying all RSVP form message strings |
| `evors_field_count` | filter | class-frontend.php:33 | Allows changing the maximum number of additional form fields (default 5) |
| `evors_eventtop_show_content` | filter | class-frontend.php:139 | Allows hiding the RSVP event-top section |
| `evors_user_existing_rsvp_status` | filter | class-frontend.php:179 | Allows overriding the displayed existing RSVP status for a user |
| `evors_eventtop_count_html` | filter | class-frontend.php:289 | Allows modifying the RSVP count HTML in the event-top area |
| `evors_eventtop_above_title` | filter | class-frontend.php:322 | Allows modifying RSVP content shown above the event title |
| `evors_eventcard_before_rsvp` | filter | class-frontend.php:401 | Allows hiding the RSVP block in the event card |
| `evors_eventcard_show_subtitle` | filter | class-frontend.php:441 | Allows controlling subtitle visibility in the event card |
| `evors_evc_user_rsvp_txt` | filter | class-frontend.php:498 | Allows modifying the text shown to a user who has already RSVPed |
| `evors_rsvp_choice_btns_evc` | filter | class-frontend.php:509 | Allows modifying the RSVP choice button HTML |
| `evors_eventcard_change_rsvp` | filter | class-frontend.php:542 | Allows controlling whether the "change RSVP" button appears |
| `evors_eventcard_show_remaining_rsvp_section` | filter | class-frontend.php:742 | Allows hiding the remaining spots section |
| `evors_eventcard_html_srem` | filter | class-frontend.php:760 | Allows modifying the remaining-spots HTML |
| `evors_guestlist_guest` | filter | class-frontend.php:917 | Allows modifying the HTML for each guest in the guest list |
| `evors_checking_status_text_ar` | filter | class-frontend.php:1050 | Allows modifying the checkin status label text array |
| `evors_eventcard_selection_data_array` | filter | class-frontend.php:603 | Allows modifying the JSON data array sent to the event card JS |
| `evors_eventedit_fields_array` | filter | view-event_settings.php:342 | Allows modifying the per-event RSVP settings fields array |
| `evors_event_metafield_names` | filter | evo-rsvp_meta_boxes.php:567 | Allows adding extra event meta field keys to be saved on event save |
| `evors_appearance_settings` | filter | admin-init.php:198 | Allows modifying the RSVP appearance settings array |
| `evors_settings_fields` | filter | class-settings.php:45 | Allows modifying the RSVP global settings fields array |
| `evors_additional_field_types` | filter | class-settings.php:345 | Allows registering additional RSVP form field types |
| `evors_lang_ar` | filter | class-lang.php:211 | Allows modifying the RSVP language strings array |
| `evors_email_attendees_emailing_type` | filter | class-admin-ajax.php:480 | Allows adding email types to the admin bulk-email form |
| `evors_email_attendees_attedee_status` | filter | class-admin-ajax.php:490 | Allows adding attendee status filters to admin bulk-email form |
| `evors_email_someone_fields` | filter | class-admin-ajax.php:587 | Allows modifying the "email someone" form fields |
| `evors_email_attendees_emails_array` | filter | class-admin-ajax.php:646 | Allows modifying the final list of recipient addresses for bulk email |
| `evors_attendee_nofitication_email_data` | filter | templates/attendee_notification_email.php:67 | Allows modifying the data array embedded in the attendee notification email |
| `evors_preview_email_arg` | filter | evo-rsvp_meta_boxes.php:213 | Allows modifying email args used for the admin email preview |
| `evors_admin_cpt_column_rsvp_status` | filter | class-admin-evo-rsvp.php:208 | Allows modifying the displayed checkin status in the list table |
| `eventon_register_post_type_rsvp` | filter | eventon-rsvp.php:151 | Allows modifying the `evo-rsvp` post type registration arguments |
| `evors_change_rsvp_hide_times` | filter | class-settings.php:290 | Allows modifying the "hide change RSVP at" time options |

## AJAX Actions

| Action name | Auth required | Source file:line | Purpose |
|---|---|---|---|
| `the_ajax_evors_a7` | public + logged-in | class-ajax.php:20 | Saves a new RSVP from the event-top quick-RSVP path; requires login check internally |
| `evors_get_rsvp_form` | public (both) | class-ajax.php:22 | Returns the rendered RSVP form HTML for a given event |
| `evors_find_rsvp_form` | public (both) | class-ajax.php:23 | Looks up an existing RSVP by email and returns the pre-filled update form |
| `the_ajax_evors` | public (both) | class-ajax.php:24 | Saves a new or updated RSVP; main form submission handler |
| `the_ajax_evors_f4` | logged-in only | class-ajax.php:32 | Updates checkin/check-out status for an attendee |
| `the_ajax_evors_a10` | logged-in only | class-ajax.php:33 | Updates the user RSVP manager (re-fetches user's event list) |
| `the_ajax_evors_f3` | logged-in only | class-ajax.php:34 | Generates and streams a CSV export of event attendees |
| `evors_ajax_get_auem_stats` | public (both) | class-intergration-actionuser.php:25 | Returns RSVP stats for the ActionUser event manager panel |
| `the_ajax_evors_a1` | admin (wp_ajax only) | class-admin-ajax.php:12 | Retrieves the attendee list for an event (admin panel) |
| `the_ajax_evors_a2` | admin | class-admin-ajax.php:13 | Triggers manual sync of RSVP counts for an event |
| `the_ajax_evors_a5` | admin | class-admin-ajax.php:14 | Resends a confirmation/notification email to a specific attendee |
| `the_ajax_evors_a6` | admin | class-admin-ajax.php:15 | Sends a custom confirmation email from admin |
| `the_ajax_evors_a8` | admin | class-admin-ajax.php:16 | Returns the admin bulk-email form UI |
| `the_ajax_evors_a9` | admin | class-admin-ajax.php:17 | Sends bulk email to a filtered set of event attendees |
| `evorsadmin_attendee_info` | admin | class-admin-ajax.php:18 | Returns the lightbox detail view for a single attendee |
| `evors_get_event_rsvp_settings` | admin | class-admin-ajax.php:19 | Returns per-event RSVP settings HTML for the settings lightbox |
| `evors_save_event_rsvp_settings` | admin | class-admin-ajax.php:20 | Saves per-event RSVP settings from the settings lightbox |
| `evors_email_preview` | admin | class-admin-ajax.php:21 | Renders an email template preview in the admin |

Note: Admin actions use `wp_ajax_nopriv_` in class-admin-ajax.php (lines 24–25) which is unusual — these should be admin-only in most implementations but nonce verification is relied on for security.

## REST Routes

No `register_rest_route` calls found.

## Shortcodes

| Shortcode | Source file:line | Purpose |
|---|---|---|
| `[evo_rsvp_manager]` | class-shortcode.php:21 | Renders the logged-in user's personal RSVP manager page listing their RSVPed events |
