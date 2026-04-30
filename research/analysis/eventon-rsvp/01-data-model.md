---
plugin: eventon-rsvp
version: 3.0.3
analyzed: 2026-04-30
analyst: claudeflare
phase: 1
---

# eventon-rsvp — Data Model

## Custom Post Types

| Post type slug | Label | Public | Has archive | Exclude from search | Capability type |
|---|---|---|---|---|---|
| `evo-rsvp` | Event RSVP | true | true | true | eventon |

Each `evo-rsvp` post represents a single attendee's RSVP for a specific event (or repeat instance). All attendee data lives as post meta on this CPT.

## Custom Taxonomies

None found.

## Custom Tables (dbDelta)

No `dbDelta` calls found. All data is stored in WordPress post meta and options.

## Post Meta Keys

### On `evo-rsvp` posts (one post per attendee submission)

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `e_id` | `evo-rsvp` | ID of the parent `ajde_events` post this RSVP belongs to |
| `repeat_interval` | `evo-rsvp` | Identifies which occurrence of a repeating event was RSVPed; stored as a string key (0 = non-repeating) |
| `rsvp` | `evo-rsvp` | Attendee's RSVP answer: `y` (yes), `n` (no), or `m` (maybe) |
| `status` | `evo-rsvp` | Checkin workflow status: `check-in` (awaiting), `checked` (done); set at creation to `check-in` for normal RSVPs |
| `submission_status` | `evo-rsvp` | Always `confirmed` after save; indicates the form was fully processed |
| `rsvp_type` | `evo-rsvp` | RSVP category: `normal`, `waitlist`, or `invitee`; defaults to `normal` |
| `first_name` | `evo-rsvp` | Attendee first name from the form |
| `last_name` | `evo-rsvp` | Attendee last name from the form |
| `email` | `evo-rsvp` | Attendee email; used as uniqueness key when checking for duplicate RSVPs |
| `phone` | `evo-rsvp` | Attendee phone number (optional form field) |
| `count` | `evo-rsvp` | Number of seats/spaces claimed by this RSVP; minimum 1 |
| `names` | `evo-rsvp` | Serialized array of additional attendee names beyond the submitter (added in v3.0.2) |
| `updates` | `evo-rsvp` | Whether the attendee opted in to email updates; `yes` or absent |
| `userid` | `evo-rsvp` | WordPress user ID of the logged-in user who submitted, if prefill or login features are active |
| `lang` | `evo-rsvp` | Language code active at submission time (e.g., `L1`) |
| `additional_notes` | `evo-rsvp` | Free-text notes field from the RSVP form |
| `signin` | `evo-rsvp` | Set to `y` when the attendee signs in to a virtual event (written by Virtual Events integration) |
| `evors_addf{n}` | `evo-rsvp` | Custom additional field value for field slot n (1–5); the key suffix matches the field number |
| `evors_addf{n}_1` | `evo-rsvp` | For file-type additional fields: stores the media attachment ID |
| `_notes` | `evo-rsvp` | Serialized array of internal admin notes; each note has a timestamp, note text, and author user ID |

### On `ajde_events` posts (event-level RSVP aggregates)

| Postmeta key | Post type scope | Purpose |
|---|---|---|
| `evors_rsvp` | `ajde_events` | Master toggle enabling RSVP for this event; `yes` / absent |
| `evors_show_rsvp` | `ajde_events` | Whether to display the RSVP count publicly on the event card |
| `evors_show_whos_coming` | `ajde_events` | Toggle to show the "who's coming" guest list on the frontend |
| `_evors_show_whos_notcoming` | `ajde_events` | Toggle to show attendees who answered "no" in the guest list |
| `evors_whoscoming_after` | `ajde_events` | Restrict guest-list display to users who have themselves RSVPed |
| `_evors_whoscoming_after` | `ajde_events` | Same restriction logic for the "not coming" list |
| `evors_capacity` | `ajde_events` | Toggle enabling the capacity limit feature; `yes` / absent |
| `evors_capacity_count` | `ajde_events` | Integer total capacity (maximum RSVPs with status `y` or `m`) |
| `_rsvp_yes` | `ajde_events` | Synced integer count of attendees who answered `y` |
| `_rsvp_no` | `ajde_events` | Synced integer count of attendees who answered `n` |
| `_rsvp_maybe` | `ajde_events` | Synced integer count of attendees who answered `m` |
| `evors_data` | `ajde_events` | Serialized array mapping `[user_id][repeat_interval]` → RSVP status; used for fast per-user status lookups (denormalised index avoids full WP_Query on every page load; maintained synchronously on each RSVP save/update) |
| `ri_capacity_rs` | `ajde_events` | Serialized array of per-repeat-instance capacity values; keyed by repeat-interval string |
| `ri_count_rs` | `ajde_events` | Serialized array of per-repeat-instance RSVP counts; keyed by repeat-interval string and then by `y`/`m`/`n` |
| `_manage_repeat_cap_rs` | `ajde_events` | Toggle enabling per-repeat-instance capacity management |
| `evors_max_active` | `ajde_events` | Toggle enabling a per-submission maximum-count limit |
| `evors_max_count` | `ajde_events` | Integer maximum number of spaces a single submission can claim |
| `evors_close_time` | `ajde_events` | Number of minutes before event start when RSVP submissions close |
| `evors_add_emails` | `ajde_events` | Comma-separated email addresses to CC on admin notification emails |
| `evors_notify_event_author` | `ajde_events` | Toggle to include the event post author in admin notification emails |
| `_evors_incard_form` | `ajde_events` | Per-event override to show RSVP form inside the event card (vs. popup) |
| `_evors_form_af_filter` | `ajde_events` | Toggle to restrict which additional form fields appear for this event |
| `_evors_form_af_filter_val` | `ajde_events` | Comma-separated list of additional-field IDs to show (or `AFNONE` to suppress all) |
| `evors_daily_digest` | `ajde_events` | Toggle enabling daily digest emails for this event; `yes` / absent |
| `_evors_image_id` | `ajde_events` | Media attachment ID for an RSVP-specific image shown in the form/card |
| `_evors_image_text` | `ajde_events` | Caption/text accompanying the RSVP image |
| `_evors_description_text` | `ajde_events` | Additional description text shown in the RSVP section |
| `_vir_after_rsvp` | `ajde_events` | (Virtual Events integration) Toggle requiring RSVP before virtual event content is shown |

## WordPress Options

| Option key | Default | Purpose |
|---|---|---|
| `evcal_options_evcal_rs` | — | Main RSVP settings blob; all plugin-level settings live here as an associative array |
| `evors_onlylogu` | — | (within evcal_rs) Restrict RSVP submissions to logged-in users only |
| `evors_disable_emails` | — | (within evcal_rs) Master switch to disable all RSVP emails |
| `evors_notif` | — | (within evcal_rs) Enable admin notification emails on new/updated RSVP |
| `evors_disable_attendee_notifications` | — | (within evcal_rs) Disable the attendee update notification emails |
| `evors_disable_confirmation` | — | (within evcal_rs) Disable the attendee confirmation email |
| `evors_send_all_confirmations` | — | (within evcal_rs) Send confirmation email even when attendee answers "no" |
| `evors_notfiemailto` | admin email | (within evcal_rs) Recipient address for admin notification emails |
| `evors_notfiemailfrom` | admin email | (within evcal_rs) From address for notification emails |
| `evors_notfiemailfrom_e` | admin email | (within evcal_rs) From address for confirmation emails |
| `evors_notfiemailfromN` | site name | (within evcal_rs) From name for notification emails |
| `evors_notfiemailfromN_e` | site name | (within evcal_rs) From name for confirmation emails |
| `evors_notfiesubjest` | "New RSVP Notification" | (within evcal_rs) Subject line for admin notification email |
| `evors_notfiesubjest_e` | "[#{rsvp-id}] RSVP Confirmation" | (within evcal_rs) Subject line for attendee confirmation email |
| `evors_notfiesubjest_update` | "Update RSVP Notification" | (within evcal_rs) Subject line for RSVP update notification |
| `evors_notfi_update_subject` | "[#{rsvp-id}] RSVP Update Confirmation" | (within evcal_rs) Subject line for attendee update confirmation |
| `evors_digestemail_to` | admin email | (within evcal_rs) Recipient for daily digest emails |
| `evors_digestemail_from` | admin email | (within evcal_rs) From address for digest emails |
| `evors_digestemail_fromN` | site name | (within evcal_rs) From name for digest emails |
| `evors_digestemail_subjest` | "Digest Email for {event-name}" | (within evcal_rs) Subject line for digest email |
| `evors_digest` | — | (within evcal_rs) Master toggle enabling scheduled digest emails |
| `evors_nonce_disable` | — | (within evcal_rs) Disable nonce verification on AJAX actions (for compatibility) |
| `evors_reg_user` | — | (within evcal_rs) Disable automatic WordPress user account creation on RSVP |
| `evors_prefil` | — | (within evcal_rs) Pre-fill RSVP form fields from logged-in user profile |
| `evors_incard_form` | — | (within evcal_rs) Global setting to show the RSVP form inside the event card |
| `evors_addf{n}` | — | (within evcal_rs) Enable additional form field slot n (1–5) |
| `evors_addf{n}_1` | — | (within evcal_rs) Label/name for additional field n |
| `evors_addf{n}_2` | — | (within evcal_rs) Type of additional field n (text, select, file, etc.) |
| `evors_orderby` | last_name | (within evcal_rs) Guest list sort order: `fn` (first name) or last name |
| `evors_change_rsvp_hide_at` | never | (within evcal_rs) When to hide the "change RSVP" button |
| `evors_hide_change` | — | (within evcal_rs) Globally hide the "change RSVP" option |
| `evors_rsvp_roles` | — | Allowed WordPress user roles for RSVPing; global setting stored as a top-level option (not per-event meta) |
