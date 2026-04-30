---
plugin: The Events Calendar Pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P1 — Static Analysis
---

# 02 — Hooks & REST Endpoints: The Events Calendar Pro 7.4.5

All hooks are discovered via static analysis of `src/`. This is not an exhaustive list of every `add_action` / `add_filter` registration, but covers the public-facing extension surface (fired actions, applied filters) plus internal integration hooks.

---

## 1. REST API Endpoints

Namespace: `tec/v1` (defined by TEC base plugin; ECP registers additional routes within it).

### `GET /tec/v1/events/calendar-embed`

Registered in: `src/Tribe/Views/V2/Shortcodes/REST/V1/Calender_Embed.php`

Renders the `[tribe_events]` shortcode into a standalone iframe-ready HTML document. Used by the Calendar Embed Gutenberg block.

**Permission:** Must be logged-in with `edit_tribe_events` capability + valid `_wpnonce`.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `view` | string | View slug (month, list, day, photo, week, map, summary) |
| `category` | string (JSON) | Filter by event category |
| `exclude_category` | string (JSON) | Exclude event categories |
| `tag` | string (JSON) | Filter by tag |
| `exclude_tag` | string (JSON) | Exclude tags |
| `tax_operand` | string | `AND` or `OR` for category/tag intersection |
| `events_per_page` | int | Events per page |
| `month_events_per_day` | int | Max events shown per day cell (month view) |
| `featured` | bool | Filter to featured events only |
| `past` | bool | Show past events |
| `tribe_bar` | bool | Show the filter bar |
| `filter_bar` | bool | Show the APM Filter Bar widget |
| `date` | string | Start date for the view |
| `keyword` | string | Keyword search |
| `author` | int | Filter by author user ID |
| `organizer` | int | Filter by organizer post ID |
| `venue` | int | Filter by venue post ID |

**Filter:** `tec_events_pro_calendar_embed_rest_get_args` — modify the args array before shortcode render.

---

### `GET|DELETE /tec/v1/events/{id}/notices/occurrences`

Registered in: `src/Events_Pro/Custom_Tables/V1/REST/V1/Notices.php`

Manages editor notices about occurrence counts displayed in the Gutenberg block editor after saving a recurring event.

**Permission:** `is_user_logged_in`

**Path param:** `id` — post ID or provisional occurrence ID.

- `GET` — retrieves the pending notice message and clears it.
- `DELETE` — destroys the notice without returning it.

---

## 2. Actions Fired by ECP

These actions are fired (`do_action`) within ECP's own code. They are extension points for third-party code or other TEC plugins.

### Boot / Lifecycle

| Hook | When |
|---|---|
| `tec_events_pro_init` | After ECP main class initialises |
| `tec_events_pro_blog_deactivate` | On multisite site deactivation |
| `tec_events_pro_init_apm_filters` | When APM (Filter Bar) integration registers its filters |

### Recurrence

| Hook | When |
|---|---|
| `tribe_events_pro_recurrence_before_metabox` | Before the recurrence metabox renders (classic editor) |
| `tribe_events_pro_recurrence_after_metabox` | After the recurrence metabox renders |
| `tribe_events_pro_recurring_event_instance_inserted` | After a new recurrence occurrence is inserted |
| `tribe_events_pro_recurring_event_instance_updated` | After an existing recurrence occurrence is updated |
| `tribe_events_pro_recurring_event_save_after` | After the full recurrence save pipeline completes |
| `tribe_events_pro_pre_get_posts_recurrence` | During `pre_get_posts` when recurrence query filtering is applied |
| `tribe_events_pro_detect_recurrence_redirect` | When ECP checks whether to redirect a recurrence URL |

### CT1 — Custom Tables V1

| Hook | When |
|---|---|
| `tec_events_pro_custom_tables_v1_fully_activated` | After CT1 has fully activated in ECP context |
| `tec_events_pro_custom_tables_v1_editors_provider_registered` | After the CT1 editors provider is registered |
| `tec_events_pro_custom_tables_v1_before_duplicate_event` | Before an event is duplicated via CT1 |
| `tec_events_pro_custom_tables_v1_after_duplicate_event` | After an event is duplicated via CT1 |
| `tec_events_pro_custom_tables_v1_event_relationship_updated` | After a series–event relationship is updated |
| `tec_events_pro_custom_tables_v1_series_relationships_updated` | After the full set of series relationships is updated |
| `tec_events_pro_custom_tables_v1_series_relationships_after` | After series relationship write completes |
| `tec_custom_tables_v1_error` | On a CT1 error condition |
| `tec_events_custom_tables_v1_error` | On a CT1 events-specific error |

### Custom Fields / Meta

| Hook | When |
|---|---|
| `tribe_events_pro_before_custom_field_content` | Before custom (additional) field value is output |
| `tribe_events_pro_after_custom_field_content` | After custom (additional) field value is output |

### Virtual Events

| Hook | When |
|---|---|
| `tribe_events_virtual_add_event_properties` | After virtual event properties are attached to an event object |
| `tribe_events_virtual_block_content` | When virtual block content is rendered |
| `tribe_events_virtual_metabox_save` | After the virtual events metabox is saved |
| `tribe_events_virtual_update_post_meta` | After virtual event post-meta is updated |
| `tec_events_virtual_autodetect_video_preview` | When a video URL is being autodetected for preview |
| `tec_events_virtual_before_update_api_accounts` | Before API account settings are updated |

### Single Event Display

| Hook | When |
|---|---|
| `tribe_events_single_event_meta_primary_section_start` | Start of the primary meta section on a single event |
| `tribe_events_single_event_meta_primary_section_end` | End of the primary meta section |
| `tribe_events_single_meta_before` | Before the full meta block on a single event |
| `tribe_events_single_meta_after` | After the full meta block |

### Organizer Page

| Hook | When |
|---|---|
| `tribe_events_single_organizer_before_organizer` | Before organizer container |
| `tribe_events_single_organizer_after_organizer` | After organizer container |
| `tribe_events_single_organizer_before_title` | Before organizer title |
| `tribe_events_single_organizer_after_title` | After organizer title |
| `tribe_events_single_organizer_before_the_meta` | Before organizer meta |
| `tribe_events_single_organizer_after_the_meta` | After organizer meta |
| `tribe_events_single_organizer_before_upcoming_events` | Before upcoming events list on organizer page |
| `tribe_events_single_organizer_after_upcoming_events` | After upcoming events list |
| `tribe_events_single_organizer_before_template` | Before organizer template renders |
| `tribe_events_single_organizer_after_template` | After organizer template renders |

### Venue Page

| Hook | When |
|---|---|
| `tribe_events_single_venue_before_title` | Before venue title |
| `tribe_events_single_venue_after_title` | After venue title |
| `tribe_events_single_venue_before_the_meta` | Before venue meta |
| `tribe_events_single_venue_after_the_meta` | After venue meta |
| `tribe_events_single_venue_before_upcoming_events` | Before upcoming events on venue page |
| `tribe_events_single_venue_after_upcoming_events` | After upcoming events on venue page |
| `tec_events_view_venue_after_address` | After the venue address in the view |
| `tec_events_view_venue_after_address` | After the venue address block |

### List Widget

| Hook | When |
|---|---|
| `tribe_events_list_widget_before_the_event_image` | Before event image in list widget |
| `tribe_events_list_widget_before_the_event_title` | Before event title in list widget |
| `tribe_events_list_widget_after_the_event_title` | After event title in list widget |
| `tribe_events_list_widget_before_the_meta` | Before event meta in list widget |
| `tribe_events_list_widget_after_the_meta` | After event meta in list widget |

### Shortcode / Embed

| Hook | When |
|---|---|
| `tribe_events_pro_shortcode_tribe_events_before_assets` | Before shortcode assets enqueue |
| `tribe_events_pro_shortcode_tribe_events_after_assets` | After shortcode assets enqueue |
| `tribe_events_pro_shortcode_month_widget_add_hooks` | When month widget hooks are added |
| `tribe_events_pro_shortcode_month_widget_remove_hooks` | When month widget hooks are removed |
| `tribe_events_pro_shortcode_toggle_view_hooks` | When shortcode view hooks are toggled |
| `tec_events_pro_output_before_rules_ui` | Before the recurrence rules UI renders |
| `tec_events_pro_output_before_exclusions_ui` | Before the exclusions UI renders |
| `tec_events_pro_calendar_embed_iframe_head` | Inside the calendar embed iframe `<head>` |
| `frontend_iframe_footer_scripts` | Inside the calendar embed iframe footer |
| `tec_events_settings_tab_defaults` | When the defaults settings tab is rendered |
| `tec_events_settings_tab_defaults_venue` | Default venue settings tab section |
| `tec_events_settings_tab_defaults_organizer` | Default organizer settings tab section |

### Geolocation

| Hook | When |
|---|---|
| `tribe_geoloc_save_venue_geodata` | After venue geodata (lat/lng) is saved |

### Deletion

| Hook | When |
|---|---|
| `tribe_events_deleting_child_post` | Before a recurrence child post is deleted |

### Miscellaneous

| Hook | When |
|---|---|
| `tribe_log` | ECP log entry |
| `tribe_recurring_event_error` | On a recurrence processing error |
| `wpml_set_element_language_details` | WPML language assignment |

---

## 3. Filters Applied by ECP (`apply_filters`)

These filters allow third parties to modify ECP behaviour.

### Recurrence

| Filter | Purpose |
|---|---|
| `tec_events_pro_recurrence_meta_get` | Modify recurrence meta when read |
| `tec_events_pro_recurrence_meta_update` | Modify recurrence meta before write |
| `tec_events_pro_recurrence_update_commit` | Control whether a recurrence update is committed |
| `tec_events_pro_recurrence_get_start_dates` | Modify the computed list of occurrence start dates |
| `tec_events_pro_recurring_event_permalink_sequence_number` | Alter the sequence number used in occurrence permalinks |
| `tec_events_pro_show_recurrence_description` | Toggle recurrence description display |
| `tec_events_pro_blocks_recurrence_meta` | Modify block-editor recurrence meta before use |

### CT1 — Series & Occurrences

| Filter | Purpose |
|---|---|
| `tec_events_pro_custom_tables_v1_migration_enabled` | Enable/disable CT1 migration |
| `tec_events_pro_custom_tables_v1_duplicate_arguments` | Modify args for event duplication |
| `tec_events_pro_custom_tables_v1_duplicate_event_additional_meta` | Additional meta to copy when duplicating |
| `tec_events_pro_custom_tables_v1_duplicate_event_taxonomies` | Taxonomies to copy on duplication |
| `tec_events_pro_custom_tables_v1_duplicate_event_virtual_meta` | Virtual meta keys copied on duplication |
| `tec_events_pro_custom_tables_v1_duplicate_event_virtual_meeting_meta` | Meeting-specific meta copied on duplication |
| `tec_events_pro_custom_tables_v1_occurrence_cache_meta` | Control which meta is cached per occurrence |
| `tec_events_pro_custom_tables_v1_occurrence_cache_post` | Control which post fields are cached per occurrence |
| `tec_events_pro_custom_tables_v1_occurrence_list_actions` | Actions shown in CT1 occurrence list |
| `tec_events_pro_custom_tables_v1_redirect_event_link_to_series` | Control link redirect from event to series |
| `tec_events_pro_custom_tables_v1_redirect_id` | Override the ID used for CT1 redirects |
| `tec_events_pro_custom_tables_v1_provisional_post_base_initial` | Starting value for provisional post IDs |
| `tec_events_pro_custom_tables_v1_provisional_post_base_threshold` | Threshold before provisional IDs wrap |
| `tec_events_pro_custom_tables_v1_series_event_view_slug` | View slug used on series event pages |
| `tec_events_pro_custom_tables_v1_series_occurrent_list_columns` | Columns shown in occurrence list metabox |
| `tec_events_pro_custom_tables_v1_series_occurrent_list_metabox_per_page` | Items per page in occurrence list metabox |
| `tec_events_pro_custom_tables_v1_template_assets_is_event_single` | Override single-event asset detection |
| `tec_events_pro_custom_tables_v1_add_to_series_available_events` | Events available for series membership |
| `tec_events_pro_custom_tables_v1_editor_asset_context` | Asset context for CT1 editor |
| `tec_events_pro_custom_tables_v1_editor_occurrences_months_in_advance` | Months ahead to preview in editor |
| `tec_events_pro_custom_tables_v1_throw_on_rset_conversion` | Throw exception on RRULE parse failure |
| `tec_events_pro_custom_series_repository_class` | Override the Series repository class |
| `tec_events_pro_editor_meta_value` | Modify meta values sent to the block editor |
| `tec_events_pro_lock_rules_ui` | Lock the recurrence rules UI (read-only) |
| `tec_events_pro_lock_exclusions_ui` | Lock the exclusions UI (read-only) |
| `tec_events_pro_manager_boundary_datetime_by_status` | Override manager boundary dates per status |
| `tec_custom_tables_v1_get_occurrence_match` | Override how an occurrence is matched |
| `tec_custom_tables_v1_remove_series_autogenerated_flag` | Remove autogenerated flag after manual edit |

### Calendar Embed

| Filter | Purpose |
|---|---|
| `tec_events_pro_calendar_embed_block_query_url` | Modify the query URL used by the embed block |
| `tec_events_pro_calendar_embed_rest_get_args` | Modify args before embed REST response |

### Linked Posts (Venue / Organizer)

| Filter | Purpose |
|---|---|
| `tec_events_pro_linked_post_taxonomy_linked_post_type` | Override linked post type |
| `tec_events_pro_linked_post_taxonomy_linked_post_type_label_plural` | Plural label |
| `tec_events_pro_linked_post_taxonomy_linked_post_type_label_singular` | Singular label |
| `tec_events_pro_linked_post_taxonomy_linked_post_type_repository` | Repository class |
| `tec_events_pro_linked_post_taxonomy_linked_post_type_view_slug` | View slug |
| `tec_events_pro_linked_post_taxonomy_rewrite_slug_plural` | Plural rewrite slug |
| `tec_events_pro_linked_post_taxonomy_rewrite_slug_singular` | Singular rewrite slug |

### Inline Event Shortcode

| Filter | Purpose |
|---|---|
| `tec_events_pro_inline_output` | Modify inline event shortcode output |
| `tec_events_pro_inline_placeholders` | Placeholders available in inline shortcode |
| `tec_events_pro_inline_excluded_placeholders` | Placeholders excluded from inline shortcode |
| `tec_events_pro_inline_event_multi_organizer_output` | Multi-organizer output in inline shortcode |

### Elementor Integration

| Filter | Purpose |
|---|---|
| `tec_events_pro_elementor_event_additional_fields_widget_label_text` | Widget label |
| `tec_events_pro_elementor_event_related_events_widget_*_class` | CSS class overrides (multiple: container, list, item, title, etc.) |
| `tec_events_pro_enable_series_content_injection` | Enable/disable series content injection |

### Geolocation

| Filter | Purpose |
|---|---|
| `tec_events_pro_use_geocode_results` | Accept/reject geocoding results |
| `geoloc-values-for-filters` | Modify geoloc values used in filter UI |

### SEO / Yoast Sitemap

| Filter | Purpose |
|---|---|
| `tec_events_pro_yoast_seo_sitemap_url` | Override sitemap URL entry |
| `tec_events_pro_yoast_seo_sitemap_urlset` | Modify sitemap urlset block |
| `tec_events_pro_yoast_seo_sitemap_per_page_limit` | Items per page in sitemap |
| `tec_events_pro_yoast_seo_sitemap_starts_after_date` | Start date filter for sitemap events |
| `tec_events_pro_yoast_seo_sitemap_ends_before_date` | End date filter for sitemap events |
| `tec_events_pro_yoast_seo_sitemap_latest_modified_date` | Override latest modified date |

### Virtual Events

| Filter | Purpose |
|---|---|
| `tec_events_virtual_autodetect_video_sources` | Registered URL pattern → source-name mappings |
| `tec_events_virtual_autodetect_video_url` | URL being autodetected |
| `tec_events_virtual_autodetect_source` | Detected source after autodetection |
| `tec_events_virtual_autodetect_admin_ajax_capability` | Capability required to trigger autodetection |
| `tec_events_virtual_export_fields` | Fields included in iCal/export for virtual events |
| `tec_events_virtual_export_should_show` | Whether to include virtual link in export |
| `tec_events_virtual_export_should_override_venue_location` | Replace venue location with virtual URL in export |
| `tec_events_virtual_link_button_new_window` | Open virtual link in new window |
| `tec_events_virtual_google_link_new_window` | Open Google Meet link in new window |
| `tec_events_virtual_event_status_moved_online_label` | Label for "moved online" status |
| `tec_events_virtual_render_show_to_content_for_series_passes` | Series passes visibility control |
| `tec_events_virtual_should_inject_new_block` | Whether to inject virtual block on create |
| `tec_events_virtual_show_virtual_content` | Overall virtual content visibility |
| `tec_events_virtual_api_select_account_url` | URL for API account selection UI |
| `tec_events_virtual_meetings_api_error_message` | API error message |
| `tec_events_virtual_meetings_api_post_response` | Raw API response |
| `tec_events_virtual_meetings_google_hosts` | Google Meet allowed hosts |
| `tec_events_virtual_meetings_microsoft_hosts` | Microsoft Teams allowed hosts |
| `tec_events_virtual_meetings_webex_hosts` | Webex allowed hosts |
| `tec_events_virtual_meetings_google_meet_include_pin` | Include PIN in Google Meet link |
| `tec_events_virtual_meetings_webex_meeting_show_password` | Show Webex password |
| `tec_events_pro_virtual_alternative_hosts_cache_duration` | Cache TTL for alternative hosts |
| `tec_community_events_use_series` | Allow community events to use series |

### Miscellaneous

| Filter | Purpose |
|---|---|
| `tec_event_status_enabled` | Enable/disable the event-status feature |
| `tec_events_views_v2_disable_tribe_bar` | Disable filter bar in views |
| `tec_events_views_v2_hide_location_search` | Hide location search in views |
| `tribe_ecp_to_run_or_not_to_run` | Final gate: allow ECP to boot |
| `bulk_post_updated_messages` | WordPress bulk action messages |

---

## 4. Key WordPress Core Hooks ECP Hooks Into

ECP registers on these native WordPress hooks (partial list of architectural interest):

| Hook | Purpose |
|---|---|
| `save_post` / `save_post_tribe_events` | Recurrence save, CT1 update pipeline |
| `before_delete_post` / `delete_post` / `trashed_post` | Clean up occurrences and series relationships |
| `init` | Register CPTs, rewrite rules, shortcodes |
| `rest_api_init` | Register REST routes |
| `parse_query` / `pre_get_posts` | Inject recurrence and CT1 query modifications |
| `admin_init` / `admin_menu` | Admin settings, manager page |
| `enqueue_block_editor_assets` | Block editor recurrence assets |
| `elementor/widgets/register` | Register Elementor widgets |
| `plugins_loaded` | Fallback boot if Common not yet loaded |
