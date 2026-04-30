# eventon-csv-importer — Data Model

## No New Post Types

All imported data creates/updates `ajde_events` posts using EventON's standard schema.

## CSV Column → Post/Meta Mapping

### Core Post Fields

| CSV Column | WordPress target |
|-----------|-----------------|
| `publish_status` | `post_status` (`'publish'` or `'draft'`) |
| `event_id` | Existing post ID (triggers update vs create) |
| `event_name` | `post_title` |
| `event_description` | `post_content` |

### Post Meta Fields

| CSV Column | Meta Key | Notes |
|-----------|----------|-------|
| `featured` | `_featured` | `yes`/`no` |
| `color` | `evcal_event_color` | Strip leading `#` if present |
| `evcal_subtitle` | `evcal_subtitle` | |
| `event_start_date` | → `evcal_srow` (unix) | Computed via `eventon_get_unix_time()` |
| `event_start_time` | → `evcal_srow` | Part of time computation |
| `event_end_date` | → `evcal_erow` (unix) | |
| `event_end_time` | → `evcal_erow` | |
| `evcal_allday` | `evcal_allday` | `yes`/`no` |
| `extend_type` | `extend_type` | `'n'` default |
| `evo_hide_endtime` | `evo_hide_endtime` | `yes`/`no` |
| `evcal_lmlink` | `evcal_lmlink` | Learn more link |
| `evcal_lmlink_target` | `evcal_lmlink_target` | |
| `evcal_exlink` | `evcal_exlink` | External link |
| `_evcal_exlink_option` | `_evcal_exlink_option` | |
| `_evcal_exlink_target` | `_evcal_exlink_target` | |
| `image_url` | Featured image (sideloaded) | Download + upload to media library |
| `image_id` | Featured image (by attachment ID) | |
| `evcal_rep_freq` | Repeat frequency | → triggers `repeat_intervals` computation |
| `evcal_rep_gap` | Repeat gap | |
| `evcal_rep_num` | Repeat count | |
| `evo_rep_WK`, `evo_rep_WKwk` | Week repeat options | |
| `cmd_N` | `_evcal_ec_fNa1_cus` | Custom meta field N |
| `cmd_NL` | `_evcal_ec_fNa1_cusL` | Custom field N button label |

### Taxonomy Fields

| CSV Column | Taxonomy |
|-----------|----------|
| `event_type` | `event_type` (primary) |
| `event_type_2` ... `event_type_N` | Additional event type taxonomies |
| `evcal_location_name` | `event_location` (term auto-created) |
| `evo_location_id` | `event_location` (by term ID) |
| `evcal_organizer` | `event_organizer` (term auto-created) |
| `evo_organizer_id` | `event_organizer` (by term ID) |
| `evoau_assignu` | `event_users` (ActionUser plugin) |

### Extensibility Hook

```php
apply_filters('evocsv_additional_csv_fields', $fields)
do_action('evocsv_save_event_custom_data', $post_id, $post_data, $field)
do_action('evocsv_save_additional_event_metadata', $post_id, $post_data)
```

## Date Format

Auto-detected: `m/d/y` (2-digit year) vs `m/d/Y` (4-digit year). No ISO 8601 support in this version.

## Options

No new wp_options keys. Admin page at `admin.php?page=evocsv`.
