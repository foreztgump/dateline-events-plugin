# EventON 4.8 — Overview

**Plugin URI:** http://www.myeventon.com/  
**Version:** 4.8  
**Author:** AshanJay / AJDE  
**Requires PHP:** Not declared (WP 6.0+, tested to 6.7.1)  
**Requires WP:** 6.0  
**Text Domain:** `eventon`

---

## File Census

### Root
| File | Purpose |
|------|---------|
| `eventon.php` | Plugin bootstrap, defines constants, loads main class, exports `EVO()` global |
| `uninstall.php` | Cleanup on uninstall |
| `index.php` | Directory protection stub |

### `ajde/`
| File | Purpose |
|------|---------|
| `ajde.php` | AJDE framework core (shared UI utilities, form field renderers) |
| `ajde-wp-admin.php` | AJDE WP-Admin integrations (menus, notices) |

### `includes/`
| File | Purpose |
|------|---------|
| `class-eventon.php` | Main singleton `EventON` — bootstraps all subsystems |
| `class-evo-post-types.php` | Registers `ajde_events` CPT + all taxonomies |
| `class-event.php` | `EVO_Event` — event entity (extends `EVO_Data_Store`) |
| `class-evo-ajax.php` | Ajax dispatch (frontend calendar requests) |
| `class-evo-shortcodes.php` | Shortcode registration and dispatch |
| `class-frontend.php` | `evo_frontend` — script/style enqueue, Facebook meta, heartbeat |
| `class-cronjobs.php` | `evo_cron` — WP cron scheduling helpers |
| `class-rest-api.php` | `EVO_Rest_API` — REST endpoints |
| `class-search.php` | Search shortcode `[add_eventon_search]` |
| `class-tax.php` | `evo_tax` — taxonomy data helpers |
| `class-templates.php` | `EVO_Temp` — template loading system |
| `class-multi-data-types.php` | `evo_mdt` — multi data type (MDT) taxonomy-like system |
| `class-evo-helper.php` | `evo_helper` — utility functions (timezone, arrays, sanitise) |
| `class-evo-datetime.php` | Datetime parsing and repeat interval generation |
| `class-evo-install.php` | Activation/update routines |
| `class-environment.php` | WP environment sniffing (timezone, date format) |
| `class-deprecations.php` | Shims for removed/renamed functions |
| `class-evo-template-loader.php` | Template override loader (theme > plugin path chain) |
| `class-evo-wp-widgets.php` | Widget registrations (loaded lazily on `widgets_init`) |
| `class-map-styles.php` | Google Maps style definitions |
| `evo-conditional-functions.php` | Conditional helper functions |
| `eventon-core-functions.php` | Core utility functions (repeat intervals, option readers) |
| `eventon-functions.php` | Frontend-only utility functions |

### `includes/calendar/`
| File | Purpose |
|------|---------|
| `class-calendar_generator.php` | `EVO_generator` — main calendar orchestrator (DEP path) |
| `class-calendar_gen.php` | `EVO_Cal_Gen` — new pipeline entry point |
| `class-calendar-body.php` | Calendar HTML body builder |
| `class-calendar-shell.php` | Calendar outer shell / container HTML |
| `class-calendar-shortcode.php` | `EVO_Cal_Shortcode` — parses and normalises shortcode attributes |
| `class-calendar-helper.php` | Calendar-level helpers (defaults, timezone, login messages) |
| `class-calendar-schedule.php` | `Evo_Cal_Schedule` — schedule view |
| `class-calendar-now.php` | "Now" / live-event display |
| `class-calendar-filtering.php` | Filtering logic (taxonomy, date range, search) |
| `class-calendar-event-structure.php` | Per-event HTML structure (eventtop, eventcard, boxes) |
| `class-calendar-event-schema.php` | JSON-LD / schema.org output |
| `class-calendar-time.php` | Calendar-level time helpers |
| `class-data-store.php` | `EVO_Data_Store` — base class; wraps `get_post_meta` |

### `includes/elements/`
| File | Purpose |
|------|---------|
| `class-elements-main.php` | `EVO_General_Elements` — UI element renderers (yesno, dropdown, etc.) |
| `class-elements-svg.php` | SVG icon helpers |
| `class-elements-trigs.php` | Trigger elements (lightbox openers, tooltips) |
| `class-lightboxes.php` | `EVO_Lightboxes` — lightbox rendering |
| `class-shortcode-data.php` | Shortcode data object |
| `class-shortcode-fields.php` | Shortcode field definitions |
| `class-shortcode_generator.php` | `EVO_Shortcode_Generator` — shortcode generator UI |

### `includes/integration/`
| File | Purpose |
|------|---------|
| `class-intergration-general.php` | `EVO_Int_General` — misc integrations (ICS export, duplicate event) |
| `class-intergration-webhooks.php` | `EVO_WebHooks` — outgoing webhook system |
| `class-intergration-visualcomposer.php` | Visual Composer / WPBakery param registration |
| `blocks/class-evo-blocks.php` | Gutenberg block registration |
| `elementor/class-elementor-init.php` | Elementor widget init |
| `elementor/elementor_widget.php` | Elementor widget definition |
| `zoom/class-zoom.php` | Zoom API integration |
| `zoom/class-S2SOAuth.php` | Zoom S2S OAuth client |
| `zoom/connect.php` | Zoom connection page |
| `zoom/vendor/` | firebase/php-jwt (Zoom auth dependency) |

### `includes/admin/`
| File | Purpose |
|------|---------|
| `class-evo-admin.php` | `evo_admin` — admin-page bootstrap, inline CSS, dynamic CSS generation |
| `class-admin-ajax.php` | Admin-side Ajax handlers (event edit load, CSV export, etc.) |
| `class-admin-designer.php` | Visual designer tool |
| `class-admin-taxonomies.php` | Taxonomy term meta editor |
| `class-admin-taxonomies_editor.php` | Taxonomy bulk editor |
| `class-forms.php` | Form rendering helpers |
| `class-views.php` | Admin view utilities |
| `class-evo-errors.php` | Error/debug log (`evo_data_log` option) |
| `eventon-admin-functions.php` | Admin utility functions |
| `eventon-admin-html.php` | Admin HTML helpers |
| `eventon-admin-content.php` | Admin content page |
| `post_types/ajde_events.php` | Events list table customisations (columns, quick edit) |
| `post_types/class-meta_boxes.php` | Main event metabox controller |
| `post_types/class-meta_box_all.php` | All-in-one metabox HTML |
| `post_types/class-meta_boxes-timedate.php` | Time/date section of metabox |
| `post_types/class-meta_boxes-color.php` | Color section |
| `post_types/class-meta_boxes-location.php` | Location section |
| `post_types/class-meta_boxes-organizer.php` | Organizer section |
| `post_types/class-meta_boxes-ui.php` | UI settings section |
| `post_types/class-meta_boxes-virtual.php` | Virtual event section |
| `post_types/class-meta_boxes-cmf.php` | Custom meta fields section |
| `post_types/class-meta_boxes-extraimages.php` | Extra images section |
| `post_types/class-meta_boxes-attendance.php` | Attendance/goals section |
| `post_types/class-meta_boxes-goals.php` | Goals section |
| `post_types/class-meta_boxes-health.php` | Health guidelines section |
| `post_types/class-meta_boxes-related.php` | Related events section |
| `post_types/duplicate_event.php` | Duplicate event functionality |
| `settings/class-settings.php` | `EVO_Settings` — settings page controller |
| `settings/class-settings-settings.php` | Tab 1 (general settings) field definitions |
| `settings/class-settings-appearance.php` | Appearance settings |
| `settings/class-settings-content.php` | Settings content renderer |
| `settings/class-settings-designer.php` | Designer settings |
| `settings/class-settings-language.php` | Language tab |
| `settings/class-settings-scripts.php` | Scripts tab |
| `settings/class-addon-details.php` | Add-on marketplace tab |
| `settings/settings_addons_tab.php` | Add-ons tab content |
| `settings/settings_advanced_tab.php` | Advanced/troubleshoot tab |
| `settings/settings_language_tab.php` | Language tab content |
| `settings/settings_styles_tab.php` | Custom CSS/PHP tab |
| `settings/settings_troubleshoot_tab.php` | Troubleshoot tab |

### `includes/products/`
| File | Purpose |
|------|---------|
| `class-evo-addons.php` | `evo_addons` — each add-on registers itself here |
| `class-evo-products.php` | `EVO_Products` — product registry |
| `class-evo-product.php` | `EVO_Product` — single product/license record |
| `class-licenses.php` | License activation and remote validation |
| `class-evo_plugins_api_data.php` | WordPress plugin-api response shim |

### `templates/`
| File | Purpose |
|------|---------|
| `single-ajde_events.php` | Single event page template |
| `archive-ajde_events.php` | Event archive page template |
| `content-single-event.php` | Event content loop template |
| `taxonomy-event_location.php` | Location taxonomy archive |
| `taxonomy-event_organizer.php` | Organizer taxonomy archive |
| `taxonomy-event_type.php` | Event type taxonomy archive |
| `lb-event_location.php` | Location lightbox |
| `lb-event_organizer.php` | Organizer lightbox |
| `_evo-template-blocks.php` | Reusable template block functions |
| `_evo-template-control.php` | Template override control init |
| `_evo-template-functions.php` | Global template helper functions |
| `email/email_header.php` | Email header partial |
| `email/email_footer.php` | Email footer partial |

---

## Entry Points & Bootstrap Sequence

```
eventon.php
  └── include includes/class-eventon.php
        └── EventON::instance()  (singleton, stored in $GLOBALS['eventon'])
              ├── define_constants()          — EVO_VERSION, AJDE_EVCAL_PATH, etc.
              ├── add_action('init', init, 0)
              ├── register_activation_hook    — sets _evo_activation_redirect transient
              ├── includes()                  — loads ALL PHP classes
              └── init_hooks()
                    ├── add_action('widgets_init', register_widgets)
                    ├── add_action('after_setup_theme', setup_environment)
                    └── add_action('after_setup_theme', include_template_functions, 11)

on 'init' (priority 0):
  └── EventON::init()
        ├── new ajde()                    — AJDE UI framework
        ├── load_plugin_textdomain()
        ├── new EVO_Cal_Gen()             → $EVO->cal
        ├── new EVO_generator()           → $EVO->evo_generator / $EVO->calendar
        ├── new evo_frontend()            → $EVO->frontend
        ├── new evo_mdt()                 → $EVO->mdt
        ├── new EVO_Temp()                → $EVO->temp
        ├── new EVO_Shortcodes()          → $EVO->shortcodes
        ├── new EVO_Rest_API()            → $EVO->rest
        ├── new evo_cron()                → $EVO->cron
        ├── new EVO_General_Elements()    → $EVO->elements
        ├── new EVO_Shortcode_Generator() → $EVO->shortcode_gen
        ├── new EVO_Lightboxes()          → $EVO->lightbox
        ├── new EVO_Int_General()         → $EVO->gen_int
        ├── new Evo_Cal_Schedule()        → $EVO->evosv
        ├── new EVO_WebHooks()            → $EVO->webhooks
        ├── new evo_helper()              → $EVO->helper
        ├── (admin only) new evo_admin()  → $EVO->evo_admin
        ├── (admin only) new EVO_Taxonomies() → $EVO->taxonomies
        ├── eventon_init_caps()           — register custom capabilities
        ├── init_evo_product()            — register self as product
        └── do_action('eventon_init')     ← MAIN ADDON INTEGRATION POINT
```

**Admin vs Frontend bootstrap:**
- Admin-only classes: `evo_admin`, `EVO_Taxonomies`, `EVO_Settings` (lazy), `class-forms`, `eventon-admin-functions`, post-type metabox classes, settings classes, `class-licenses`
- Frontend (non-admin + ajax): `evo_frontend` (scripts/styles), `eventon-functions.php`, `class-admin-ajax.php` (shared for frontend ajax)
- Shared always: all calendar, event, taxonomy, REST, cron, shortcode, element classes

---

## Dependency Map

### Required Versions
- WordPress: 6.0+
- PHP: Not declared (implicit ≥7.4 from syntax patterns)
- WooCommerce (optional): Required only by `eventon-tickets` add-on (WC 6.0+)

### Bundled Libraries
| Library | Location | Used For |
|---------|----------|---------|
| `firebase/php-jwt` | `includes/integration/zoom/vendor/` | Zoom JWT authentication |
| AJDE framework | `ajde/` | Shared UI component library |

### Internal Class Dependency Graph (key relationships)
```
EventON (singleton)
  ├── EVO_Cal_Gen           — uses EVO_generator, EVO_Cal_Shortcode
  ├── EVO_generator         — uses EVO_Cal_Body, EVO_Cal_Shell, EVO_Cal_Filtering
  │     └── EVO_Cal_Body    — uses EVO_Cal_Event_Structure → EVO_Event
  ├── evo_frontend          — consumes EVO()->calendar settings
  ├── EVO_Event             — extends EVO_Data_Store → get_post_meta
  ├── EVO_Shortcodes        — delegates to EVO_generator
  ├── EVO_Rest_API          — delegates to EVO_generator via apply_filters
  ├── EVO_Taxonomies        — reads EVO_post_types taxonomy data
  └── evo_admin             — uses EVO_Settings, reads EVO()->calendar
```

---

## Add-on Extension API Surface

### Registration Protocol
Every add-on follows an identical bootstrapping pattern:

1. **Class instantiated on file load** (no `plugins_loaded` hook needed for class init)
2. **`plugins_loaded` → `plugin_init()`** — guards `$GLOBALS['eventon']` and `class_exists('evo_addons')`; if missing, shows admin notice and returns early
3. **Instantiates `new evo_addons($this->addon_data)`** — registers with core's product/license system
4. **`init` (priority 0) → `$this->init()`** — loads subclasses, registers hooks

```php
// Canonical addon init pattern (eventon-rsvp as example)
class EventON_rsvp {
    public $eventon_version = '4.7'; // minimum EVO core version
    public $addon_data = [
        'ID' => 'EVORS', 'slug' => 'eventon-rsvp',
        'version' => '3.0.3', 'name' => 'RSVP Events',
        'evo_version' => '4.7', // used by evo_addons::evo_version_check()
    ];

    function __construct() {
        add_action('plugins_loaded', [$this, 'plugin_init']);
    }
    function plugin_init() {
        if (!isset($GLOBALS['eventon']) || !class_exists('evo_addons')) {
            add_action('admin_notices', [$this, 'notice']); return;
        }
        $this->addon = new evo_addons($this->addon_data); // registers with core
        add_action('init', [$this, 'init'], 0);
    }
}
```

### Core Hooks Exposed for Add-on Integration

**Lifecycle / bootstrap:**
| Hook | Type | Purpose |
|------|------|---------|
| `eventon_init` | action | Fires after all core objects initialised — primary addon hook point |
| `eventon_activate` | action | Plugin activation |
| `eventon_deactivate` | action | Plugin deactivation |
| `evo_addon_version_change` | action | Fired when an addon updates its version |

**Admin — Event Edit Metaboxes:**
| Hook | Type | Purpose |
|------|------|---------|
| `eventon_add_meta_boxes` | action | Add metaboxes to `ajde_events` edit screen; receives `EVO_Event` |
| `eventon_save_meta` | action | Save handler for event post — args: `$fields_ar, $post_id, $EVENT, $post_data` |
| `eventon_event_metafields` | filter | Array of postmeta field names to save on event; addons append their keys |
| `evo_eventedit_pageload_data` | filter | AJAX-loaded metabox HTML sections; addons inject HTML by key |
| `evo_eventedit_pageload_dom_ids` | filter | DOM IDs for metabox sections; addons register their section ID |
| `evo_event_metaboxs` | filter | Metabox section array |
| `eventon_event_date_metafields` | filter | Date-related meta fields |
| `eventon_quick_save_fields` | filter | Fields saved via quick edit |

**Admin — Settings:**
| Hook | Type | Purpose |
|------|------|---------|
| `eventon_settings_tabs` | filter | Array of tab id → label; addons add their tab |
| `eventon_settings_tabs_{tab_id}` | action | Renders content for a specific settings tab |
| `eventon_settings_general` | filter | Fields in General section |
| `eventon_settings_time` | filter | Fields in Time section |
| `eventon_settings_3rdparty` | filter | Fields in Third-party section |
| `eventon_appearance_add` | filter | Appearance settings fields (used by Slider, FullCal) |
| `eventon_settings_lang_tab_content` | filter | Language tab extra fields |
| `evo_save_settings_optionvals` | filter | Option values before saving |
| `evo_before_settings_saved` | action | Before settings save |
| `evo_after_settings_saved` | action | After settings save |

**Frontend — Calendar rendering:**
| Hook | Type | Purpose |
|------|------|---------|
| `eventon_shortcode_defaults` | filter | Default shortcode attributes; addons add their params |
| `eventon_shortcode_popup` | filter | Shortcode generator popup fields |
| `eventon_ajax_arguments` | filter | Calendar AJAX args; addons modify query parameters |
| `evo_init_ajax_data` | filter | Initial page data sent to JS |
| `evo_global_data` | filter | Global JS data object |
| `evo_calendar_defaults` | filter | Calendar default config for JS |

**Frontend — Event card / eventtop:**
| Hook | Type | Purpose |
|------|------|---------|
| `eventon_eventcard_array` | filter | Event card sections array; addons append section names |
| `eventon_eventcard_boxes` | filter | Ordered list of eventcard box names |
| `eventon_eventCard_{box_name}` | filter | HTML content for a named box; **primary content injection point** |
| `eventon_eventtop_{field}` | filter | HTML for a named eventtop field |
| `eventon_eventtop_abovetitle` | filter | HTML above event title |
| `evo_eventtop_adds` | filter | Add items to eventtop render list |
| `evo_eventcard_adds` | filter | Add items to eventcard render list |
| `evo_load_event` | action | When a single event is loaded (used by RSVP to hydrate data) |
| `eventon_enqueue_scripts` | action | Addons enqueue their JS here |
| `eventon_enqueue_styles` | action | Addons enqueue their CSS here |
| `evo_register_other_styles_scripts` | action | Addons register (not enqueue) their assets |
| `evo_addon_styles` | action | Print inline addon styles |
| `evo_frontend_lightbox` | filter | Lightbox registration |
| `evo_cal_above_header_btn` | filter | Buttons above calendar header |
| `evo_view_switcher_items` | action | View switcher items (FullCal, WeeklyView register here) |

**Webhooks:**
| Hook | Type | Purpose |
|------|------|---------|
| `evo_webhook_triggers` | filter | Available webhook trigger names |
| `evo_webhooks_data` | filter | Data payload for webhook; addons merge their fields |

### Per-Add-on Integration Summary

| Add-on | Core hooks used | What it adds |
|--------|-----------------|--------------|
| **eventon-rsvp** | `evonton_eventCard_evorsvp`, `eventon_eventcard_array`, `evo_eventtop_adds`, `evo_load_event`, `eventon_save_meta`, `eventon_settings_tabs`, `eventon_settings_tabs_evcal_rs`, `eventon_add_meta_boxes` | `evo-rsvp` CPT; RSVP form on event card; admin RSVP management; digest email cron |
| **eventon-tickets** | `eventon_eventCard_evotx`, `eventon_eventcard_array`, `eventon_eventcard_boxes`, `eventen_settings_tabs`, `eventon_settings_tabs_evcal_tx`, `evo_webhook_triggers` | `evo-tix` CPT; WooCommerce ticket products; add-to-cart flow |
| **eventon-seats** | Init-guards on `plugins_loaded` (requires `evotx`); `eventon_eventcard_array`; admin metabox | Seat map; seat-linked ticket inventory |
| **eventon-slider** | `eventon_shortcode_popup`, `eventon_shortcode_defaults`, `eventon_appearance_add`, `eventon_inline_styles_array`, `eventon_cal_class` | `[add_eventon_slider]` shortcode; slider JS/CSS |
| **eventon-full-cal** | `eventon_shortcode_popup`, `eventon_shortcode_defaults`, `eventon_ajax_arguments`, `evo_global_data`, `evo_init_ajax_data`, `evo_view_switcher_items`, `eventon_appearance_add`, `eventon_below_sorts` | `[add_eventon_fc]` shortcode; monthly grid calendar using FullCalendar.js |
| **eventon-weekly-view** | `eventon_shortcode_popup`, `eventon_shortcode_defaults`, `evo_view_switcher_items`, `eventon_ajax_arguments` | Week-grid calendar view |
| **eventon-wishlist-add-on** | `eventon_eventcard_array`, `eventon_eventCard_evowi`, `eventon_enqueue_scripts` | Wishlist icon on event cards; wishlist page shortcode |
| **eventon-csv-importer** | Admin-only; no frontend hooks | Admin import page; reads CSV → creates `ajde_events` posts |
| **eventon-qrcode** | `eventon_eventcard_array`, admin hooks; depends on `evotx`/`evors` | QR code generation; check-in scanner page |
| **eventon-rsvp-events-waitlist** | Depends on `evors`; `eventon_save_meta`, admin metabox | Waitlist management for RSVP |
| **eventon-rsvp-invitees** | Depends on `evors`; `evonton_eventCard_evorsi`, admin metabox | Invitee list; restricts RSVP to invited emails |
| **eventon-ticket-variations-options** | Depends on `evotx`; ticket metabox hooks | Ticket variation (size/type) and option selections |

### Capability / Feature Flag System
- No formal feature-flag API. Features are controlled via `evcal_options_evcal_1` (get_option) key-value pairs.
- Each setting is a `yesno` field stored as `'yes'`/`'no'` string. Pattern: `EVO()->cal->check_yn('key_name', 'evcal_1')`.
- Add-ons store their own options in separate option keys (e.g., `evcal_options_evcal_rs` for RSVP, `evcal_options_evcal_tx` for Tickets).
- License/product activation is checked via `EVO_Product_Lic::kriyathmakada()` — returns false if not activated.

### Template Override System
Core uses `template_locator()` to find templates:
1. `{THEME}/eventon/{append}/{file}` — child theme override
2. `{CHILD_THEME}/{file}` — root child theme
3. Plugin default path

Add-ons follow the same pattern, calling `EVO()->template_locator()`.
