# eventon-rsvp-events-waitlist — Hooks & Integration Points

## Actions Consumed

| Hook | Class | Purpose |
|------|-------|---------|
| `evors_load_event` | Front | Load EVORSW_Waitlist instance for event |
| `evors_new_rsvp_before_save` | Front | Flag rsvp_type='waitlist' before save if capacity reached |
| `evors_new_rsvp_saved` | Front | Call add_to_waitlist() after save |
| `evors_rsvp_updated` | Front | Offer space to next waitlist guest when RSVP cancels |
| `evors_form_success_msg_updated_rsvp` | Front | Add "added to waitlist" to success screen |
| `evors_form_success_msg_end` | Front | Append party-size note to success message |
| `evors_eventcard_after_usertext` | Front | Show waitlist join/status UI in event card |
| `evors_rsvp_choice_btns_evc` | Front | Suppress regular RSVP buttons when on waitlist |
| `evors_form_under_subtitle` | Front | Inject subtitle in form (join / remove) |
| `evors_au_eventmanager_statbox` | Integrations | Show waitlist count stat in ActionUser panel |
| `evors_au_eventmanager_attendees_end` | Integrations | Render waitlist attendee list in ActionUser panel |

## Filters Consumed

| Hook | Class | Purpose |
|------|-------|---------|
| `evors_checking_status_text_ar` | Front | Add 'waitlist' to status text map |
| `evors_eventtop_above_title` | Front | Show "Get on the waitlist" badge |
| `evors_eventtop_count_html` | Front | Replace count HTML with "Waitlist is Open" |
| `evors_remain_rsvp_output` | Front | Return 'wl' when capacity hit + waitlist active |
| `evors_eventcard_html_srem` | Front | Replace remaining-spots UI with waitlist size UI |
| `evors_evc_user_rsvp_txt` | Front | Show "You are in our waitlist!" user text |
| `evors_form_rsvp_type` | Front | Override form rsvp_type to 'waitlist' |
| `evors_form_success_msg_header` | Front | Change success header for waitlist submission |
| `evors_rsvp_updated_before` | Front | Handle wl-remove form action (trash RSVP) |
| `evors_rsvp_form_message` | Front | Return "removed from waitlist" message |
| `evors_updatersvp_n_to_y` | Front | Intercept RSVP status change to add to waitlist |
| `evors_admin_notification_args` | Front | Append "Added to waitlist!" to admin email |
| `evors_preview_email_arg` | Front | Same, for email preview |

## REST Endpoints

None. All interaction is through WordPress AJAX via EventON's existing form submission hooks.

## Dateline Design Implications

- **No new endpoints needed for waitlist.** The waitlist lifecycle (join → offer → confirm/remove) can be driven entirely through the RSVP mutation API.
- **Offer-on-cancel logic** (`updated()` hook) is synchronous in PHP. In Dateline this must be a background job via `ctx.waitUntil` to avoid holding the response.
- **Data model is clean**: waitlist entry = RSVP record tagged `rsvp_type='waitlist'`. Dateline equivalent: a field on the RSVP row or a separate `waitlist_entries` table.
- **No optimistic locking**: `offer_space_to_waitlist()` reads→writes without any DB transaction. Race condition exists if two cancellations fire simultaneously. Dateline must use atomic decrement + KV hold pattern.
