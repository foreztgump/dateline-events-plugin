"""
Events Calendar Pro UX Documentation Capture Script
PRO-326 — Feature inventory: 04-admin-ux, 05-frontend-ux, 06-integrations, screenshots/

Pattern adapted from research/analysis/eventin-pro/capture.py (PRO-330).
"""

import json
import os
from playwright.sync_api import sync_playwright, Page

BASE_URL = "https://dateline-site-a.ddev.site:8443"
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
OUTPUT_DIR = os.path.dirname(__file__)

observations = {
    "admin_screens": [],
    "frontend_screens": [],
    "settings_tabs": [],
    "metaboxes": [],
    "tec_menus": [],
    "rest_api": [],
}


def ss(page: Page, name: str, desc: str) -> str:
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    size = os.path.getsize(path)
    print(f"  📸 {name}.png — {desc} ({size:,} bytes)")
    return f"{name}.png"


def get_body_text(page: Page, max_chars: int = 8000) -> str:
    return page.evaluate(
        """(maxChars) => {
        const cloned = document.body.cloneNode(true);
        ['script','style','noscript','#adminmenuwrap','#wpfooter',
         '#screen-meta','#screen-meta-links','#wpadminbar'].forEach(sel => {
            cloned.querySelectorAll(sel).forEach(el => el.remove());
        });
        return (cloned.innerText || '').substring(0, maxChars);
    }""",
        max_chars,
    )


def login(page: Page):
    page.goto(f"{BASE_URL}/wp-login.php", wait_until="domcontentloaded", timeout=20000)
    page.fill("#user_login", "admin")
    page.fill("#user_pass", "adminpass123")
    page.click("#wp-submit")
    page.wait_for_url("**/wp-admin/**", timeout=20000)
    print("✓ Logged in as admin")


def admin_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=25000)
        page.wait_for_timeout(1000)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page)
        tabs = page.evaluate(
            """() => {
            const tabs = [];
            document.querySelectorAll('.nav-tab, .tribe-events-admin__nav-tab, [role=tab]').forEach(t => {
                const txt = (t.textContent || '').trim();
                if (txt) tabs.push(txt);
            });
            return tabs;
        }"""
        )
        observations["admin_screens"].append(
            {
                "path": path,
                "name": name,
                "desc": desc,
                "title": title,
                "screenshot": shot,
                "tabs": tabs,
                "body_excerpt": content[:1500],
            }
        )
    except Exception as e:
        print(f"  ⚠️  {name} failed: {e}")
        observations["admin_screens"].append(
            {"path": path, "name": name, "desc": desc, "error": str(e)}
        )


def frontend_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=25000)
        page.wait_for_timeout(1500)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page)
        observations["frontend_screens"].append(
            {
                "path": path,
                "name": name,
                "desc": desc,
                "title": title,
                "screenshot": shot,
                "body_excerpt": content[:1500],
            }
        )
    except Exception as e:
        print(f"  ⚠️  {name} failed: {e}")
        observations["frontend_screens"].append(
            {"path": path, "name": name, "desc": desc, "error": str(e)}
        )


def harvest_admin_menu(page: Page):
    """Capture the TEC sidebar menu structure."""
    page.goto(f"{BASE_URL}/wp-admin/", wait_until="networkidle", timeout=15000)
    menus = page.evaluate(
        """() => {
        const items = [];
        document.querySelectorAll('#adminmenu li.menu-top').forEach(top => {
            const a = top.querySelector('a.menu-top');
            if (!a) return;
            const label = (a.querySelector('.wp-menu-name')?.textContent || a.textContent || '').trim();
            const href = a.getAttribute('href') || '';
            const subs = [];
            top.querySelectorAll('.wp-submenu li a').forEach(s => {
                const sl = (s.textContent || '').trim();
                const sh = s.getAttribute('href') || '';
                if (sl) subs.push({label: sl, href: sh});
            });
            items.push({label, href, sublinks: subs});
        });
        return items;
    }"""
    )
    observations["tec_menus"] = menus


def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )
        page = context.new_page()
        page.set_default_timeout(25000)

        login(page)
        harvest_admin_menu(page)

        # ----------------------------------------------------------------
        # ADMIN — TEC + ECP
        # ----------------------------------------------------------------
        admin_screen(page, "/wp-admin/edit.php?post_type=tribe_events",
                     "admin-001-events-list", "Events list table")
        admin_screen(page, "/wp-admin/post-new.php?post_type=tribe_events",
                     "admin-002-event-new", "New event editor (Gutenberg)")
        admin_screen(page, "/wp-admin/edit.php?post_type=tribe_venue",
                     "admin-003-venues-list", "Venues list table")
        admin_screen(page, "/wp-admin/post-new.php?post_type=tribe_venue",
                     "admin-004-venue-new", "New venue editor")
        admin_screen(page, "/wp-admin/edit.php?post_type=tribe_organizer",
                     "admin-005-organizers-list", "Organizers list table")
        admin_screen(page, "/wp-admin/post-new.php?post_type=tribe_organizer",
                     "admin-006-organizer-new", "New organizer editor")
        admin_screen(page, "/wp-admin/edit.php?post_type=tribe_event_series",
                     "admin-007-series-list", "Series list table (CT1)")
        admin_screen(page, "/wp-admin/edit-tags.php?taxonomy=tribe_events_cat&post_type=tribe_events",
                     "admin-008-categories", "Event categories taxonomy")

        # Settings tabs
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings",
                     "admin-010-settings-general", "Settings: General")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=display",
                     "admin-011-settings-display", "Settings: Display")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=defaults",
                     "admin-012-settings-defaults", "Settings: Defaults (ECP)")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=imports",
                     "admin-013-settings-imports", "Settings: Imports")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations",
                     "admin-014-settings-integrations", "Settings: Integrations")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=apis",
                     "admin-015-settings-apis", "Settings: APIs")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=addons",
                     "admin-016-settings-addons", "Settings: Add-ons")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=licenses",
                     "admin-017-settings-licenses", "Settings: Licenses (PUE)")

        # Virtual Events provider settings (within Integrations)
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations#tribe-tab-section-zoom",
                     "admin-020-integrations-zoom", "Integrations: Zoom")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations#tribe-tab-section-google",
                     "admin-021-integrations-google", "Integrations: Google Meet")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations#tribe-tab-section-microsoft",
                     "admin-022-integrations-microsoft", "Integrations: Microsoft Teams / Webex")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations#tribe-tab-section-youtube",
                     "admin-023-integrations-youtube", "Integrations: YouTube")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=integrations#tribe-tab-section-facebook",
                     "admin-024-integrations-facebook", "Integrations: Facebook Live")

        # Tools / advanced
        admin_screen(page, "/wp-admin/edit.php?post_type=tribe_events&page=aggregator",
                     "admin-030-aggregator", "Event Aggregator (importer)")
        admin_screen(page, "/wp-admin/admin.php?page=tec-events-settings&tab=display#tribe-tab-section-additional-fields",
                     "admin-031-additional-fields", "Additional Fields setup")
        admin_screen(page, "/wp-admin/admin.php?page=tec-troubleshooting",
                     "admin-032-troubleshooting", "Troubleshooting")

        # Editor screen for an existing event (recurring) — id 6 from seed
        admin_screen(page, "/wp-admin/post.php?post=6&action=edit",
                     "admin-040-edit-recurring", "Edit recurring event (CT1 prompt)")

        # ----------------------------------------------------------------
        # FRONTEND — calendar views
        # ----------------------------------------------------------------
        frontend_screen(page, "/events/", "frontend-001-default", "Default calendar (list/month)")
        frontend_screen(page, "/events/list/", "frontend-002-list", "List view")
        frontend_screen(page, "/events/month/", "frontend-003-month", "Month view")
        frontend_screen(page, "/events/day/", "frontend-004-day", "Day view")
        frontend_screen(page, "/events/week/", "frontend-005-week", "Week view (ECP)")
        frontend_screen(page, "/events/photo/", "frontend-006-photo", "Photo view (ECP)")
        frontend_screen(page, "/events/map/", "frontend-007-map", "Map view (ECP)")
        frontend_screen(page, "/events/summary/", "frontend-008-summary", "Summary view (ECP)")

        # Single event — slugs derived from seeded titles
        frontend_screen(page, "/event/tech-meetup-cloudflare-workers-deep-dive/",
                        "frontend-010-single-standard", "Single event — standard")
        frontend_screen(page, "/event/virtual-workshop-edge-compute-patterns/",
                        "frontend-011-single-virtual", "Single event — virtual (Zoom)")
        frontend_screen(page, "/event/weekly-tuesday-standup/",
                        "frontend-012-single-recurring", "Single event — recurring")
        frontend_screen(page, "/event/annual-conference-2026/",
                        "frontend-013-single-multiday", "Single event — multi-day")

        # Venues / organizers
        frontend_screen(page, "/venue/soundcheck-hall/",
                        "frontend-020-venue-archive", "Venue archive page")
        frontend_screen(page, "/organizer/dateline-productions/",
                        "frontend-021-organizer-archive", "Organizer archive page")

        # Past events
        frontend_screen(page, "/events/list/?tribe_event_display=past",
                        "frontend-030-past", "Past events filter")

        # iCal export
        frontend_screen(page, "/?ical=1&tribe_display=list",
                        "frontend-040-ical", "iCal export endpoint")

        # ----------------------------------------------------------------
        # SAVE
        # ----------------------------------------------------------------
        with open(os.path.join(OUTPUT_DIR, "observations.json"), "w") as f:
            json.dump(observations, f, indent=2)
        print(f"\n✓ {len(observations['admin_screens'])} admin screens captured")
        print(f"✓ {len(observations['frontend_screens'])} frontend screens captured")
        print(f"✓ Saved observations.json")
        browser.close()


if __name__ == "__main__":
    main()
