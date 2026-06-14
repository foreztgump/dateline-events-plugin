"""
EventON P1 add-ons UX documentation capture script
PRO-325 — Feature inventory: eventon-rsvp, eventon-tickets, eventon-seats,
          eventon-ticket-variations-options

Produces per-plugin: screenshots/, observations.json
Run from analysis/ directory:
    python3 capture-p1-addons.py
"""

import json
import os
from playwright.sync_api import sync_playwright, Page

BASE_URL = os.environ.get("DDEV_BASE_URL", "https://dateline-site-b.ddev.site:8443")
ANALYSIS_DIR = os.path.dirname(__file__)
USERNAME = os.environ.get("DDEV_USERNAME", "admin")
PASSWORD = os.environ["DDEV_PASSWORD"]

PLUGINS = ["eventon-rsvp", "eventon-tickets", "eventon-seats",
           "eventon-ticket-variations-options"]

# Observations keyed by plugin slug
obs: dict[str, dict] = {
    p: {"admin_screens": [], "frontend_screens": [], "rest_api": [],
        "metaboxes": [], "settings_fields": [], "js_globals": {}}
    for p in PLUGINS
}


# ------------------------------------------------------------------ helpers
def ss(page: Page, plugin: str, name: str, desc: str) -> str:
    path = os.path.join(ANALYSIS_DIR, plugin, "screenshots", f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {plugin}/{name}.png — {desc}")
    return f"{name}.png"


def get_body_text(page: Page, max_chars: int = 5000) -> str:
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


def nav(page: Page, path: str, timeout: int = 25000):
    page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=timeout)
    try:
        page.wait_for_load_state("networkidle", timeout=6000)
    except Exception:
        pass
    page.wait_for_timeout(2000)


def admin_screen(page: Page, plugin: str, path: str, name: str, desc: str):
    try:
        nav(page, path)
        title = page.title()
        shot = ss(page, plugin, name, desc)
        content = get_body_text(page)
        fields = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('input[name],select[name],textarea[name]'))
                .slice(0, 60)
                .map(el => ({
                    type: el.tagName.toLowerCase() + (el.type ? ':' + el.type : ''),
                    name: el.getAttribute('name'),
                    label: el.labels?.[0]?.textContent?.trim() || '',
                    value: el.type === 'checkbox' ? el.checked : (el.value || '').substring(0, 40),
                }));
        }""")
        obs[plugin]["admin_screens"].append({
            "name": name, "desc": desc, "url": path,
            "title": title, "screenshot": shot,
            "form_fields": fields,
            "content_excerpt": content,
        })
        print(f"  ✓ {desc}")
        return True
    except Exception as e:
        print(f"  ✗ {desc} — {str(e)[:90]}")
        return False


def frontend_screen(page: Page, plugin: str, path: str, name: str, desc: str):
    try:
        nav(page, path)
        title = page.title()
        shot = ss(page, plugin, name, desc)
        content = get_body_text(page, 4000)
        obs[plugin]["frontend_screens"].append({
            "name": name, "desc": desc, "url": path,
            "title": title, "screenshot": shot,
            "content_excerpt": content,
        })
        print(f"  ✓ Frontend: {desc}")
        return True
    except Exception as e:
        print(f"  ✗ Frontend: {desc} — {str(e)[:90]}")
        return False


def check_rest(page: Page, plugin: str, endpoint: str):
    try:
        resp = page.request.get(f"{BASE_URL}{endpoint}")
        obs[plugin]["rest_api"].append({
            "endpoint": endpoint, "status": resp.status,
            "sample": resp.text()[:600],
        })
        print(f"  REST {endpoint}: {resp.status}")
    except Exception as e:
        print(f"  REST {endpoint}: error — {str(e)[:60]}")


def capture_metaboxes(page: Page, plugin: str, event_id: int = 8):
    """Capture all metaboxes on the event edit screen, expanded."""
    try:
        nav(page, f"/wp-admin/post.php?post={event_id}&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        boxes = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('.postbox')).map(box => ({
                id: box.id,
                heading: (box.querySelector('h2,h3,.hndle')?.textContent || '').trim(),
                html_excerpt: box.innerHTML.substring(0, 400),
            }));
        }""")
        obs[plugin]["metaboxes"] = boxes
        print(f"  ✓ Captured {len(boxes)} metaboxes on event {event_id}")
    except Exception as e:
        print(f"  ✗ metabox capture failed — {str(e)[:90]}")


# ================================================================== RSVP
def capture_rsvp(page: Page):
    plugin = "eventon-rsvp"
    print(f"\n{'='*60}\n  PLUGIN: {plugin}\n{'='*60}")

    # Admin screens
    print("\n--- Admin: RSVP settings tab ---")
    admin_screen(page, plugin, "/wp-admin/admin.php?page=eventon&tab=evcal_rs",
                 "admin-100-settings-rsvp", "EventON Settings — RSVP tab")

    # Scroll captures of RSVP settings (it's long)
    try:
        nav(page, "/wp-admin/admin.php?page=eventon&tab=evcal_rs")
        for y, name, desc in [
            (0,    "admin-101-rsvp-settings-top",    "RSVP settings — top (general)"),
            (800,  "admin-102-rsvp-settings-800",    "RSVP settings — 800px (form fields)"),
            (1600, "admin-103-rsvp-settings-1600",   "RSVP settings — 1600px (emails)"),
            (2400, "admin-104-rsvp-settings-2400",   "RSVP settings — 2400px (appearance/lang)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        # Also capture any sub-nav sections
        sections = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('.lvl1_navi a, .evosett_lvl1 a, [data-section]'))
                .map(a => ({text: a.textContent.trim(), section: a.getAttribute('data-section') || a.getAttribute('href') || ''}))
                .filter(x => x.text);
        }""")
        obs[plugin]["settings_fields"].append({"rsvp_sections": sections})
        print(f"  ✓ RSVP settings scroll captures; found {len(sections)} sub-sections")
    except Exception as e:
        print(f"  ✗ RSVP settings scroll: {str(e)[:80]}")

    print("\n--- Admin: RSVP records list ---")
    admin_screen(page, plugin, "/wp-admin/edit.php?post_type=evo-rsvp",
                 "admin-200-rsvp-records-list", "RSVP CPT list (evo-rsvp)")

    print("\n--- Admin: event edit — RSVP metabox ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")  # Annual Tech Conference
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        # Scroll to RSVP metabox area
        rsvp_box = page.locator("#evors_mb1, [id*='rsvp'], [id*='evors']").first
        if rsvp_box.count() > 0:
            rsvp_box.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
        ss(page, plugin, "admin-300-event-rsvp-metabox", "Event edit — RSVP metabox")
        # Capture all scroll positions to see RSVP sections
        for y, name, desc in [
            (2000, "admin-301-event-edit-2000", "Event edit scroll 2000px (RSVP area)"),
            (3000, "admin-302-event-edit-3000", "Event edit scroll 3000px (RSVP lower)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        print("  ✓ Event edit RSVP metabox")
    except Exception as e:
        print(f"  ✗ Event edit RSVP metabox: {str(e)[:90]}")

    print("\n--- Admin: RSVP single record ---")
    # Find an RSVP record if any exist
    try:
        nav(page, "/wp-admin/edit.php?post_type=evo-rsvp")
        first_link = page.locator("td.title a, .row-title").first
        if first_link.count() > 0:
            href = first_link.get_attribute("href")
            if href:
                nav(page, href.replace(BASE_URL, ""))
                ss(page, plugin, "admin-201-rsvp-single-record", "RSVP single record edit screen")
                print("  ✓ RSVP single record")
    except Exception as e:
        print(f"  ✗ RSVP single record: {str(e)[:90]}")

    # New event — RSVP metabox
    print("\n--- Admin: new event — RSVP metabox ---")
    try:
        nav(page, "/wp-admin/post-new.php?post_type=ajde_events")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(1000)
        ss(page, plugin, "admin-310-new-event-rsvp", "New event — RSVP metabox visible")
    except Exception as e:
        print(f"  ✗ New event RSVP: {str(e)[:80]}")

    # Frontend
    print("\n--- Frontend: RSVP form on event card ---")
    # Find an event with RSVP enabled — try events list then single event
    frontend_screen(page, plugin, "/calendar/",
                    "frontend-100-calendar", "Calendar page (RSVP buttons visible?)")
    # Try single event pages
    for post_id in [8, 9, 10, 28, 33, 34]:
        try:
            nav(page, f"/?p={post_id}")
            # Check if RSVP section is visible
            has_rsvp = page.locator(".evors_btn, .evors_form_wrap, [class*='evors']").count() > 0
            has_ticket = page.locator(".evotx_btn, [class*='evotx']").count() > 0
            if has_rsvp:
                ss(page, plugin, f"frontend-101-single-event-{post_id}-rsvp",
                   f"Single event {post_id} — RSVP section")
                print(f"  ✓ Event {post_id} has RSVP button")
                # Try to expand RSVP form
                try:
                    rsvp_btn = page.locator(".evors_btn, .evcal_btn_rsvp, [class*='rsvp-btn']").first
                    if rsvp_btn.count() > 0:
                        rsvp_btn.click()
                        page.wait_for_timeout(1500)
                        ss(page, plugin, f"frontend-102-rsvp-form-open-{post_id}",
                           f"Event {post_id} — RSVP form expanded")
                except Exception as e2:
                    print(f"  ✗ RSVP form expand: {str(e2)[:60]}")
                break
        except Exception as e:
            print(f"  ✗ Event {post_id}: {str(e)[:60]}")

    # RSVP manager shortcode page
    frontend_screen(page, plugin, "/rsvp-manager/",
                    "frontend-110-rsvp-manager", "RSVP manager page [evo_rsvp_manager]")

    # REST endpoints
    print("\n--- REST API ---")
    for ep in ["/wp-json/eventon/v2/rsvp", "/wp-json/eventon/v1/rsvp",
               "/wp-json/wp/v2/evo-rsvp"]:
        check_rest(page, plugin, ep)

    # JS globals on calendar
    print("\n--- JS globals ---")
    try:
        nav(page, "/calendar/")
        js_globals = page.evaluate("""() => {
            const out = {};
            ['evors_data', 'evors', 'evors_form', 'evo_data', 'evcal_data'].forEach(k => {
                if (window[k]) {
                    try { out[k] = JSON.parse(JSON.stringify(window[k])); }
                    catch (e) { out[k] = String(window[k]).substring(0, 200); }
                }
            });
            return out;
        }""")
        obs[plugin]["js_globals"] = js_globals
        print(f"  ✓ JS globals: {list(js_globals.keys())}")
    except Exception as e:
        print(f"  ✗ JS globals: {str(e)[:80]}")


# ================================================================== TICKETS
def capture_tickets(page: Page):
    plugin = "eventon-tickets"
    print(f"\n{'='*60}\n  PLUGIN: {plugin}\n{'='*60}")

    # Admin screens
    print("\n--- Admin: Tickets settings tab ---")
    admin_screen(page, plugin, "/wp-admin/admin.php?page=eventon&tab=evcal_tx",
                 "admin-100-settings-tickets", "EventON Settings — Tickets tab (WC-missing)")

    # Scroll captures of tickets settings
    try:
        nav(page, "/wp-admin/admin.php?page=eventon&tab=evcal_tx")
        for y, name, desc in [
            (0,    "admin-101-tickets-settings-top",  "Tickets settings — top"),
            (800,  "admin-102-tickets-settings-800",  "Tickets settings — 800px"),
            (1600, "admin-103-tickets-settings-1600", "Tickets settings — 1600px"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        print("  ✓ Tickets settings scroll captures")
    except Exception as e:
        print(f"  ✗ Tickets settings scroll: {str(e)[:80]}")

    # Admin notice on events list
    print("\n--- Admin: events list (WC admin notices) ---")
    admin_screen(page, plugin, "/wp-admin/edit.php?post_type=ajde_events",
                 "admin-200-events-list-wc-notices", "Events list — WC missing admin notices")

    # Ticket orders list (WC dependency — may show error)
    print("\n--- Admin: ticket orders (WC dep) ---")
    admin_screen(page, plugin, "/wp-admin/admin.php?page=evo-ticket-orders",
                 "admin-201-ticket-orders", "Ticket orders screen (may show WC-missing)")

    # evo-tix CPT list
    print("\n--- Admin: evo-tix CPT list ---")
    admin_screen(page, plugin, "/wp-admin/edit.php?post_type=evo-tix",
                 "admin-202-evo-tix-list", "evo-tix CPT list (ticket records)")

    # Event edit — Tickets metabox
    print("\n--- Admin: event edit — Tickets metabox ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        # Find tickets metabox
        tx_box = page.locator("#evotx_mb1, [id*='ticket'], [id*='evotx']").first
        if tx_box.count() > 0:
            tx_box.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
        ss(page, plugin, "admin-300-event-tickets-metabox",
           "Event edit — Tickets metabox (WC-degraded)")
        # Scroll captures
        for y, name, desc in [
            (0,    "admin-301-event-edit-top",   "Event edit — top"),
            (2500, "admin-302-event-edit-2500",  "Event edit — 2500px (tickets metabox area)"),
            (3500, "admin-303-event-edit-3500",  "Event edit — 3500px (tickets lower)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        print("  ✓ Event edit Tickets metabox")
    except Exception as e:
        print(f"  ✗ Event edit Tickets metabox: {str(e)[:90]}")

    # WC admin notice on new event
    print("\n--- Admin: new event — Tickets metabox ---")
    try:
        nav(page, "/wp-admin/post-new.php?post_type=ajde_events")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        ss(page, plugin, "admin-310-new-event-tickets",
           "New event — Tickets metabox (WC-degraded UI)")
    except Exception as e:
        print(f"  ✗ New event Tickets: {str(e)[:80]}")

    # Frontend (tickets section on event card — WC required, will be blank/notice)
    print("\n--- Frontend: event card ticket section ---")
    for post_id in [8, 9, 28]:
        try:
            nav(page, f"/?p={post_id}")
            has_tx = page.locator(".evotx_btn, [class*='evotx'], .ev-ticket").count() > 0
            ss(page, plugin, f"frontend-100-event-{post_id}",
               f"Single event {post_id} — ticket section (WC-degraded)")
            if has_tx:
                print(f"  ✓ Event {post_id} has ticket element")
                break
        except Exception as e:
            print(f"  ✗ Event {post_id}: {str(e)[:60]}")

    # REST endpoints
    print("\n--- REST API ---")
    for ep in ["/wp-json/eventon/v2/tickets", "/wp-json/eventon/v1/tickets",
               "/wp-json/wp/v2/evo-tix"]:
        check_rest(page, plugin, ep)

    # JS globals
    print("\n--- JS globals ---")
    try:
        nav(page, f"/?p=8")
        js_globals = page.evaluate("""() => {
            const out = {};
            ['evotx_data', 'evo_tx', 'evo_data', 'evcal_data'].forEach(k => {
                if (window[k]) {
                    try { out[k] = JSON.parse(JSON.stringify(window[k])); }
                    catch (e) { out[k] = String(window[k]).substring(0, 200); }
                }
            });
            return out;
        }""")
        obs[plugin]["js_globals"] = js_globals
        print(f"  ✓ JS globals: {list(js_globals.keys())}")
    except Exception as e:
        print(f"  ✗ JS globals: {str(e)[:80]}")


# ================================================================== SEATS
def capture_seats(page: Page):
    plugin = "eventon-seats"
    print(f"\n{'='*60}\n  PLUGIN: {plugin}\n{'='*60}")

    # Admin notices on events list (WC missing)
    print("\n--- Admin: events list (WC notices) ---")
    admin_screen(page, plugin, "/wp-admin/edit.php?post_type=ajde_events",
                 "admin-100-events-list", "Events list — Seats WC-missing notice")

    # Event edit — Seats section (inside Tickets metabox)
    print("\n--- Admin: event edit — Seats section ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        # Locate seats-related element
        seats_el = page.locator("[id*='seat'], [class*='seat'], #evost").first
        if seats_el.count() > 0:
            seats_el.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
        ss(page, plugin, "admin-200-event-seats-section",
           "Event edit — seat map section (WC-degraded)")
        # Scroll to find seat toggle / seat map editor trigger
        for y, name, desc in [
            (2500, "admin-201-edit-2500", "Edit event 2500px (seat toggle area)"),
            (3000, "admin-202-edit-3000", "Edit event 3000px"),
            (3500, "admin-203-edit-3500", "Edit event 3500px"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        print("  ✓ Event edit seats section")
    except Exception as e:
        print(f"  ✗ Event edit seats: {str(e)[:90]}")

    # Try to trigger seat map editor lightbox
    print("\n--- Admin: seat map editor lightbox ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(1000)
        # Look for seat map editor trigger button
        editor_btn = page.locator(".evost_editor_btn, [data-evost-action='editor'], "
                                   "a[href*='seat'], button[class*='seat']").first
        if editor_btn.count() > 0:
            editor_btn.click()
            page.wait_for_timeout(3000)
            ss(page, plugin, "admin-300-seat-map-editor",
               "Seat map editor lightbox opened")
            # Capture editor content
            editor_html = page.locator(".evo_lightbox, #evost_editor, [id*='seat_editor']").first
            if editor_html.count() > 0:
                ss(page, plugin, "admin-301-seat-map-editor-canvas",
                   "Seat map editor canvas")
            print("  ✓ Seat map editor opened")
        else:
            print("  ✗ Seat map editor button not found (WC-degraded)")
            ss(page, plugin, "admin-300-seat-map-editor-notfound",
               "Seat map editor button not found (WC missing)")
    except Exception as e:
        print(f"  ✗ Seat map editor: {str(e)[:90]}")

    # Frontend — seat picker on event card
    print("\n--- Frontend: seat picker ---")
    for post_id in [8, 9, 28, 34]:
        try:
            nav(page, f"/?p={post_id}")
            has_seats = page.locator("[class*='evost'], [class*='seat'], #evost_seat").count() > 0
            ss(page, plugin, f"frontend-100-event-{post_id}",
               f"Single event {post_id} — seat picker section")
            if has_seats:
                print(f"  ✓ Event {post_id} has seat element")
                # Try Find Seats button
                try:
                    find_seats = page.locator(".evost_find_seats, [class*='find-seat'], "
                                               "button[class*='seat']").first
                    if find_seats.count() > 0:
                        find_seats.click()
                        page.wait_for_timeout(3000)
                        ss(page, plugin, f"frontend-101-seat-picker-open-{post_id}",
                           f"Event {post_id} — seat picker lightbox opened")
                except Exception as e2:
                    print(f"  ✗ Find Seats button: {str(e2)[:60]}")
                break
        except Exception as e:
            print(f"  ✗ Event {post_id}: {str(e)[:60]}")

    # REST endpoints
    print("\n--- REST API ---")
    for ep in ["/wp-json/evonton/v2/seats", "/wp-json/wp/v2/evo-seats"]:
        check_rest(page, plugin, ep)

    # JS globals
    print("\n--- JS globals ---")
    try:
        nav(page, "/?p=8")
        js_globals = page.evaluate("""() => {
            const out = {};
            ['evost_data', 'evost_sc', 'evo_data'].forEach(k => {
                if (window[k]) {
                    try { out[k] = JSON.parse(JSON.stringify(window[k])); }
                    catch (e) { out[k] = String(window[k]).substring(0, 200); }
                }
            });
            return out;
        }""")
        obs[plugin]["js_globals"] = js_globals
        print(f"  ✓ JS globals: {list(js_globals.keys())}")
    except Exception as e:
        print(f"  ✗ JS globals: {str(e)[:80]}")


# ================================================================== TICKET VARIATIONS
def capture_ticket_variations(page: Page):
    plugin = "eventon-ticket-variations-options"
    print(f"\n{'='*60}\n  PLUGIN: {plugin}\n{'='*60}")

    # Admin notices
    print("\n--- Admin: events list (WC notices) ---")
    admin_screen(page, plugin, "/wp-admin/edit.php?post_type=ajde_events",
                 "admin-100-events-list", "Events list — Ticket Variations WC-missing notice")

    # Event edit — Variations section (inside Tickets metabox)
    print("\n--- Admin: event edit — Variations section ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(800)
        # Scroll to the variations area
        for y, name, desc in [
            (2500, "admin-200-edit-2500", "Event edit 2500px (variations area)"),
            (3000, "admin-201-edit-3000", "Event edit 3000px"),
            (3500, "admin-202-edit-3500", "Event edit 3500px (variations toggle)"),
        ]:
            page.evaluate(f"window.scrollTo(0, {y})")
            page.wait_for_timeout(400)
            ss(page, plugin, name, desc)
        print("  ✓ Event edit variations scroll captures")
    except Exception as e:
        print(f"  ✗ Event edit variations: {str(e)[:90]}")

    # Try to open variations settings lightbox
    print("\n--- Admin: variations settings lightbox ---")
    try:
        nav(page, "/wp-admin/post.php?post=8&action=edit")
        page.evaluate("""() => {
            document.querySelectorAll('.postbox.closed').forEach(b => b.classList.remove('closed'));
        }""")
        page.wait_for_timeout(1000)
        # Try to enable variations toggle first
        vo_toggle = page.locator("[name*='evovo_activate'], [name*='_evovo'], "
                                  "input[class*='evovo']").first
        if vo_toggle.count() > 0:
            current = page.evaluate("(el) => el.checked", vo_toggle.element_handle())
            if not current:
                vo_toggle.click()
                page.wait_for_timeout(1000)
                ss(page, plugin, "admin-300-variations-toggle-enabled",
                   "Variations toggle enabled")
        # Look for Settings link
        settings_link = page.locator("a[href*='evovo'], [data-evovo], "
                                      ".evovo_settings_link, a[class*='evovo']").first
        if settings_link.count() > 0:
            settings_link.click()
            page.wait_for_timeout(2000)
            ss(page, plugin, "admin-301-variations-settings-lightbox",
               "Variations settings lightbox")
            print("  ✓ Variations settings lightbox opened")
        else:
            print("  ✗ Variations settings link not found (WC-degraded)")
            ss(page, plugin, "admin-300-variations-wc-degraded",
               "Variations section in WC-degraded state")
    except Exception as e:
        print(f"  ✗ Variations lightbox: {str(e)[:90]}")

    # Frontend — variations UI on event card
    print("\n--- Frontend: variations pricing display ---")
    for post_id in [8, 9, 28, 34]:
        try:
            nav(page, f"/?p={post_id}")
            has_vo = page.locator("[class*='evovo'], .evovo_data, [class*='variation']").count() > 0
            ss(page, plugin, f"frontend-100-event-{post_id}",
               f"Single event {post_id} — variations pricing section")
            if has_vo:
                print(f"  ✓ Event {post_id} has variations element")
                break
            else:
                print(f"  - Event {post_id}: no variations element visible")
        except Exception as e:
            print(f"  ✗ Event {post_id}: {str(e)[:60]}")

    # REST
    print("\n--- REST API ---")
    check_rest(page, plugin, "/wp-json/eventon/v2/ticket-variations")
    check_rest(page, plugin, "/wp-json/wp/v2/evo-tvo")

    # JS globals
    print("\n--- JS globals ---")
    try:
        nav(page, "/?p=8")
        js_globals = page.evaluate("""() => {
            const out = {};
            ['evovo_data', 'evo_data', 'evotx_data'].forEach(k => {
                if (window[k]) {
                    try { out[k] = JSON.parse(JSON.stringify(window[k])); }
                    catch (e) { out[k] = String(window[k]).substring(0, 200); }
                }
            });
            return out;
        }""")
        obs[plugin]["js_globals"] = js_globals
        print(f"  ✓ JS globals: {list(js_globals.keys())}")
    except Exception as e:
        print(f"  ✗ JS globals: {str(e)[:80]}")


# ================================================================== MAIN
def main():
    for plugin in PLUGINS:
        os.makedirs(os.path.join(ANALYSIS_DIR, plugin, "screenshots"), exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )
        page = ctx.new_page()
        login(page)

        capture_rsvp(page)
        capture_tickets(page)
        capture_seats(page)
        capture_ticket_variations(page)

        browser.close()

    for plugin in PLUGINS:
        out_path = os.path.join(ANALYSIS_DIR, plugin, "observations.json")
        with open(out_path, "w") as f:
            json.dump(obs[plugin], f, indent=2, default=str)
        n_admin = len(obs[plugin]["admin_screens"])
        n_front = len(obs[plugin]["frontend_screens"])
        n_rest = len(obs[plugin]["rest_api"])
        print(f"\n✓ {plugin}: {n_admin} admin, {n_front} frontend, {n_rest} REST — {out_path}")


if __name__ == "__main__":
    main()
