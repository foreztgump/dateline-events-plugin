# Eventin Pro 4.0.19 — Hooks & REST Endpoints

---

## Actions Fired (do_action)

These are hooks **Eventin Pro fires** — they allow third-party code to hook in.

| Hook | Args | Where fired | Purpose |
|------|------|-------------|---------|
| `eventin-pro/before_load` | — | `eventin-pro.php` | Before pro modules load |
| `eventin-pro/after_load` | — | `eventin-pro.php` | After all pro modules init |
| `eventin_create_{post_type}` | `$post_id` | `webhook/hooks.php` | When event/speaker/zoom-meeting is published |
| `eventin_update_{post_type}` | `$post_id` | `webhook/hooks.php` | When event/speaker/zoom-meeting is updated |
| `eventin_delete_{post_type}` | `$post_id` | `webhook/hooks.php` | When event/speaker/zoom-meeting is trashed |
| `eventin_restore_{post_type}` | `$post_id` | `webhook/hooks.php` | When post is untrashed |
| `etn_assign_event_to_group` | `$event_id, $group_id, $action` | `Event/Api/EventController.php` | After BuddyBoss group assigned to event |
| `eventin_event_deleted` | `$id` | `webhook/Api/WebhookController.php` | After webhook deleted |
| `etn_webhook_process_delivery` | `$webhook, $arg` | `webhook/hooks.php` | Queues webhook for delivery |

---

## Actions Consumed (add_action)

These are WP/plugin hooks that **Eventin Pro listens to**.

### WordPress Core

| Hook | Priority | Handler | Purpose |
|------|----------|---------|---------|
| `plugins_loaded` | 9999 | `Wpeventin_Pro::initialize_modules` | Boot sequence |
| `init` | default | `Wpeventin_Pro::i18n` | Load text domain |
| `init` | default | `Webhook\Hooks::load_webhooks` | Register webhook listeners |
| `init` | default | `Attendee\Hooks::scanner_module_functionalities` | QR scanner page handler |
| `template_redirect` | default | `Admin\Hooks::render_template_preview` | Template preview render |
| `template_redirect` | default | `Attendee\Hooks::show_attendee_certificate` | Certificate download handler |
| `admin_notices` | default | `Admin\Notice::admin_notice` | Admin notices |
| `admin_notices` | default | `Attendee\Hooks::attendee_show_notice_after_change_to_publish` | Bulk-publish notice |
| `admin_notices` | default | `Attendee\Hooks::attendee_show_notice_after_download_csv` | CSV export notice |
| `restrict_manage_posts` | default | `Attendee\Hooks::show_attendee_report_filter` | Attendee list filters |
| `parse_query` | default | `Attendee\Hooks::attendee_report_filter_result` | Apply attendee query filters |
| `publish_etn` | 10 | `Webhook\Hooks::create_rescource` | Fire webhook on event publish |
| `wp_trash_post` | default | `Webhook\Hooks::delete_resource` | Fire webhook on trash |
| `untrashed_post` | default | `Webhook\Hooks::restore_resource` | Fire webhook on restore |
| `post_updated` | 10 | `Webhook\Hooks::updated_post` | Fire webhook on update |
| `shutdown` | default | `Webhook\Hooks::webhook_execute_queue` | Flush queued webhooks at request end |
| `wp_enqueue_scripts` | default | `FrontendAsset::enqueue` | Frontend asset registration |
| `admin_enqueue_scripts` | default | `AdminAsset::enqueue` | Admin asset registration |
| `enqueue_block_assets` | default | `BlockService::blocks_assets` | Gutenberg block assets |
| `handle_bulk_actions-edit-etn-attendee` | 10 | `Attendee\Hooks::attendee_bulk_action_change_to_publish` | Bulk attendee status change |
| `etn\pdf\before_main_details` | 10 | `Attendee\Hooks::before_pdf_body_show_unique_id` | Inject ticket ID into PDF |
| `posts_join` | default | `Attendee\Hooks::attendee_ticket_id_search_join` | Extend attendee search SQL |
| `posts_where` | default | `Attendee\Hooks::attendee_ticket_id_search_where` | Extend attendee search SQL |
| `after_attendee_ticket_title` | default | `Attendee\Hooks::bulk_attendee_checkbox` | Add checkbox to ticket UI |
| `etn_pro_ticket_qr` | 10 | `Attendee\Hooks::etn_pro_ticket_qr_cb` | QR image placeholder in ticket |
| `etn_pro_ticket_id` | 10 | `Attendee\Hooks::etn_pro_ticket_id_cb` | Ticket ID display |
| `wp_ajax_attendee_event` | — | `Attendee\Hooks::get_attendee_event` | AJAX: get attendee by event |
| `wp_ajax_save_market_place` | — | `License\LicenseActivator` | AJAX: save marketplace data |
| `wp_ajax_nopriv_save_market_place` | — | `License\LicenseActivator` | AJAX: save marketplace data (anon) |
| `wp_ajax_nopriv_add_to_cart_validation` | — | Multivendor | AJAX: add to cart validation |
| `wp_ajax_nopriv_action_activate_license` | — | License | AJAX: license activation |
| `wp_ajax_nopriv_action_deactivate_license` | — | License | AJAX: license deactivation |

### Elementor Integration

| Hook | Handler | Purpose |
|------|---------|---------|
| `elementor/widgets/register` | `Widgets\Manifest::register_widgets` | Register all Elementor widgets |
| `elementor/elements/categories_registered` | `Widgets\Manifest` | Add 'eventin-pro' widget category |
| `elementor/frontend/before_enqueue_scripts` | `Bootstrap::etn_elementor_js` | Enqueue elementor integration JS |

### BuddyBoss Integration

| Hook | Handler | Purpose |
|------|---------|---------|
| `bp_register_activity_actions` | Buddyboss module | Register activity types |
| `bp_screens` | Buddyboss module | Admin page registration |
| `bp_setup_nav` | Buddyboss module | Add tab nav in group/profile |
| `bp_template_content` | Buddyboss module | Render event content in BP pages |
| `etn_assign_event_to_group` | Buddyboss module | Handle group assignment side effects |

### Dokan Integration

| Hook | Handler | Purpose |
|------|---------|---------|
| `dokan_load_custom_template` | Multivendor module | Load vendor event template |
| `dokan_store_profile_frame_after` | Multivendor | Show events on vendor profile |
| `dokan_get_dashboard_nav` | Multivendor | Add event menu to Dokan dashboard |
| `dokan_add_new_product_redirect` | Multivendor | Redirect to event create from Dokan |
| `dokan_product_row_actions` | Multivendor | Add attendee list link |
| `dokan_query_var_filter` | Multivendor | Add Dokan query vars |

### WooCommerce Integration

| Hook | Handler | Purpose |
|------|---------|---------|
| `woocommerce_add_to_cart_validation` | 10 | Multivendor | Validate cart addition |
| `woocommerce_endpoint_order-received_title` | — | `core/woocommerce/hooks.php` | Customize order-received page title |
| `woocommerce_thankyou_order_received_text` | 20 | hooks.php | Customize thank-you text |
| `etn_before_add_to_cart_button` | 9999 | WC Deposits | Inject deposit form |

### Eventin (base plugin) Filter Hooks

| Hook | Handler | Purpose |
|------|---------|---------|
| `eventin_api_controllers` | `Admin\Hooks::add_api_controllers` | Register pro REST controllers |
| `eventin_api_controllers` | `Admin\Hooks::add_webhook_controller` | Register webhook controller |
| `eventin_payment_methods` | `Admin\Hooks::add_payment_methods` | Register Stripe + PayPal |
| `eventin_services` | `Admin\Hooks::add_services` | Register PermissionManager + BlockService |
| `eventin_menu` | 10 | `Admin\Hooks::add_menu` | Add License menu entry |
| `eventin_settings` | — | `Admin\Hooks::added_google_connection` | Inject Google Meet settings |
| `eventin_online_meeting_platforms` | — | `Admin\Hooks::add_google_meet` | Register Google Meet platform |
| `eventin_role_permissions` | — | `PermissionManager::set_permissions` | Return pro permission settings |
| `eventin_gutenberg_blocks` | — | `BlockService::add_blocks` | Register 14 pro block types |
| `eventin/shortcode/pro_shortcode` | — | `Shortcodes\Hooks::add_pro_shortcodes` | Add pro shortcode settings view |
| `etn_admin_register_scripts` | — | `AdminAsset`, `Admin\Hooks` | Register + merge admin scripts |
| `etn_admin_register_styles` | — | `AdminAsset`, `Admin\Hooks` | Register + merge admin styles |
| `etn_frontend_register_scripts` | — | `FrontendAsset` | Register frontend scripts |
| `etn_frontend_register_styles` | — | `FrontendAsset` | Register frontend styles |
| `etn_attendee_fields` | 8 | `Attendee\Hooks::etn_attendee_fields_add_extra` | Add extra attendee metabox fields |
| `etn_advanced_search` | — | `Utils\Helper::advanced_search_filter` | Pro advanced search filter |
| `etn/purchase_form_template` | — | `Shortcodes\Hooks` | Override purchase form template |
| `etn/metaboxs/etn_metaboxs` | — | `WC\Woocommerce_Deposit` | Add deposit metaboxes |
| `etn_faq_view` | 10 | `Event\Script_Generator::generate_single_page_faq_view` | Override FAQ view |

### Eventin single-event template hooks

| Hook | Priority | Purpose |
|------|----------|---------|
| `etn_before_single_event_content_title` | 10 | Show categories |
| `etn_before_single_event_details` | 10/11 | Show banner module (event-two/three) |
| `etn_before_single_event_details` | 11 | Show location + counter (event-two) |
| `etn_after_single_event_content_title` | 10 | Show meta (event-three) |
| `etn_after_single_event_content_title` | 11 | Show countdown timer (event-three) |
| `etn_after_single_event_content_body` | 10 | Show tags |
| `etn_after_single_event_content_body` | 11 | Show locations |
| `etn_after_single_event_content_body` | 12 | Show schedules |
| `etn_after_single_event_content_wrap` | 10 | Show speakers / FAQs / organizers |
| `etn_after_single_event_meta` | 11 | Show attendee list |
| `etn_after_single_event_meta` | 12 | Show related events |
| `etn_after_single_event_details_rsvp_form` | — | RSVP module: show after RSVP form |

---

## REST API Endpoints

All endpoints are under namespace `eventin/v2`.

### Events (extends base Eventin)

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/eventin/v2/events/{id}/send_certificate` | `manage_options` | Send certificate to all attendees |
| GET | `/eventin/v2/events/certificate_templates` | `manage_options` | List available certificate templates |
| POST | `/eventin/v2/events/buddyboss/assign_group` | `manage_options` | Assign BuddyBoss group to event |

### Permissions

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/eventin/v2/permissions` | `manage_options` | List all permissions |
| GET | `/eventin/v2/permissions/roles` | `manage_options` | List role → permission mappings |
| GET | `/eventin/v2/permissions/current-user` | `read` | Get current user + their permissions |
| GET | `/eventin/v2/permissions/settings` | `manage_options` | Get permission settings |
| PUT/PATCH | `/eventin/v2/permissions/{role}` | `manage_options` | Add permissions to role |
| DELETE | `/eventin/v2/permissions/{role}` | `manage_options` | Remove permissions from role |
| DELETE | `/eventin/v2/permissions/roles/{role}` | `manage_options` | Remove an entire role |

### Webhooks

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/eventin/v2/webhooks` | `manage_options` | List webhooks (paginated) |
| POST | `/eventin/v2/webhooks` | `manage_options` | Create webhook |
| DELETE | `/eventin/v2/webhooks` | `manage_options` | Bulk delete webhooks |
| GET | `/eventin/v2/webhooks/{id}` | `manage_options` | Get single webhook |
| PUT/PATCH | `/eventin/v2/webhooks/{id}` | `manage_options` | Update webhook |
| DELETE | `/eventin/v2/webhooks/{id}` | `manage_options` | Delete single webhook |

### License

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/eventin/v2/licenses/activate` | `manage_options` | Activate EDD license |
| POST | `/eventin/v2/licenses/deactivate` | `manage_options` | Deactivate license |
| GET | `/eventin/v2/licenses` | `manage_options` | Get license status |

### Short Codes (script)

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/eventin/v2/shortcodes/script` | authenticated | Get shortcode configuration |

### RSVP (module-gated)

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET/POST | `/eventin/v2/rsvp/{id}` | authenticated | Get/submit RSVP |
| GET | `/eventin/v2/rsvp/{id}/invitations` | `manage_options` | List invitations |
| GET | `/eventin/v2/rsvp/{id}/clone` | `manage_options` | Clone RSVP configuration |
| PUT | `/eventin/v2/rsvp/{id}/status` | `manage_options` | Update RSVP status |

---

## AI Generator Request Flow

The AI generator does **not** make direct HTTP calls to an LLM from this plugin. It delegates to `EventinAi\Core\Ai` — a separate `eventin-ai` plugin (referenced via `use EventinAi\Core\Ai` in `EventController.php`). The flow:

```
REST request → EventController
  → AiGeneratorManager::generateContent($module, $type, $data)
    → AiGeneratorFactory::create($module, $type)  // 'event': title/description/image/faq
      → EventTitleGenerator | EventDescriptionGenerator | EventImageGenerator | EventFaqGenerator
        → (implements AiGeneratorInterface::generate(string $data): mixed)
          → delegates to EventinAi\Core\Ai (separate plugin — not in this source)
```

**Implication for Dateline:** The actual LLM API calls (likely OpenAI) live in the `eventin-ai` companion plugin, which is separate. Eventin Pro provides the integration surface; the AI plugin provides the model connectivity. This is a two-plugin architecture that adds user friction and complexity.

---

## AJAX Endpoints

| Action | Auth | Purpose |
|--------|------|---------|
| `attendee_event` | logged-in | Get attendee for event (admin) |
| `save_market_place` | any | Save marketplace/license data |
| `action_activate_license` | any | Activate license (nopriv) |
| `action_deactivate_license` | any | Deactivate license (nopriv) |
| `add_to_cart_validation` | any | WooCommerce cart validation |
| `etn_bp_event` | any | BuddyBoss event content (AJAX) |
| Scanner nonce-gated requests | logged-in | QR ticket validation |

---

## Webhook Delivery Topics

Webhook topics are fired via dynamic `eventin_create_{post_type}`, `eventin_update_{post_type}`, `eventin_delete_{post_type}` hooks. Observed post types:

- `etn` (events)
- `etn-speaker`
- `etn-zoom-meeting`

Payloads defined in `core/webhook/payloads/`:
- `attendee-payload.php`
- `event-payload.php`
- `order-payload.php`
- `schedule-payload.php`
- `speaker-payload.php`
- `zoom-meeting-payload.php`

Delivery is queued during the request and flushed synchronously at `shutdown`. **No background processing / WP-Cron.** This is a potential reliability issue under load.
