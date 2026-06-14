"""
EventON 4.8 + 12 add-ons UX documentation capture script
PRO-333 — Feature inventory: 04-admin-ux, 05-frontend-ux, 06-integrations, screenshots/

Run from project root via:
    python3 capture.py

Output:
    screenshots/  — full-page PNGs
    observations.json — structured data per screen (URL, title, tabs, form fields, content)
"""

import json
import os
from playwright.sync_api import sync_playwright, Page

BASE_URL = os.environ.get("DDEV_BASE_URL", "https://dateline-site-b.ddev.site:8443")
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
OUTPUT_DIR = os.path.dirname(__file__)
USERNAME = os.environ.get("DDEV_USERNAME", "admin")
PASSWORD = os.environ["DDEV_PASSWORD"]

observations = {
    "admin_screens": [],
    "frontend_screens": [],
    "rest_api": [],
    "eventon_menus": [],
    "settings_sections": [],
    "event_metaboxes": [],
    "shortcodes_seen": [],
    "js_globals": {},
}


# ------------------------------------------------------------------ helpers
def ss(page: Page, name: str, desc: str) -> str:
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {name}.png — {desc}")
    return f"{name}.png"


def get_body_text(page: Page, max_chars: int = 6000) -> str:
    return page.evaluate("""(max) => {
        const cloned = document.body.cloneNode(true);
        ['script','style','noscript','#adminmenuwrap','#wpfooter',
         '#screen-meta','#screen-meta-links','#wpadminbar'].forEach(sel => {
            cloned.querySelectorAll(sel).forEach(el => el.remove());
        });
        return (cloned.innerText || '').substring(0, max);
    }""", max_chars)


def login(page: Page):
    page.goto(f"{BASE_URL}/wp-login.php")
    page.fill("#user_login", USERNAME)
    page.fill("#user_pass", PASSWORD)
    page.click("#wp-submit")
    page.wait_for_url("**/wp-admin/**", timeout=15000)
    print("✓ Logged in as admin")


def admin_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=25000)
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass  # networkidle not required for screenshot
        page.wait_for_timeout(2000)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page)
        tabs = page.evaluate("""() => {
            const tabs = [];
            document.querySelectorAll('.nav-tab, .evo-settings-tab, .evcal-tab, [role=tab], '
                + '.evosett_navi a, .lvl1_navi a').forEach(t => {
                const txt = t.textContent.trim();
                if (txt) tabs.push(txt);
            });
            return Array.from(new Set(tabs));
        }""")
        form_fields = page.evaluate("""() => {
            const fields = [];
            document.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
                fields.push({
                    type: el.tagName.toLowerCase() + (el.type ? ':' + el.type : ''),
                    name: el.getAttribute('name'),
                    label: el.labels?.[0]?.textContent?.trim() || ''
                });
            });
            return fields.slice(0, 80);
        }""")
        observations["admin_screens"].append({
            "name": name, "desc": desc, "url": path,
            "title": title, "screenshot": shot,
            "tabs": tabs, "form_fields": form_fields,
            "content_excerpt": content,
        })
        print(f"  ✓ {desc}")
        return True
    except Exception as e:
        print(f"  ✗ {desc} — {str(e)[:90]}")
        return False


def frontend_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=25000)
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        # If this is an EventON-rendered page, wait for AJAX-loaded events to appear
        try:
            has_evcal = page.locator(".ajde_evcal_calendar, .eventon_events_list, "
                                     ".evo_events_list_box").count() > 0
            if has_evcal:
                try:
                    page.wait_for_selector(".eventon_list_event, .evcal_list_a, "
                                           ".evo_event_box", timeout=8000)
                except Exception:
                    pass
                page.wait_for_timeout(2500)
            else:
                page.wait_for_timeout(2000)
        except Exception:
            page.wait_for_timeout(2000)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page, 5000)
        observations["frontend_screens"].append({
            "name": name, "desc": desc, "url": path,
            "title": title, "screenshot": shot,
            "content_excerpt": content,
        })
        print(f"  ✓ Frontend: {desc}")
        return True
    except Exception as e:
        print(f"  ✗ Frontend: {desc} — {str(e)[:90]}")
        return False


def check_rest(page: Page, endpoint: str):
    try:
        resp = page.request.get(f"{BASE_URL}{endpoint}")
        observations["rest_api"].append({
            "endpoint": endpoint, "status": resp.status,
            "sample": resp.text()[:600],
        })
        print(f"  REST {endpoint}: {resp.status}")
    except Exception as e:
        print(f"  REST {endpoint}: error — {str(e)[:60]}")


# ------------------------------------------------------------------ main
def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        login(page)

        # =========================================================
        # 1. Discover admin menus
        # =========================================================
        print("\n--- Discovering EventON menus ---")
        page.goto(f"{BASE_URL}/wp-admin/", wait_until="domcontentloaded", timeout=25000)
        try:
            page.wait_for_load_state("networkidle", timeout=6000)
        except Exception:
            pass
        menus = page.evaluate("""() => {
            const result = [];
            document.querySelectorAll('#adminmenu li.menu-top').forEach(li => {
                const a = li.querySelector('a.menu-top');
                if (!a) return;
                const text = a.textContent.trim().replace(/\\d+$/, '').trim();
                const href = a.getAttribute('href');
                const subs = [];
                li.querySelectorAll('li a').forEach(sa => {
                    subs.push({ text: sa.textContent.trim(), href: sa.getAttribute('href') });
                });
                result.push({ text, href, subs });
            });
            return result;
        }""")
        observations["eventon_menus"] = menus
        for m in menus:
            if "event" in (m.get("text", "").lower()):
                print(f"  Menu: {m['text']} → {m.get('href', '')}")
                for s in m.get("subs", [])[:10]:
                    if s.get("text"):
                        print(f"    - {s['text']} → {s.get('href', '')}")

        # =========================================================
        # 2. Core CPT admin screens
        # =========================================================
        print("\n--- Admin screens: core CPT ---")
        admin_screen(page, "/wp-admin/edit.php?post_type=ajde_events",
                     "admin-001-events-list", "Events list table (all events)")
        admin_screen(page, "/wp-admin/edit-tags.php?taxonomy=event_type&post_type=ajde_events",
                     "admin-002-tax-event-type", "Taxonomy: Event Type")
        admin_screen(page, "/wp-admin/edit-tags.php?taxonomy=event_location&post_type=ajde_events",
                     "admin-003-tax-event-location", "Taxonomy: Event Location")
        admin_screen(page, "/wp-admin/edit-tags.php?taxonomy=event_organizer&post_type=ajde_events",
                     "admin-004-tax-event-organizer", "Taxonomy: Event Organizer")

        # =========================================================
        # 3. New / Edit event screen
        # =========================================================
        print("\n--- Admin screens: new event ---")
        admin_screen(page, "/wp-admin/post-new.php?post_type=ajde_events",
                     "admin-010-event-new", "New event creation screen")
        # Scroll captures of new event
        try:
            page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=ajde_events",
                      wait_until="domcontentloaded", timeout=25000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(2500)
        except Exception as e:
            print(f"  ✗ new-event scroll-prep failed: {str(e)[:80]}")
        # Try to expand all closed metaboxes
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        # Capture event-edit metaboxes structure
        metaboxes = page.evaluate("""() => {
            const boxes = [];
            document.querySelectorAll('.postbox').forEach(box => {
                const heading = box.querySelector('h2, h3, .hndle');
                if (heading) {
                    boxes.push({
                        id: box.getAttribute('id'),
                        title: heading.textContent.trim(),
                    });
                }
            });
            return boxes;
        }""")
        observations["event_metaboxes"] = metaboxes
        print("  Event metaboxes:")
        for mb in metaboxes:
            print(f"    [{mb.get('id', '?')}] {mb.get('title', '')}")

        for y, name, desc in [
            (0,    "admin-011-event-new-top",    "New event — top (title + editor)"),
            (700,  "admin-012-event-new-700",    "New event — 700px (date/time)"),
            (1400, "admin-013-event-new-1400",   "New event — 1400px (location/organizer)"),
            (2100, "admin-014-event-new-2100",   "New event — 2100px (repeating, color)"),
            (2800, "admin-015-event-new-2800",   "New event — 2800px (RSVP/tickets metaboxes)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, name, desc)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(400)
        ss(page, "admin-016-event-new-bottom", "New event — bottom (publish box, sidebar)")

        # =========================================================
        # 4. Edit existing seeded event (richer surface)
        # =========================================================
        print("\n--- Admin screens: edit existing event ---")
        # First seeded event ID is 8 (Annual Tech Conference)
        admin_screen(page, "/wp-admin/post.php?post=8&action=edit",
                     "admin-020-event-edit-conference",
                     "Edit Annual Tech Conference (single-day featured)")
        admin_screen(page, "/wp-admin/post.php?post=10&action=edit",
                     "admin-021-event-edit-recurring",
                     "Edit Weekly Developer Meetup (recurring)")
        admin_screen(page, "/wp-admin/post.php?post=12&action=edit",
                     "admin-022-event-edit-cancelled",
                     "Edit Spring Hackathon (cancelled status)")

        # Scroll captures on rich edit screen
        try:
            page.goto(f"{BASE_URL}/wp-admin/post.php?post=8&action=edit",
                      wait_until="domcontentloaded", timeout=25000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(2500)
        except Exception as e:
            print(f"  ✗ edit-event scroll-prep failed: {str(e)[:80]}")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        for y, name, desc in [
            (0,    "admin-023-edit-top",    "Edit event — top"),
            (800,  "admin-024-edit-800",    "Edit event — 800px (date/time + repeating)"),
            (1600, "admin-025-edit-1600",   "Edit event — 1600px (location, organizer, links)"),
            (2400, "admin-026-edit-2400",   "Edit event — 2400px (color, custom meta)"),
            (3200, "admin-027-edit-3200",   "Edit event — 3200px (tickets, RSVP add-on metaboxes)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, name, desc)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(400)
        ss(page, "admin-028-edit-bottom", "Edit event — bottom")

        # =========================================================
        # 5. EventON Settings tabs (top-level)
        # =========================================================
        print("\n--- Admin screens: settings tabs ---")
        settings_top_tabs = [
            ("evcal_1", "admin-100-settings-general",  "Settings (evcal_1) — General"),
            ("evcal_2", "admin-101-settings-language", "Settings (evcal_2) — Language"),
            ("evcal_3", "admin-102-settings-styles",   "Settings (evcal_3) — Styles"),
            ("evcal_4", "admin-103-settings-licenses", "Settings (evcal_4) — Addons & Licenses"),
            ("evcal_5", "admin-104-settings-support",  "Settings (evcal_5) — Support"),
        ]
        for tab, name, desc in settings_top_tabs:
            admin_screen(page, f"/wp-admin/admin.php?page=eventon&tab={tab}",
                         name, desc)

        # =========================================================
        # 6. Settings sub-sections inside evcal_1 (General)
        # =========================================================
        print("\n--- Admin screens: settings sub-sections ---")
        try:
            page.goto(f"{BASE_URL}/wp-admin/admin.php?page=eventon&tab=evcal_1",
                      wait_until="domcontentloaded", timeout=25000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"  ✗ general-settings nav failed: {str(e)[:80]}")
        # Discover sub-section IDs from the lvl1 navigation panel
        sections = page.evaluate("""() => {
            const items = [];
            document.querySelectorAll('.lvl1_navi a, .evosett_lvl1 a, '
                + '[data-section], .nav_under_top a').forEach(a => {
                items.push({
                    text: a.textContent.trim(),
                    href: a.getAttribute('href') || '',
                    section: a.getAttribute('data-section') || '',
                });
            });
            return items;
        }""")
        observations["settings_sections"] = sections
        print(f"  Settings sections discovered: {len(sections)}")
        for s in sections[:25]:
            print(f"    - {s.get('text','')[:60]} | {s.get('section','')}")

        # Capture evcal_1 by scroll position (it's a long page)
        for y, name, desc in [
            (0,    "admin-110-general-top",   "General settings — top"),
            (900,  "admin-111-general-900",   "General settings — 900px"),
            (1800, "admin-112-general-1800",  "General settings — 1800px"),
            (2700, "admin-113-general-2700",  "General settings — 2700px"),
            (3600, "admin-114-general-3600",  "General settings — 3600px"),
            (4500, "admin-115-general-4500",  "General settings — 4500px"),
            (5400, "admin-116-general-5400",  "General settings — 5400px"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, name, desc)

        # =========================================================
        # 7. Add-on settings tabs (RSVP, Tickets, etc.)
        # =========================================================
        print("\n--- Admin screens: add-on settings tabs ---")
        addon_tabs = [
            ("evcal_rs", "admin-120-settings-rsvp",     "Settings — RSVP add-on"),
            ("evcal_tx", "admin-121-settings-tickets",  "Settings — Tickets add-on"),
        ]
        for tab, name, desc in addon_tabs:
            admin_screen(page, f"/wp-admin/admin.php?page=eventon&tab={tab}",
                         name, desc)

        # =========================================================
        # 8. CSV Importer add-on
        # =========================================================
        print("\n--- Admin screens: CSV importer ---")
        admin_screen(page, "/wp-admin/admin.php?page=evocsv",
                     "admin-130-csv-importer", "CSV Importer add-on")

        # =========================================================
        # 9. RSVP records list
        # =========================================================
        print("\n--- Admin screens: RSVP records ---")
        admin_screen(page, "/wp-admin/edit.php?post_type=evo-rsvp",
                     "admin-140-rsvp-records", "RSVP records list")

        # =========================================================
        # 10. Ticket records list (and WC orders filter)
        # =========================================================
        print("\n--- Admin screens: tickets ---")
        # evo-tix CPT is not publicly queryable; ticket admin is via WC orders filter
        admin_screen(page, "/wp-admin/admin.php?page=wc-orders&evofilter=evotix",
                     "admin-150-wc-ticket-orders",
                     "WC orders filtered to ticket orders (Tickets add-on entry point)")

        # =========================================================
        # 11. Welcome / about pages
        # =========================================================
        print("\n--- Admin screens: welcome/about ---")
        admin_screen(page, "/wp-admin/index.php?page=evo-about",
                     "admin-160-welcome-about", "Welcome — About")
        admin_screen(page, "/wp-admin/index.php?page=evo-getting-started",
                     "admin-161-getting-started", "Welcome — Getting Started")
        admin_screen(page, "/wp-admin/index.php?page=evo-changelog",
                     "admin-162-changelog", "Welcome — Changelog")

        # =========================================================
        # 12. WP plugins page (showing all 12 add-ons)
        # =========================================================
        admin_screen(page, "/wp-admin/plugins.php",
                     "admin-170-plugins-list", "WP plugins list (all 12 add-ons)")

        # =========================================================
        # 13. Frontend screens
        # =========================================================
        print("\n--- Frontend screens ---")
        frontend_screen(page, "/", "frontend-001-home", "Site home page")
        frontend_screen(page, "/calendar/", "frontend-010-calendar",
                        "Calendar page — [add_eventon] shortcode (current month)")
        # Re-capture calendar AFTER waiting for AJAX-loaded events to populate
        try:
            page.goto(f"{BASE_URL}/calendar/", wait_until="domcontentloaded", timeout=25000)
            # Wait for AJAX events list to render (loading bars disappear, real events appear)
            try:
                page.wait_for_selector(".eventon_list_event, .evcal_list_a",
                                       timeout=15000)
                page.wait_for_timeout(2000)  # let layout settle
            except Exception:
                page.wait_for_timeout(8000)
            ss(page, "frontend-010a-calendar-loaded",
               "Calendar — current month with events loaded (AJAX complete)")
            # Navigate to next month (May) for full-month population
            next_btn = page.locator("#evcal_next, .evcal_arrows.evcal_btn_next").first
            if next_btn.count() > 0:
                next_btn.click()
                page.wait_for_timeout(3000)
                ss(page, "frontend-010b-calendar-next-month",
                   "Calendar — next month view (May, populated)")
            # Click first event tile to expand the EventON signature slide-down event card
            first_evt = page.locator(".eventon_list_event").first
            if first_evt.count() > 0:
                first_evt.click()
                page.wait_for_timeout(2000)
                ss(page, "frontend-010c-calendar-event-card",
                   "Calendar — expanded event card (signature slide-down)")
        except Exception as e:
            print(f"  ✗ calendar interactions failed: {str(e)[:120]}")
        frontend_screen(page, "/slider/", "frontend-011-slider",
                        "Slider page — [add_eventon_slider]")
        frontend_screen(page, "/weekly/", "frontend-012-weekly-view",
                        "Weekly view — [evcal_weekly]")
        frontend_screen(page, "/full-cal/", "frontend-013-full-calendar",
                        "Full calendar grid — [add_eventon_fc]")
        frontend_screen(page, "/search/", "frontend-014-search",
                        "Search box — [add_eventon_search]")
        frontend_screen(page, "/event-list/", "frontend-015-event-list",
                        "Event list — [add_eventon_list]")

        # Single event pages — use real CPT slug routes
        for slug, name_hint, desc in [
            ("annual-tech-conference-2026",         "single-conference",
             "Single event — Annual Tech Conference"),
            ("hands-on-kubernetes-workshop",        "single-workshop",
             "Single event — Kubernetes Workshop"),
            ("weekly-developer-meetup",             "single-recurring",
             "Single event — Weekly Meetup (recurring)"),
            ("webinar-modern-wordpress-development","single-online",
             "Single event — Online Webinar"),
            ("spring-hackathon-cancelled",          "single-cancelled",
             "Single event — Spring Hackathon (cancelled)"),
        ]:
            frontend_screen(page, f"/events/{slug}/",
                            f"frontend-020-{name_hint}", desc)

        # Events archive
        frontend_screen(page, "/events/", "frontend-030-events-archive",
                        "Events archive (CPT default)")

        # Taxonomy archives
        frontend_screen(page, "/?event_type=conferences",
                        "frontend-031-tax-conferences",
                        "Tax archive — Conferences")
        frontend_screen(page, "/?event_location=san-francisco",
                        "frontend-032-tax-sf",
                        "Tax archive — San Francisco")

        # =========================================================
        # 14. REST API endpoint smoke
        # =========================================================
        print("\n--- REST API smoke ---")
        api_paths = [
            "/wp-json/eventon/v1/events",
            "/wp-json/eventon/v2/events",
            "/wp-json/wp/v2/ajde_events",
            "/wp-json/wp/v2/event_type",
            "/wp-json/wp/v2/event_location",
            "/wp-json/wp/v2/event_organizer",
            "/wp-json/eventon/v2/rsvp",
            "/wp-json/eventon/v1/rsvp",
        ]
        for p in api_paths:
            check_rest(page, p)

        # =========================================================
        # 15. JS globals on calendar frontend
        # =========================================================
        print("\n--- JS globals on calendar page ---")
        try:
            page.goto(f"{BASE_URL}/calendar/", wait_until="domcontentloaded", timeout=25000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(1500)
        except Exception as e:
            print(f"  ✗ calendar nav for JS globals failed: {str(e)[:80]}")
        js_globals = page.evaluate("""() => {
            const out = {};
            ['evosc', 'evolc', 'evcal_dir', 'evo_data', 'evcal_data',
             'evors_data', 'evotx_data', 'evo_tx', 'evors',
             'evo_lazyload', 'evcal_lazy_data'].forEach(k => {
                if (window[k]) {
                    try { out[k] = JSON.parse(JSON.stringify(window[k])); }
                    catch (e) { out[k] = String(window[k]).substring(0, 200); }
                }
            });
            return out;
        }""")
        observations["js_globals"] = js_globals
        print(f"  JS globals discovered: {list(js_globals.keys())}")

        # =========================================================
        # 16. Shortcode generator (in event editor)
        # =========================================================
        print("\n--- Shortcode generator ---")
        try:
            page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=page",
                      wait_until="domcontentloaded", timeout=25000)
            try:
                page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            page.wait_for_timeout(2000)
        except Exception as e:
            print(f"  ✗ page-new nav failed: {str(e)[:80]}")
        ss(page, "admin-180-page-new", "WP Page New (look for shortcode generator button)")
        # Look for the EVO shortcode generator iframe / dialog if accessible
        sg_btn = page.locator(".evosc_btn, .evosg_open_btn, #evo_sc_gen_btn").first
        if sg_btn.count() > 0:
            try:
                sg_btn.click()
                page.wait_for_timeout(1500)
                ss(page, "admin-181-shortcode-generator", "Shortcode generator opened")
            except Exception as e:
                print(f"  ✗ Could not open shortcode generator: {e}")

        browser.close()

    out_path = os.path.join(OUTPUT_DIR, "observations.json")
    with open(out_path, "w") as f:
        json.dump(observations, f, indent=2, default=str)
    print(f"\n✓ Saved {out_path}")
    print(f"✓ Admin screens: {len(observations['admin_screens'])}")
    print(f"✓ Frontend screens: {len(observations['frontend_screens'])}")
    print(f"✓ REST endpoints: {len(observations['rest_api'])}")
    print(f"✓ Settings sections: {len(observations['settings_sections'])}")
    print(f"✓ Event metaboxes: {len(observations['event_metaboxes'])}")
    print(f"✓ JS globals: {len(observations['js_globals'])}")


if __name__ == "__main__":
    main()
