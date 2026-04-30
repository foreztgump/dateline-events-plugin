---
plugin: The Events Calendar Pro
version: 7.4.5
analyzed: 2026-04-30
analyst: factory-droid
phase: P1 — Static Analysis
---

# 00 — Overview: The Events Calendar Pro 7.4.5

## Plugin Identity

| Field | Value |
|---|---|
| Plugin Name | The Events Calendar Pro |
| Slug | `events-calendar-pro` |
| Text Domain | `tribe-events-calendar-pro` |
| Version | 7.4.5 |
| License | GPLv2 or later |
| Authors | The Events Calendar (StellarWP) |
| Requires PHP | 7.4 |
| Requires WordPress | 6.5 |
| Tested up to Elementor | 3.23.1 / Pro 3.23.0 |
| Required TEC (base plugin) | 6.11.1+ (see `Plugin_Register.php`) |

ECP is a **premium add-on** — it will not boot without The Events Calendar (free, `tribe-events-calendar`) present and at a compatible version. It is not standalone.

## Entry Point

`events-calendar-pro.php` (root)

Boot sequence:
1. Defines `EVENTS_CALENDAR_PRO_DIR` and `EVENTS_CALENDAR_PRO_FILE` constants.
2. Registers on `tribe_common_loaded` (priority 5) → `tribe_register_pro()` — initialises autoloading and `Tribe__Events__Pro__Plugin_Register`.
3. Falls back to `plugins_loaded` (priority 50) if Common has not yet fired.
4. On `tribe_common_loaded` → `tribe_events_calendar_pro_init()` — runs version checks, then instantiates `Tribe__Events__Pro__PUE` and `Tribe__Events__Pro__Main::instance()`.
5. Activation hook → `tribe_events_pro_activation()` — flushes rewrite rules; triggers Custom Tables V1 activation if TEC is present.
6. Deactivation hook → `tribe_events_pro_deactivation()` — delegates to `Tribe__Events__Pro__Deactivation`.

Main singleton: `Tribe__Events__Pro__Main` (`src/Tribe/Main.php`), version constant `7.4.5`.

## File Census

| Area | PHP files |
|---|---|
| `src/Tribe/` (legacy namespace) | 351 |
| `src/views/` (front-end templates) | 324 |
| `src/Events_Pro/` (TEC namespace) | 202 |
| `src/admin-views/` | 125 |
| `src/deprecated/` | 30 |
| `src/Events_Virtual/` | 14 |
| `src/functions/` | 9 |
| **Total PHP** | **1 095** |

Other assets: 126 JS files, 53 CSS files, 17 `.mo` translation files + 1 `.pot`.

## Source Tree (top-level `src/` directories)

```
src/
├── admin-views/          Admin-side PHP templates (metaboxes, settings tabs, modals)
│   ├── custom-fields/    Additional Fields admin UI
│   ├── custom-tables-v1/ Recurrence lock notice
│   ├── facebook/         Facebook Live admin
│   ├── google/           Google Meet API admin
│   ├── manager/          Recurring-event edit-scope modal
│   ├── microsoft/        Microsoft Teams admin
│   ├── recurrence/       Classic-editor recurrence sub-templates
│   ├── series-metabox/   Series post-type metabox
│   ├── settings/         Settings tab overrides (defaults, mobile)
│   ├── virtual-metabox/  Virtual Events metabox
│   ├── webex/            Webex admin
│   ├── widgets/          Widget admin views
│   ├── youtube/          YouTube admin
│   └── zoom/             Zoom API admin
│
├── deprecated/           30 shim classes kept for back-compat
│
├── Events_Pro/           Modern TEC namespace (PSR-4: TEC\Events_Pro\)
│   ├── Admin/            Admin controllers
│   ├── Base/             Base query filters (CT1 vs Legacy path switch)
│   ├── Blocks/           Gutenberg blocks (Calendar Embed, Single Venue)
│   ├── Block_Templates/  FSE block templates (Single Venue)
│   ├── Compatibility/    Event Automator compat
│   ├── Custom_Tables/V1/ Full CT1 subsystem (see below)
│   ├── Integrations/     Plugin & theme integrations (Elementor, Divi, etc.)
│   ├── Legacy/           Legacy query filter path
│   ├── Linked_Posts/     Venue / Organizer linked-post taxonomy
│   ├── Modifiers/        Query modifier contracts
│   ├── SEO/              Yoast sitemap integration
│   ├── Site_Health/      WP Site Health info
│   ├── Telemetry/        Usage telemetry
│   └── Views/            CT1-aware view hooks
│
├── Events_Virtual/       Virtual Events subsystem (CT1 compat layer)
│   ├── Compatibility/    Event Automator compat
│   ├── Custom_Tables/V1/ CT1 integration for Virtual
│   └── Integrations/     Plugin integrations
│
├── functions/
│   ├── php-min-version.php  PHP version guard
│   └── template-tags/       Public template-tag functions (general, organizer, venue,
│                            widgets, ical, series)
│
├── modules/              React/JS block modules (icons, blocks source)
│
├── resources/
│   ├── css/              Compiled stylesheets (admin, app, CT1, integrations)
│   ├── images/           Migration UI images
│   ├── includes/         PHP-side resource helpers
│   └── js/               Compiled JS (admin, app, blocks, CT1, views)
│
├── Tribe/                Legacy namespace (Tribe__Events__Pro__)
│   ├── Admin/            Admin list, manager, custom-meta tools
│   ├── APM_Filters/      APM (Filter Bar) integration
│   ├── CSV_Importer/     CSV import column extensions
│   ├── Customizer/       WP Customizer integration (color settings)
│   ├── Date_Series_Rules/ Recurrence rule date-series logic
│   ├── Editor/           Block-editor recurrence integration
│   ├── Event_Status/     Moved-online / cancelled event status
│   ├── Integrations/     Page-builder & SEO integrations
│   │   ├── Beaver_Builder
│   │   ├── Brizy_Builder
│   │   ├── Elementor
│   │   ├── Event_Automator (Zapier / Power Automate)
│   │   ├── Fusion (Avada)
│   │   ├── Site_Origin
│   │   ├── WPML
│   │   └── WP_SEO (Yoast)
│   ├── Models/           Legacy ORM models
│   ├── PUE/              Plugin Update Engine (license management)
│   ├── Recurrence/       Core recurrence engine (rules, exceptions, queue)
│   ├── Repositories/     ORM repository extensions
│   ├── Rewrite/          URL rewrite extensions
│   ├── Service_Providers/ DI container service providers
│   ├── Shortcodes/       `[tribe_events]` shortcode + inline event shortcode
│   ├── Updates/          Update/migration routines
│   ├── Views/            V2 view hooks and view-specific classes
│   │   └── V2/           Widgets, shortcode REST, view filters
│   └── Virtual/          Virtual Events main classes (Zoom, Google, MS, Webex, YouTube, Facebook)
│
└── views/                Front-end PHP templates
    ├── v2/               V2 view templates (day, list, map, month, organizer,
    │                     photo, recurrence, summary, venue, week, widgets)
    ├── blocks/           Block editor output templates
    ├── compatibility/    Event Tickets compat templates
    ├── custom-tables-v1/ CT1 recurrence display templates
    ├── facebook/         Facebook Live embed templates
    ├── google/           Google Meet templates
    ├── iframe/           Calendar Embed iframe templates
    ├── integrations/     Elementor / Event Tickets templates
    ├── microsoft/        Microsoft Teams templates
    ├── single/           Single-event overrides
    ├── webex/            Webex templates
    ├── youtube/          YouTube templates
    └── zoom/             Zoom templates
```

## Custom Tables V1 Subsystem (`Events_Pro/Custom_Tables/V1/`)

This is the largest sub-system (the CT1 "new recurrence engine" introduced in ECP 6.0):

```
Custom_Tables/V1/
├── Adapters/       Query adapters bridging WP_Query ↔ CT1 tables
├── Admin/          Admin list columns, CT1 migration notices
├── Duplicate/      Event duplication with series awareness
├── Editors/        Block + Classic editor CT1 integration
├── Events/         Occurrence generator, provisional post IDs, rule converter
├── Events_Manager/ CT1-aware event manager
├── Integrations/   APM, Filter Bar, WPML integrations
├── Legacy_Compat/  Backward compat with old _EventRecurrence meta
├── Links/          CT1-aware permalink handling
├── Migration/      Migration from legacy recurrence meta → CT1 tables
├── Models/         ORM models (Occurrence, Series)
├── Repository/     CT1-aware event repository
├── REST/V1/        REST endpoints (Notices, Calendar Embed)
├── RRule/          RRULE / RDATE / EXRULE parsing wrappers
├── Series/         Series post-type registration and admin
├── Tables/         Schema definitions (Events field, Occurrences field, Series_Relationships table)
├── Templates/      CT1 admin view templates
├── Traits/         Shared CT1 traits
├── Updates/        Save/update pipeline (scope selection: this/upcoming/all)
├── Views/V2/       CT1-aware V2 view integration
└── WP_Query/       Custom query modifier and CT1 repository adapter
```

## Dependency Map

```
events-calendar-pro (ECP) 7.4.5
├── HARD DEPENDENCY: The Events Calendar (TEC) ≥ 6.11.1
│   └── Provides: Tribe__Events__Main, Tribe__Main (Common), CT1 base tables
│                 (tec_events, tec_occurrences), WP_Query integration,
│                 REST namespace tec/v1
├── COMPOSER (vendor/):
│   ├── defuse/php-encryption v2.4.0   (API credential encryption)
│   └── paragonie/random_compat v9.99.100  (PHP 7 random_bytes polyfill)
├── OPTIONAL INTEGRATIONS (gracefully absent):
│   ├── Event Tickets / Event Tickets Plus  (ticketing compat)
│   ├── The Events Calendar Filter Bar      (APM filter integration)
│   ├── Event Aggregator                    (CSV import columns)
│   ├── Event Automator (Zapier / Power Automate)
│   ├── Elementor / Elementor Pro ≤ 3.23
│   ├── Beaver Builder
│   ├── Avada (Fusion)
│   ├── Brizy Builder
│   ├── SiteOrigin Page Builder
│   ├── WPML                               (multilingual)
│   └── Yoast SEO                          (sitemap customisation)
└── EXTERNAL APIS (runtime, all optional):
    ├── Google Meet API
    ├── Microsoft Teams (Graph API)
    ├── Zoom API
    ├── Webex API
    ├── YouTube (oEmbed / Live)
    └── Facebook Live
```

## Namespace Strategy

ECP uses two parallel namespaces reflecting its 13-year history:

| Namespace prefix | Location | Style |
|---|---|---|
| `Tribe__Events__Pro__` | `src/Tribe/` | Legacy PEAR-style (snake underscores) |
| `TEC\Events_Pro\` | `src/Events_Pro/` | Modern PSR-4 |
| `Tribe\Events\Pro\` | `src/Events_Pro/` (aliases) | Mixed (transitional) |
| `Tribe\Events\Pro\Views\V2\` | `src/Tribe/Views/V2/` | V2 view classes |

The autoloader registers `Tribe__Events__Pro__` → `src/Tribe/` and loads each deprecated class by file path. The Composer autoloader handles `TEC\Events_Pro\` and `Tribe\Events\Pro\`.
