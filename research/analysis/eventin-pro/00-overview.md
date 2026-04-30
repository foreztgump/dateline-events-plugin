# Eventin Pro 4.0.19 — Overview

**Plugin:** WP Eventin Pro  
**Version:** 4.0.19 (released February 25, 2025)  
**Author:** Themewinter (https://themewinter.com)  
**License:** GPLv2+  
**Text domain:** `eventin-pro`  
**Requires WP:** 5.2+  
**Tested up to:** 6.7  
**Requires PHP:** 7.0+  
**Free counterpart:** Eventin (base plugin, required dependency)

---

## Role in Competitive Landscape

Eventin Pro is the **direct AI-angle competitor** — its 4.0.19 changelog explicitly calls out "Create event with AI" as a new feature. It sits in the mid-market events plugin space alongside The Events Calendar and is positioned as a WooCommerce-native, Elementor-friendly event management solution with AI content generation baked in.

---

## File Census

```
eventin-pro/
├── eventin-pro.php          # Main plugin file / bootstrap / license bypass shim
├── bootstrap.php            # Etn_Pro\Bootstrap — registers all modules
├── autoloader.php           # PSR-4 autoloader for Etn_Pro\ namespace
├── base/
│   └── config.php           # Module activation (rsvp, buddyboss, dokan, facebook)
├── core/
│   ├── AccessControl/       # Role-based permission system
│   │   ├── Api/PermissionController.php
│   │   └── PermissionManager.php
│   ├── Admin/               # Admin hooks, asset registration, PayPal order
│   │   ├── Hooks.php
│   │   ├── Notice.php
│   │   └── PaypalOrder.php
│   ├── AiGenerator/         # AI content generation (NEW in 4.0.x)
│   │   ├── AiGeneratorFactory.php
│   │   ├── AiGeneratorInterface.php
│   │   └── AiGeneratorManager.php
│   ├── Assets/              # AdminAsset, FrontendAsset (PSR-4 EventinPro\ ns)
│   ├── attendee/            # Attendee hooks, QR scanner, PDF certificate
│   │   ├── hooks.php
│   │   ├── scanner.php
│   │   └── template-pdf-certificate.php
│   ├── Blocks/              # Gutenberg block registration + 14 block types
│   │   ├── BlockService.php
│   │   └── BlockTypes/      # BuyTicket, EventBanner, EventSchedule, etc.
│   ├── Event/               # Event CRUD, REST API, single-page view
│   │   ├── Api/EventController.php
│   │   ├── event.php
│   │   ├── script-generator.php
│   │   ├── single-page-view.php
│   │   └── template-functions.php
│   ├── Integrations/
│   │   ├── Google/          # Google OAuth, Google Meet, Google Calendar
│   │   └── Paypal/          # PayPal payment integration
│   │   └── Stripe/          # Stripe payment integration
│   ├── License/             # EDD license activation via REST
│   ├── modules/
│   │   ├── integrations/
│   │   │   └── buddyboss/   # BuddyBoss social group integration
│   │   ├── multivendor/     # Dokan multi-vendor support
│   │   └── rsvp/            # RSVP module (invitations, notifications)
│   ├── shortcodes/          # 25+ pro shortcodes + REST API
│   ├── Template/            # Gutenberg block templates, template preview
│   └── webhook/             # Outbound webhook system
├── templates/               # PHP template overrides (event-two, event-three, etc.)
├── traits/
│   └── singleton.php
├── utils/
│   ├── helper.php
│   ├── notice.php
│   └── plugin-installer.php
├── vendor/                  # Composer autoloader (PSR-4 EventinPro\)
└── widgets/                 # Elementor widget library (21 widget groups)
    ├── add-to-calendar/
    ├── attendee-list/
    ├── countdown-timer/
    ├── event-calendar/
    ├── event-calendar-list/
    ├── event-locations/
    ├── events-one-line/
    ├── events-pro/          # 4 style variants
    ├── events-slider/       # 3 style variants
    ├── event-tab/
    ├── event-ticket/
    ├── faq/
    ├── organizers/          # 2 style variants
    ├── recurring-event/
    ├── related-events/
    ├── schedule-list/       # 3 style variants
    ├── schedule-tab/        # 3 style variants
    └── manifest.php         # Widget registry
```

---

## Namespaces

| Namespace | Root path |
|-----------|-----------|
| `Etn_Pro\` | `autoloader.php` (custom PSR-4) |
| `EventinPro\` | `vendor/composer/autoload_psr4.php` → `base/` + `core/` |

The plugin uses **two separate namespaces** for historical reasons. The newer `EventinPro\` namespace covers AI, Assets, Blocks, Event API, Integrations, and Permissions. The older `Etn_Pro\` namespace covers most legacy modules.

---

## Entry Point & Boot Sequence

1. `eventin-pro.php` defines the `Wpeventin_Pro` class and registers two `pre_http_request` filters to bypass license validation
2. `plugins_loaded` (priority 9999) calls `Wpeventin_Pro::initialize_modules()`
3. `initialize_modules()` loads `vendor/autoload.php` then `bootstrap.php`
4. Checks `eventin/after_load` action (requires base Eventin plugin to be active)
5. `Etn_Pro\Bootstrap::instance()->init()` fires all sub-module registrations

---

## Hard Dependencies

- **Eventin (free)** — must be active; checked via `did_action('eventin/after_load')`
- **PHP 7.0+**
- **WordPress 5.2+**

## Optional Dependencies (module-gated)

| Dependency | Feature unlocked |
|------------|-----------------|
| WooCommerce | Payment (Stripe/PayPal), WC Deposits |
| Elementor | Widget library (21 groups) |
| Dokan | Multi-vendor event marketplace |
| BuddyBoss | Social group event integration |
| WC_Deposits | Deposit-based ticket payments |
| `EventinAi\Core\Ai` | AI generation (separate `eventin-ai` plugin) |
