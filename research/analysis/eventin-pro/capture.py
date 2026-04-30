"""
Eventin Pro UX Documentation Capture Script
PRO-330 — Feature inventory: 04-admin-ux, 05-frontend-ux, 06-integrations, screenshots/
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
    "rest_api": [],
    "eventin_menus": [],
}


def ss(page: Page, name: str, desc: str) -> str:
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {name}.png — {desc}")
    return f"{name}.png"


def get_body_text(page: Page, max_chars: int = 6000) -> str:
    return page.evaluate("""() => {
        const cloned = document.body.cloneNode(true);
        ['script','style','noscript','#adminmenuwrap','#wpfooter',
         '#screen-meta','#screen-meta-links','#wpadminbar'].forEach(sel => {
            cloned.querySelectorAll(sel).forEach(el => el.remove());
        });
        return (cloned.innerText || '').substring(0, %d);
    }""" % max_chars)


def login(page: Page):
    page.goto(f"{BASE_URL}/wp-login.php")
    page.fill("#user_login", "admin")
    page.fill("#user_pass", "adminpass123")
    page.click("#wp-submit")
    page.wait_for_url("**/wp-admin/**")
    print("✓ Logged in as admin")


def admin_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(1200)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page)
        # Also get any tab/section structure
        tabs = page.evaluate("""() => {
            const tabs = [];
            document.querySelectorAll('.nav-tab, .eventin-tab, .wp-nav-tab, [role=tab]').forEach(t => {
                tabs.push(t.textContent.trim());
            });
            return tabs;
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
            "content_excerpt": content
        })
        print(f"  ✓ {desc}")
        return True
    except Exception as e:
        print(f"  ✗ {desc} — {str(e)[:80]}")
        return False


def frontend_screen(page: Page, path: str, name: str, desc: str):
    try:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(1000)
        title = page.title()
        shot = ss(page, name, desc)
        content = get_body_text(page, 5000)
        observations["frontend_screens"].append({
            "name": name, "desc": desc, "url": path,
            "title": title, "screenshot": shot,
            "content_excerpt": content
        })
        print(f"  ✓ Frontend: {desc}")
        return True
    except Exception as e:
        print(f"  ✗ Frontend: {desc} — {str(e)[:80]}")
        return False


def check_rest(page: Page, endpoint: str):
    try:
        resp = page.request.get(f"{BASE_URL}{endpoint}")
        status = resp.status
        body = resp.text()[:500]
        observations["rest_api"].append({"endpoint": endpoint, "status": status, "sample": body})
        print(f"  REST {endpoint}: {status}")
    except Exception as e:
        print(f"  REST {endpoint}: error — {str(e)[:60]}")


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        # --- Login ---
        login(page)

        # --- Discover admin menus ---
        print("\n--- Discovering Eventin menus ---")
        page.goto(f"{BASE_URL}/wp-admin/", wait_until="networkidle")
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
        observations["eventin_menus"] = menus
        for m in menus:
            if m.get("text"):
                print(f"  Menu: {m['text']} → {m.get('href', '')}")
                for s in m.get("subs", [])[:5]:
                    if s.get("text"):
                        print(f"    Submenu: {s['text']} → {s.get('href', '')}")

        # --- Admin screens ---
        print("\n--- Admin Screens ---")

        # Core CPT list tables
        admin_screen(page, "/wp-admin/edit.php?post_type=etn",
                     "admin-001-events-list", "Events list table (all events)")
        admin_screen(page, "/wp-admin/post-new.php?post_type=etn",
                     "admin-002-event-new", "New event creation screen")

        # Scroll through new event page to capture metaboxes
        page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=etn",
                  wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)
        ss(page, "admin-002a-event-new-top", "Event creation — top / title area")
        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        ss(page, "admin-002b-event-new-mid", "Event creation — mid / meta fields")
        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        ss(page, "admin-002c-event-new-bottom", "Event creation — bottom / ticket/RSVP area")
        page.evaluate("window.scrollTo(0, 1800)")
        page.wait_for_timeout(500)
        ss(page, "admin-002d-event-new-lowest", "Event creation — lowest / sidebar")

        admin_screen(page, "/wp-admin/edit.php?post_type=etn-attendee",
                     "admin-003-attendees-list", "Attendees list table")
        admin_screen(page, "/wp-admin/edit.php?post_type=etn-speaker",
                     "admin-004-speakers-list", "Speakers list table")
        admin_screen(page, "/wp-admin/edit.php?post_type=etn-webhook",
                     "admin-005-webhooks-list", "Webhooks list")
        admin_screen(page, "/wp-admin/edit.php?post_type=etn-template",
                     "admin-006-templates-list", "Template builder — certificate/ticket templates")

        # Attendee scanner
        admin_screen(page, "/wp-admin/edit.php?post_type=etn-attendee&etn_action=ticket_scanner",
                     "admin-007-ticket-scanner", "QR ticket scanner interface")

        # Settings tabs
        print("\n--- Settings tabs ---")
        settings_tabs = [
            ("", "admin-010-settings-general", "Settings — General"),
            ("&tab=ticket", "admin-011-settings-ticket", "Settings — Ticket"),
            ("&tab=email", "admin-012-settings-email", "Settings — Email notifications"),
            ("&tab=payments", "admin-013-settings-payments", "Settings — Payments (Stripe/PayPal)"),
            ("&tab=zoom", "admin-014-settings-zoom", "Settings — Zoom"),
            ("&tab=google_meet", "admin-015-settings-google", "Settings — Google Meet"),
            ("&tab=certificate", "admin-016-settings-cert", "Settings — Certificate"),
            ("&tab=rsvp", "admin-017-settings-rsvp", "Settings — RSVP"),
            ("&tab=ai", "admin-018-settings-ai", "Settings — AI Generator"),
            ("&tab=advanced", "admin-019-settings-advanced", "Settings — Advanced"),
            ("&tab=api", "admin-020-settings-api", "Settings — API Keys"),
            ("&tab=permission", "admin-021-settings-perm", "Settings — Permissions tab"),
        ]
        for tab_param, name, desc in settings_tabs:
            admin_screen(page, f"/wp-admin/admin.php?page=eventin_settings{tab_param}", name, desc)

        # License page
        admin_screen(page, "/wp-admin/admin.php?page=eventin_license",
                     "admin-030-license", "License activation page")

        # Permission manager
        admin_screen(page, "/wp-admin/admin.php?page=eventin_permission",
                     "admin-031-permissions", "Role-based permissions manager")

        # Shortcode page
        admin_screen(page, "/wp-admin/admin.php?page=eventin_shortcode",
                     "admin-032-shortcodes", "Shortcode configuration page")

        # Addons / extensions
        admin_screen(page, "/wp-admin/admin.php?page=eventin_addon",
                     "admin-033-addons", "Addons / extensions page")

        # Dashboard widget / overview
        admin_screen(page, "/wp-admin/index.php",
                     "admin-040-wp-dashboard", "WP Dashboard with Eventin widgets")

        # --- Create sample event to get richer edit screen ---
        print("\n--- Creating sample event for full edit exploration ---")
        page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=etn", wait_until="networkidle")
        page.wait_for_timeout(3000)

        # Try to fill title
        try:
            title_input = page.locator("#title, .editor-post-title__input").first
            title_input.fill("Sample Eventin Pro Event")
            page.wait_for_timeout(500)
        except Exception:
            pass

        # Attempt to expand all metaboxes
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed, .postbox.hide-if-js').forEach(box => {
                box.classList.remove('closed', 'hide-if-js');
            });
        }""")
        page.wait_for_timeout(1000)

        page.evaluate("window.scrollTo(0, 0)")
        ss(page, "admin-050-event-edit-scroll0", "Event edit — top (title + editor)")
        page.evaluate("window.scrollTo(0, 700)")
        page.wait_for_timeout(300)
        ss(page, "admin-051-event-edit-scroll700", "Event edit — 700px (date/time/location meta)")
        page.evaluate("window.scrollTo(0, 1400)")
        page.wait_for_timeout(300)
        ss(page, "admin-052-event-edit-scroll1400", "Event edit — 1400px (ticket tiers)")
        page.evaluate("window.scrollTo(0, 2100)")
        page.wait_for_timeout(300)
        ss(page, "admin-053-event-edit-scroll2100", "Event edit — 2100px (RSVP, schedule)")
        page.evaluate("window.scrollTo(0, 2800)")
        page.wait_for_timeout(300)
        ss(page, "admin-054-event-edit-scroll2800", "Event edit — 2800px (speakers, organizer)")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(300)
        ss(page, "admin-055-event-edit-bottom", "Event edit — bottom (SEO, publish box)")

        # Get all metaboxes on event edit
        metaboxes = page.evaluate("""() => {
            const boxes = [];
            document.querySelectorAll('.postbox').forEach(box => {
                const heading = box.querySelector('h2, h3, .hndle');
                if (heading) {
                    const id = box.getAttribute('id');
                    boxes.push({ id, title: heading.textContent.trim() });
                }
            });
            return boxes;
        }""")
        print("  Event edit metaboxes:")
        for mb in metaboxes:
            print(f"    [{mb.get('id', '?')}] {mb.get('title', '')}")
        observations["event_metaboxes"] = metaboxes

        # --- Speaker new screen ---
        admin_screen(page, "/wp-admin/post-new.php?post_type=etn-speaker",
                     "admin-060-speaker-new", "New speaker creation screen")

        # Webhook new
        admin_screen(page, "/wp-admin/post-new.php?post_type=etn-webhook",
                     "admin-061-webhook-new", "New webhook creation screen")

        # Template new
        admin_screen(page, "/wp-admin/post-new.php?post_type=etn-template",
                     "admin-062-template-new", "New template (Gutenberg block editor)")

        # --- Frontend screens ---
        print("\n--- Frontend Screens ---")

        frontend_screen(page, "/", "frontend-001-home", "Site home page")

        # Try archive / calendar pages
        frontend_screen(page, "/events/", "frontend-002-events-archive", "Events archive page")
        frontend_screen(page, "/?post_type=etn", "frontend-003-events-query", "Events query")

        # Sample pages
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=page", wait_until="networkidle")
        page_rows = page.evaluate("""() => {
            const rows = [];
            document.querySelectorAll('#the-list tr').forEach(tr => {
                const link = tr.querySelector('.row-title a');
                const viewLink = tr.querySelector('a[href*="/?"]') || tr.querySelector('span.view a');
                if (link) {
                    rows.push({
                        title: link.textContent.trim(),
                        editHref: link.getAttribute('href'),
                        viewHref: viewLink ? viewLink.getAttribute('href') : null
                    });
                }
            });
            return rows;
        }""")
        print(f"  Pages found: {[p['title'] for p in page_rows]}")
        for p in page_rows[:6]:
            if p.get("viewHref"):
                slug = p["viewHref"].split("/wp-admin/")[0] if "/wp-admin/" in str(p["viewHref"]) else p["viewHref"]
                frontend_screen(page, slug.replace(BASE_URL, "") or "/",
                                f"frontend-page-{page_rows.index(p)}",
                                f"Page: {p['title']}")

        # Look for any event single page
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=etn", wait_until="networkidle")
        event_rows = page.evaluate("""() => {
            const rows = [];
            document.querySelectorAll('#the-list tr').forEach(tr => {
                const link = tr.querySelector('.row-title a');
                const viewLink = tr.querySelector('span.view a, a[href*="/etn/"]') ;
                if (link) {
                    rows.push({
                        title: link.textContent.trim(),
                        viewHref: viewLink ? viewLink.getAttribute('href') : null
                    });
                }
            });
            return rows;
        }""")
        print(f"  Events: {[e['title'] for e in event_rows]}")
        for ev in event_rows[:3]:
            if ev.get("viewHref"):
                view_path = ev["viewHref"].replace(BASE_URL, "")
                frontend_screen(page, view_path,
                                f"frontend-event-single-{event_rows.index(ev)}",
                                f"Single event: {ev['title']}")

        # --- REST API checks ---
        print("\n--- REST API ---")
        api_paths = [
            "/wp-json/eventin/v2/events",
            "/wp-json/eventin/v2/permissions",
            "/wp-json/eventin/v2/permissions/current-user",
            "/wp-json/eventin/v2/webhooks",
            "/wp-json/eventin/v2/rsvp",
        ]
        for api_path in api_paths:
            check_rest(page, api_path)

        # AI generator endpoint check (admin REST with nonce)
        page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=etn", wait_until="networkidle")
        nonce = page.evaluate("""() => {
            return window.eventin_pro?.nonce || window.etn_pro?.nonce || '';
        }""")
        print(f"  JS nonce found: {nonce!r}")

        # Check what JS vars are exposed
        js_globals = page.evaluate("""() => {
            const out = {};
            ['eventin_pro', 'etn_pro', 'eventin', 'eventinProData', 'etn_data',
             'eventin_ai', 'eventin_settings', 'eventin_params'].forEach(k => {
                if (window[k]) out[k] = window[k];
            });
            return out;
        }""")
        print(f"  JS globals: {list(js_globals.keys())}")
        observations["js_globals"] = js_globals

        browser.close()

    # Save observations
    out_path = os.path.join(OUTPUT_DIR, "observations.json")
    with open(out_path, "w") as f:
        json.dump(observations, f, indent=2, default=str)
    print(f"\n✓ Saved {out_path}")
    print(f"✓ Admin screens: {len(observations['admin_screens'])}")
    print(f"✓ Frontend screens: {len(observations['frontend_screens'])}")
    print(f"✓ REST endpoints: {len(observations['rest_api'])}")


if __name__ == "__main__":
    main()
