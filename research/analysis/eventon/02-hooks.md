# EventON 4.8 — Hooks Reference

---

## Actions Fired by Core (`do_action`)

### Lifecycle
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `eventon_init` | `class-eventon.php:~195` | — | After all core objects initialised on `init` |
| `eventon_activate` | `class-eventon.php:~212` | — | Plugin activation (via `register_activation_hook`) |
| `eventon_deactivate` | `class-eventon.php:~220` | — | Plugin deactivation |
| `evo_addon_version_change` | `class-evo-addons.php:~45` | `$version` | When an add-on's stored version differs from installed version |

### Calendar Rendering
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `eventon_cal_variable_action` | `class-calendar_generator.php:~2310` | `$shortcode_args` | Before calendar generation begins |
| `eventon_cal_variable_action_au` | `class-calendar_generator.php` | `$shortcode_args` | AJAX calendar update |
| `eventon_cal_end` | `class-calendar_generator.php:~2330` | — | After full calendar HTML generated |
| `eventon_below_sorts` | `class-calendar-body.php` | `$args, $cal` | Below sorting/filter bar in calendar header |
| `eventon_calendar_header_content` | `class-calendar-body.php` | `$args` | Inside calendar header |
| `eventon_calendar_header_end` | `class-calendar-body.php` | `$args` | End of calendar header |
| `evo_cal_footer` | `class-calendar-body.php` | `$args` | Calendar footer |
| `evo_cal_after_footer` | `class-calendar-body.php` | `$args` | After calendar footer |
| `evo_cal_main_btns_end` | `class-calendar-body.php` | `$args` | End of main calendar buttons |
| `evo_ajax_cal_before` | `class-evo-ajax.php:~145` | `$PP` | Before processing AJAX calendar request |
| `evo_ajax_cal_before_rangeset` | `class-evo-ajax.php` | `$PP` | Before date range is set in AJAX |
| `evo_filter_begin` | `class-calendar-filtering.php` | — | Start of filter processing |
| `evo_filter_container_before` | `class-calendar-filtering.php` | — | Before filter container HTML |
| `evo_filter_container_after` | `class-calendar-filtering.php` | — | After filter container HTML |
| `evo_filter_container_in_after` | `class-calendar-filtering.php` | — | After inner filter container |
| `eventon_sorting_filters` | `class-calendar-body.php` | `$args` | Sorting/filter UI section |
| `eventon_after_loadbar` | `class-calendar-body.php` | — | After loading bar |

### Event Card / Event Top
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `eventon_eventcard_event_details` | `class-calendar-event-structure.php` | `$object, $EVENT` | Inside event card details area |
| `evo_eventcard_ftimage_before_gal` | `class-calendar-event-structure.php` | `$object, $EVENT` | Before featured image gallery |
| `evo_eventcard_ftimage_gal_1` | `class-calendar-event-structure.php` | `$object, $EVENT` | Inside featured image gallery slot 1 |
| `evo_eventcard_ftimg_end` | `class-calendar-event-structure.php` | `$object, $EVENT` | End of featured image section |
| `evo_more_images_before_btn` | `class-calendar-event-structure.php` | `$object` | Before "more images" button |
| `evo_more_images_end` | `class-calendar-event-structure.php` | `$object` | End of extra images section |
| `evo_eventcard_vir_after_details` | `class-calendar-event-structure.php` | `$object, $EVENT` | After virtual event details |
| `evo_eventcard_vir_modbox_end` | `class-calendar-event-structure.php` | `$object, $EVENT` | End of virtual event modal box |
| `evo_vir_before_main_content` | `includes/calendar/views/eventcard_virtual.php` | `$object, $EVENT` | Before virtual event main content |
| `evo_vir_initial_setup` | `includes/calendar/views/eventcard_virtual.php` | `$object` | Initial setup for virtual event display |
| `evo_load_event` | `class-evo-ajax.php:~440` | `$EVENT` | When a single event's AJAX data is loaded |

### Admin — Event Edit
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `eventon_add_meta_boxes` | `post_types/class-meta_boxes.php:~70` | `$EVENT` | Register additional metaboxes for `ajde_events` |
| `eventon_save_meta` | `post_types/class-meta_boxes.php:~490` | `$fields_ar, $post_id, $EVENT, $post_data` | After core event meta is saved |
| `eventon_event_submitbox_misc_actions` | `post_types/class-meta_boxes.php:~155` | `$event` | In event options side metabox |
| `evo_eventedit_repeat_metabox_top` | `post_types/class-meta_boxes-timedate.php` | `$EVENT` | Top of repeat settings metabox section |
| `evo_eveitedit_repeat_after` | `post_types/class-meta_boxes-timedate.php` | `$EVENT` | After repeat gap/number fields |
| `evo_admin_event_only_page` | `admin/class-evo-admin.php:~91` | `$page, $post, $postType` | On event-only admin pages |
| `eventon_admin_settings_pageonly_init` | `admin/class-evo-admin.php:~114` | — | On EventON settings page init |
| `eventon_admin_post_script` | `admin/class-evo-admin.php:~280` | — | After admin post scripts |
| `evo_admin_all_wp_admin_scripts` | `admin/class-evo-admin.php:~357` | — | On all WP admin pages |
| `evo_organizer_add_term_fields` | `admin/class-admin-taxonomies.php` | `$term_id` | When adding organizer term fields |
| `evo_organizer_edit_term_fields` | `admin/class-admin-taxonomies.php` | `$term_id` | When editing organizer term fields |
| `evo_tax_save_each_field` | `admin/class-admin-taxonomies.php` | `$term_id, $field` | When saving each taxonomy field |
| `evo_bulk_and_quick_edit` | `post_types/ajde_events.php` | — | In bulk/quick edit context |

### Admin — Settings
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `evo_admin_settings_header_right` | `admin/settings/class-settings.php:~123` | — | Right side of settings header |
| `evo_before_settings_saved` | `admin/settings/class-settings.php:~218` | `$focus_tab, $current_section, $evcal_options` | Before settings are saved |
| `evo_after_settings_saved` | `admin/settings/class-settings.php:~255` | `$focus_tab, $current_section, $evcal_options` | After settings are saved |
| `eventon_settings_tabs_{tab_id}` | `admin/settings/class-settings-content.php:~145` | — | Render content for named settings tab |

### Frontend — Scripts/Styles
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `eventon_enqueue_scripts` | `class-frontend.php:~441` | — | After core scripts enqueued |
| `eventon_enqueue_styles` | `class-frontend.php:~461` | — | After core styles enqueued |
| `evo_register_other_styles_scripts` | `class-frontend.php:~318` | — | Register (not enqueue) assets |
| `evo_loaded_scripts_styles` | `class-frontend.php:~415` | — | After all scripts/styles loaded |
| `eventon_page_inline_styles_scripts` | `class-frontend.php:~397` | — | Inline scripts/styles on event pages |
| `evo_addon_styles` | `class-frontend.php` | — | Print add-on inline styles |

### Page / Footer
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `evo_page_footer` | `class-frontend.php:~791` | — | Footer action for event pages |
| `eventon_after_widget` | `class-evo-wp-widgets.php` | `$args` | After widget output |
| `eventon_before_widget` | `class-evo-wp-widgets.php` | `$args` | Before widget output |
| `eventon_after_widget_SC` | `class-evo-wp-widgets.php` | `$args` | After widget shortcode |
| `eventon_before_widget_SC` | `class-evo-wp-widgets.php` | `$args` | Before widget shortcode |

### Cron / System
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `evo_create_cron_jobs` | `class-cronjobs.php` | — | When cron jobs are set up |
| `eventon_register_post_type` | `class-evo-post-types.php` | — | Before CPT registration |
| `eventon_register_taxonomy` | `class-evo-post-types.php` | — | Before taxonomy registration |
| `eventon_updated` | `class-evo-install.php` | — | After plugin update routine |
| `eventon_duplicate_product` | `integration/class-intergration-general.php` | `$new_id, $old_id` | After event duplicated |
| `evo_after_duplicate_event` | `admin/post_types/duplicate_event.php` | `$new_id, $old_id` | After event post duplicated |
| `evo_before_trashing_event` | `post_types/ajde_events.php` | `$post_id` | Before event moved to trash |
| `evo_after_trashing_event` | `post_types/ajde_events.php` | `$post_id` | After event moved to trash |

### ICS / Export
| Hook | File:Line | Arguments | When |
|------|-----------|-----------|------|
| `evo_event_ics_content` | `class-event.php:~1751` | `$EVENT` | When generating ICS file content |
| `evo_save_settings` | `admin/settings/class-settings.php` | (legacy, commented out) | Deprecated save hook |

### Dynamic hooks (patterns)
| Pattern | Arguments | Purpose |
|---------|-----------|---------|
| `evo_ajax_{action}` | varies | AJAX action dispatch; `$action` = `$_POST['action']` value |
| `eventon_event_sorting_{sort_by}` | `$events_array` | Custom event sorting implementation |
| `evo_temp_{type}` | — | Template type init |
| `ajde_shortcode_box_interpret_{type}` | `$var, $guide` | Shortcode box field type renderer |

---

## Filters Applied by Core (`apply_filters`)

### Event Data
| Filter | File:Line | Default | Purpose |
|--------|-----------|---------|---------|
| `evodata_title` | `class-event.php:131` | `$post_title` | Event title |
| `evodata_subtitle` | `class-event.php:135` | `$evcal_subtitle` | Event subtitle |
| `evodata_event_status` | `class-event.php:967` | `$_status` | Event status string |
| `evodata_event_status_reason` | `class-event.php:989` | `$reason` | Status reason text |
| `evodata_featured` | `class-event.php:960` | `bool` | Is event featured |
| `evodata_completed` | `class-event.php:960` | `bool` | Is event completed |
| `evodata_vir_live` | `class-event.php:291` | `bool` | Is virtual event live now |
| `evodata_vir_url` | `class-event.php:1021` | `$_vir_url` | Virtual event URL |
| `evodata_vir_pass` | `class-event.php:1024` | `$_vir_pass` | Virtual event password |
| `evodata_vir_ended` | `class-event.php:1108` | `bool` | Has virtual event ended |
| `evodata_hex` | `class-event.php:1513` | `$evcal_event_color` | Event colour hex |
| `evodata_image` | `class-event.php:1529` | `$attachment_id` | Event featured image ID |
| `evodata_image_sizes` | `class-event.php:1545` | `array` | Image size breakpoints |
| `evodata_custom_data` | `class-event.php:1581` | `array` | Custom event data object |
| `evodata_location_term` | `class-event.php:1287` | `$term_id` | Location taxonomy term |
| `evodata_organizer_term` | `class-event.php:1392` | `$term_id` | Organizer taxonomy term |
| `evo_event_permalink` | `class-event.php:122` | `$url` | Event permalink URL |
| `evosin_evodata_vals` | `class-event.php:1602` | `array` | Single event JS data values |
| `evo_single_event_data_return` | `class-event.php` | `array` | Final single event data |
| `evo_single_evodata_vals` | `class-event.php:1590` | `array` | Single-page event data |

### Post Type & Taxonomy Registration
| Filter | Default | Purpose |
|--------|---------|---------|
| `eventon_register_post_type_ajde_events` | `array` | Args for CPT registration |
| `eventon_event_slug` | `['slug'=>$slug]` | Event URL slug |
| `eventon_event_post_supports` | `array` | Supported post features |
| `eventon_taxonomy_args_event_location` | `array` | Location taxonomy registration args |
| `eventon_taxonomy_args_event_organizer` | `array` | Organizer taxonomy registration args |
| `eventon_taxonomy_args_event_type` | `array` | Event type taxonomy args |
| `eventon_taxonomy_objects_event_location` | `['ajde_events']` | Post types for location taxonomy |
| `eventon_taxonomy_objects_event_organizer` | `['ajde_events']` | Post types for organizer taxonomy |
| `eventon_taxonomy_objects_event_type` | `['ajde_events']` | Post types for event type taxonomy |
| `evotax_slug_loc` | `['slug'=>'event-location']` | Location taxonomy slug |
| `evotax_slug_org` | `['slug'=>'event-organizer']` | Organizer taxonomy slug |
| `eventon_extra_tax` | `array` | Additional custom taxonomies |

### Metabox & Save
| Filter | Default | Purpose |
|--------|---------|---------|
| `eventon_event_metafields` | `array` | List of postmeta keys to save on event save |
| `evo_event_metafields_htmlcontent` | `['evcal_subtitle']` | Fields that may contain HTML |
| `evo_eventedit_pageload_data` | `array` | AJAX-loaded metabox HTML by key |
| `evo_eventedit_pageload_dom_ids` | `array` | DOM IDs for metabox sections |
| `eventon_event_metaboxs` | `array` | All metabox section definitions |
| `eventon_quick_save_fields` | `array` | Fields for quick-edit save |
| `evo_quick_edit_event_add_fields` | `array` | Add quick-edit fields |
| `eventon_event_date_metafields` | `array` | Date-related meta field names |
| `eventon_duplicate_event_exclude_meta` | `array` | Meta keys to exclude when duplicating |

### Settings
| Filter | Default | Purpose |
|--------|---------|---------|
| `eventon_settings_tabs` | `array` | Settings page tab list (id → label) |
| `eventon_settings_tab1_arr_content` | `array` | Full tab 1 content sections array |
| `eventon_settings_general` | `array` | General settings fields |
| `eventon_settings_time` | `array` | Time settings fields |
| `eventon_settings_3rdparty` | `array` | Third-party API settings fields |
| `evo_settings_advanced` | `array` | Advanced settings fields |
| `eventon_custom_icons` | `array` | Custom icon fields |
| `evo_sr_setting_fields` | `array` | Single event / shareable settings |
| `evo_se_setting_fields` | `array` | Schedule event settings |
| `evo_se_social_media` | `array` | Social media share settings |
| `eventon_settings_lang_tab_content` | `array` | Language tab extra content |
| `evo_save_settings_optionvals` | `$evcal_options` | Option values before DB write |
| `evo_settings_non_san_fields` | `array` | Fields that skip sanitisation |
| `evo_settings_html_fields` | `array` | Fields that may contain HTML |
| `eventon_appearance_add` | `array` | Appearance settings fields |
| `eventon_inline_styles_array` | `array` | Dynamic CSS property definitions |
| `evo_addons_details_list` | `array` | Add-on marketplace listing |

### Calendar / Shortcode
| Filter | Default | Purpose |
|--------|---------|---------|
| `eventon_shortcode_defaults` | `array` | Default shortcode attribute values |
| `eventon_shortcode_popup` | `array` | Shortcode generator popup fields |
| `eventon_ajax_arguments` | `$SC` | Calendar AJAX shortcode args |
| `evo_ajax_wparg_additions` | `array` | Extra WP_Query args for AJAX |
| `evo_init_ajax_data` | `array` | Initial AJAX response data |
| `evo_init_ajax_cals` | `$CALS` | Calendars in initial AJAX |
| `evo_ajax_query_returns` | `array` | AJAX query return data |
| `evo_ajax_general_send_results` | `array` | General AJAX response |
| `evo_ajax_refresh_elm` | `$html` | HTML for individual refreshed element |
| `evo_ajax_refresh_event_elms` | `array` | All elements for a refreshed event |
| `eventon_wp_query_args` | `$query_args` | WP_Query args before event fetch |
| `eventon_wp_queried_events_list` | `$events` | Event list after WP_Query |
| `evo_calendar_defaults` | `array` | Calendar defaults JS object |
| `evo_global_data` | `array` | Global JS data passed to page |
| `evo_init_templates` | `array` | Template init data |
| `eventon_process_after_shortcodes` | `$content` | After shortcode processing |
| `evo_view_switcher_items` | `array` | View switcher button items |
| `eventon_all_filters` | `array` | All available calendar filter options |
| `eventon_so_filters` | `array` | Sort-only filter options |
| `eventon_events_list_classnames` | `array` | CSS classes for events list |
| `eventon_cal_class` | `string` | CSS class for calendar container |
| `eventon_cal_jqdata` | `array` | jQuery data attributes for calendar |
| `evo_sc_keys_assoc` | `array` | Shortcode key associations |
| `eventon_jumper_years_count` | `int` | Number of years in date jumper |

### Event Card / Eventtop
| Filter | Default | Purpose |
|--------|---------|---------|
| `eventon_eventcard_array` | `array` | Ordered array of event card section names |
| `eventon_eventcard_boxes` | `array` | Box names for event card |
| `eventon_eventCard_{box_name}` | `''` | HTML for named event card box |
| `eventon_eventtop_{field}` | `''` | HTML for named eventtop field |
| `eventon_eventtop_abovetitle` | `''` | HTML above event title |
| `eventon_eventtop_abovetitle_tags` | `array` | Tags shown above title |
| `eventon_eventtop_maintitle` | `$title` | Event main title HTML |
| `eventon_eventtop_subtitle` | `$subtitle` | Event subtitle HTML |
| `eventon_eventtop_html` | `$html` | Full eventtop HTML |
| `eventon_eventtop_image_url` | `$url` | Eventtop image URL |
| `evo_eventtop_adds` | `array` | Additional eventtop items |
| `evo_eventcard_adds` | `array` | Additional eventcard items |
| `evo_cal_eventtop_attrs` | `array` | Eventtop HTML attributes |
| `eventon_event_cal_short_info_line` | `$html` | Short info line in calendar view |
| `eventon_eventcard_date_html` | `$html` | Date display HTML on event card |
| `eventon_evt_fe_time` | `$time_str` | Frontend time string |
| `eventon_event_title_editbtn` | `$html` | Edit button on event title |
| `eventon_event_type_value` | `$val` | Event type taxonomy value display |
| `evo_cal_above_header_btn` | `array` | Buttons above calendar header |
| `evo_frontend_lightbox` | `array` | Lightbox registrations |
| `evo_eventcard_vir_details_bool` | `bool` | Show virtual event details |
| `evo_eventcard_vir_modbox_end` | `$html` | Virtual event modbox end HTML |
| `eventon_eventtop_one` | `$html` | Single eventtop item |
| `evo_one_event_ux_val` | `$val` | UX value for single event |
| `evo_one_ftimage_data` | `array` | Single event featured image data |
| `evosin_evodata_vals` | `array` | Single event card JS values |

### Single Event Page / AJAX
| Filter | Default | Purpose |
|--------|---------|---------|
| `evo_single_event_content_data` | `array` | Content data for single event AJAX load |
| `evoajax_single_eventcard_data` | `array` | Single event card AJAX data |
| `evo_single_event_taxonomy_meta_array` | `array` | Taxonomy meta data for single event |
| `evo_single_process_sharable` | `array` | Shareable link data for single event |
| `evo_single_sharable` | `array` | Shareable settings |
| `evo_organizer_event_card` | `$html` | Organizer card HTML |

### Repeat Intervals
| Filter | Default | Purpose |
|--------|---------|---------|
| `evo_repeat_intervals` | `array` | Available repeat interval types |
| `evo_repeat_intervals_ly` | `array` | Repeat intervals for select element |
| `evo_repeats_admin_notice` | `''` | Important notice on repeat metabox |

### Scripts / Assets
| Filter | Default | Purpose |
|--------|---------|---------|
| `evo_load_scripts_topage` | `bool` | Whether to load scripts only on EVO pages |
| `evo_inline_script_jq` | `''` | Inline jQuery script additions |
| `eventon_script_add` | `array` | Additional scripts to register |
| `eventon_google_map_url` | `$url` | Google Maps embed URL |

### Taxonomy Display
| Filter | Default | Purpose |
|--------|---------|---------|
| `evodata_taxonomy_terms` | `$terms` | Terms for taxonomy display |
| `evo_location_archive_page_social` | `array` | Location social links |
| `evo_organizer_archive_page_social` | `array` | Organizer social links |
| `evo_tax_translated_names` | `array` | Translated taxonomy display names |
| `evo_taxonomy_form_fields_array` | `array` | Taxonomy term edit form fields |

### Miscellaneous
| Filter | Default | Purpose |
|--------|---------|---------|
| `evo_template_loader_files` | `array` | Template file paths to check |
| `evo_file_template_paths` | `array` | Template override path chain |
| `eventon_template_url` | `'eventon'` | Template subdirectory name |
| `evo_rtl_body_class` | `$classes` | RTL body classes |
| `evo_is_rest_api_request` | `bool` | Whether current request is REST |
| `evo_sanitize_html` | `$html` | Custom HTML sanitisation |
| `evo_sanitize_html_eventtop` | `$html` | Eventtop HTML sanitisation |
| `evo_map_styles_data` | `array` | Google Maps style definitions |
| `evo_learnmore_link` | `$url` | Learn more link |
| `eventon_create_pages` | `array` | Pages to create on activation |
| `eventon_core_capabilities` | `array` | Custom capability definitions |
| `eventon_get_path_define_tokens` | `array` | Path tokens for template resolution |
| `evo_heartbeat_received` | `$response` | Admin heartbeat response |
| `evo_heartbeat_received_nopriv` | `$response` | Non-privileged heartbeat |
| `evo_heartbeat_settings` | `$settings` | Heartbeat settings |
| `evo_facebook_header_metadata` | `$html` | Facebook OG metadata HTML |
| `evo_webhook_triggers` | `array` | Available webhook trigger names |
| `evo_webhooks_data` | `array` | Webhook payload data |
| `evo_lang_other_text` | `string` | Language additional text |
| `evo_lang_values_healthcare_guidelines` | `array` | Healthcare guideline lang values |
| `evo_lang_var_count` | `int` | Language variation count |
| `eventon_lang_variation` | `string` | Current language variation |
| `evo_schedule_cron` | `array` | Cron schedule data |
| `evo_export_events_csv_header` | `$header` | CSV export header row |
| `evo_export_events_csv_eventdata` | `$data` | CSV export event data row |
| `evo_export_events_csv_row` | `$row` | CSV export row before write |
| `evo_csv_export_fields` | `$fields` | Available CSV export fields |
| `evo_csv_export_dateformat` | `'m/d/Y'` | Date format in CSV export |
| `evo_csv_export_timeformat` | `'h:i:A'` | Time format in CSV export |
| `evo_ajax_rest_{action}` | `array` | REST API action handler (delegates to action-based routing) |

---

## Actions Core Listens On (`add_action`)

| WP Hook | Priority | Callback | Purpose |
|---------|---------|---------|---------|
| `init` | 0 | `EventON::init` | Initialise all core objects |
| `init` | 5 | `EVO_post_types::register_taxonomies` | Register taxonomies |
| `init` | 5 | `EVO_post_types::register_post_types` | Register CPTs |
| `widgets_init` | default | `EventON::register_widgets` | Load and register widgets |
| `after_setup_theme` | default | `EventON::setup_environment` | Post thumbnail support |
| `after_setup_theme` | 11 | `EventON::include_template_functions` | Load template functions |
| `init` | default | `EventON::template_controls` | Load template control file |
| `wp_loaded` | default | `EVO_Rest_API::nonce_gen` | Generate REST nonce |
| `rest_api_init` | default | `EVO_Rest_API::rest_routes` | Register REST routes |
| `add_meta_boxes` | default | `evo_event_metaboxes::metabox_init` | Register event metaboxes |
| `save_post` | 1 | `evo_event_metaboxes::eventon_save_meta_data` | Save event metadata |
| `wp_ajax_{action}` | default | `EVO_Ajax_Admin` | Admin AJAX handlers |
| `wp_ajax_nopriv_{action}` | default | `EVO_Ajax` | Non-privileged AJAX |

---

## Filters Core Registers (`add_filter`)

| WP Filter | Priority | Callback | Purpose |
|-----------|---------|---------|---------|
| `the_content` | default | `evo_frontend` | Process event content |
| `post_row_actions` | default | `ajde_events admin` | Add duplicate action to event list |
| `plugin_locale` | default | `load_plugin_textdomain` | Locale override |
| `evo_eventedit_pageload_data` | 10 | `evo_event_metaboxes::eventedit_pageload_data` | Load main metabox HTML |
| `evo_eventedit_pageload_dom_ids` | 12 | `evo_event_metaboxes::eventedit_domids` | Register main metabox DOM IDs |
| `body_class` | default | `evo_frontend` | Add RTL class |

---

## REST API Endpoints

| Namespace | Route | Method | Auth | Purpose |
|-----------|-------|--------|------|---------|
| `eventon/v1` | `/data` | `POST` | Public | Main calendar data endpoint; action routing via `evo-ajax` param → `apply_filters('evo_ajax_rest_{action}', ...)` |
| `evo-admin` | `/data` | `GET` | Public | Health check ("Howdy!!" response) |

All calendar AJAX uses the REST endpoint under `eventon/v1/data` with `evo-ajax` action routing. Frontend non-REST AJAX falls back to standard `wp-ajax.php` (`evo-ajax` query param, `nopriv` capable).

---

## Hooks Used by Add-ons (summary by add-on)

### eventon-rsvp
**Core hooks consumed:**
- `eventon_add_meta_boxes` — adds RSVP metabox to `ajde_events`
- `eventon_save_meta` — saves `evors_*` event settings
- `eventon_settings_tabs` — adds "RSVP" tab
- `eventon_settings_tabs_evcal_rs` — renders RSVP settings content
- `eventon_eventCard_evorsvp` — renders RSVP box on event card
- `eventon_eventcard_array` — registers `evorsvp` section name
- `evo_eventtop_adds` — adds RSVP indicator to eventtop
- `eventon_eventtop_evors` — RSVP eventtop content
- `evo_load_event` — hydrates RSVP data for event
- `eventon_enqueue_styles`, `eventon_enqueue_scripts` — RSVP assets
- `evo_frontend_lightbox` — RSVP lightbox form
- `evo_webhook_triggers` — adds `new_rsvp`, `checkin_guest` triggers
- `evo_webhooks_data` — merges RSVP webhook fields
- Virtual event hooks: `evo_editevent_vir_before_after_event`, `evo_eventcard_vir_details_bool`, etc.

**Hooks fired by RSVP add-on:**
- `evors_new_rsvp_saved($post_id, $event_id, $ri, $data)` — after new RSVP created
- `evors_checkin_guest($rsvp_id, $event_id, $data)` — after guest check-in
- `evors_event_metafields($fields, $post_id)` — filter event-level RSVP fields
- `evors_rsvp_choice_btns_evc($html, $rsvp, $event)` — RSVP choice buttons HTML
- `evors_save_other_metadata($post_id)` — after RSVP CPT meta saved
- `evoRS_add_meta_boxes` — for sub-add-ons to add more RSVP metaboxes
- `evors_rsvppost_confirmation_end($rsvp_post)` — end of RSVP CPT edit page
- `evors_daily_action` — scheduled daily digest email cron hook

### eventon-tickets
**Core hooks consumed:**
- `eventon_settings_tabs` — adds "Tickets" tab
- `eventon_settings_tabs_evcal_tx` — renders ticket settings
- `eventon_eventCard_evotx` — ticket purchase box on event card
- `eventon_eventcard_array`, `eventon_eventcard_boxes` — registers section
- `eventen_eventtop_abovetitle` — ticket availability indicator
- `evo_addon_styles` — ticket styles
- `eventon_enqueue_styles` — ticket frontend styles
- `evo_webhook_triggers`, `evo_webhooks_data` — ticket webhooks
- `evo_frontend_lightbox` — ticket lightbox
- Plus: WooCommerce hooks (cart, checkout, order, product)

**Hooks fired by Tickets add-on:**
- `evotx_order_with_tickets_created($order_id, $event_data)` — new order created
- `evotx_after_ticket_added_to_cart($event_id, $ticket_id, $qty, $cart_item_key)` — ticket in cart
- `evotx_adjust_orderitem_ticket_stockother(...)` — stock adjustment filter
- `evotx_activate` / `evotx_deactivate` — lifecycle hooks

### eventon-full-cal
**Core hooks consumed:**
- `eventon_shortcode_defaults`, `eventon_shortcode_popup` — adds FC shortcode params
- `eventon_ajax_arguments` — injects FC filter data into AJAX
- `evo_global_data`, `evo_init_ajax_data` — adds FC config to JS
- `evo_view_switcher_items` — registers "Full Calendar" view switch button
- `eventon_below_sorts` — loading indicator injection
- `eventon_cal_class`, `eventon_events_list_classnames` — FC CSS classes
- `eventon_appearance_add` — FC appearance settings
- `eventon_inline_styles_array` — FC dynamic styles
- `eventon_shortcode_popup` — adds FC shortcode generator fields

### eventon-slider
**Core hooks consumed:**
- `eventon_shortcode_defaults`, `eventon_shortcode_popup` — slider params
- `eventon_appearance_add`, `eventon_inline_styles_array` — slider appearance
- `eventon_cal_class` — slider CSS class

### eventon-weekly-view
**Core hooks consumed:**
- `eventon_shortcode_defaults`, `eventon_shortcode_popup` — weekly view params
- `evo_view_switcher_items` — registers week-view switch button
- `eventon_ajax_arguments` — weekly view AJAX parameters

### eventon-wishlist-add-on
**Core hooks consumed:**
- `eventon_eventcard_array` — registers `evowi` section
- `eventon_eventCard_evowi` — wishlist toggle button HTML
- `eventon_enqueue_scripts` — wishlist JS

### eventon-qrcode
**Core hooks consumed:**
- `eventon_eventcard_array` — registers QR section
- `eventen_eventCard_evoqr` — QR code box on event card
- Requires Tickets (`evotx`) and/or RSVP (`evors`)

### eventon-rsvp-events-waitlist
**Core hooks consumed:**
- `eventon_save_meta` — saves waitlist event settings
- `eventon_add_meta_boxes` — adds waitlist fields to event edit
- RSVP hooks: `evors_new_rsvp_saved`, `evoRS_add_meta_boxes`

### eventon-rsvp-invitees
**Core hooks consumed:**
- `eventon_add_meta_boxes` — adds invitee list to event edit
- `eventon_save_meta` — saves invitee list meta
- `eventon_eventCard_evorsi` — invitee status on event card
- RSVP hooks: RSVP form submission intercept

### eventon-ticket-variations-options
**Core hooks consumed:**
- Ticket hooks: `evotx_after_ticket_added_to_cart`, `evotx_adjust_orderitem_ticket_stockother`
- WooCommerce cart/order hooks for variation data

### eventon-csv-importer
**Core hooks consumed:**
- Admin hooks only; no frontend hooks
- Uses WP's `wp_insert_post` / `update_post_meta` directly
