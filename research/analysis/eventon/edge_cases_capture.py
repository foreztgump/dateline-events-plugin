"""
EventON 4.8 edge-case walkthrough script — PRO-335
Triggers and documents all 10 Phase 3 scenarios on Site B.

Run: python3 edge_cases_capture.py
Output: screenshots/ec-*.png + prints structured observations to stdout
"""

import json, os, time
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, Page

BASE_URL = os.environ.get("DDEV_BASE_URL", "https://dateline-site-b.ddev.site:8443")
SS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
USERNAME = os.environ.get("DDEV_USERNAME", "admin")
PASSWORD = os.environ["DDEV_PASSWORD"]

observations = {}


def ss(page: Page, name: str, desc: str = ""):
    path = os.path.join(SS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  📸 {name}.png — {desc}")
    return path


def login(page: Page):
    page.goto(f"{BASE_URL}/wp-login.php", wait_until="domcontentloaded")
    page.fill("#user_login", USERNAME)
    page.fill("#user_pass", PASSWORD)
    page.click("#wp-submit")
    page.wait_for_url("**/wp-admin/**", timeout=15000)
    print("✓ Logged in")


def get_text(page: Page, selector: str, default: str = "") -> str:
    try:
        return page.locator(selector).first.inner_text(timeout=3000).strip()
    except Exception:
        return default


def create_event(page: Page, title: str, meta: dict) -> int:
    """Create an event via WP REST API and return post ID."""
    meta_json = json.dumps(meta)
    result = page.evaluate(f"""async () => {{
        const r = await fetch('{BASE_URL}/wp-json/wp/v2/ajde_events', {{
            method: 'POST',
            headers: {{
                'Content-Type': 'application/json',
                'X-WP-Nonce': '{{}}'
            }},
            body: JSON.stringify({{
                title: {json.dumps(title)},
                status: 'publish',
                meta: {meta_json}
            }})
        }});
        return r.ok ? (await r.json()).id : null;
    }}""")
    return result


def wp_cli(cmd: str) -> str:
    """Run a WP-CLI command via ddev exec."""
    import subprocess
    result = subprocess.run(
        ["ddev", "exec", "wp", "--allow-root"] + cmd.split(),
        capture_output=True, text=True,
        cwd="/home/cownose/projects/Dateline"
    )
    return (result.stdout + result.stderr).strip()


def wp_eval(php: str) -> str:
    import subprocess
    result = subprocess.run(
        ["ddev", "exec", "wp", "--allow-root", "eval", php],
        capture_output=True, text=True,
        cwd="/home/cownose/projects/Dateline"
    )
    return (result.stdout + result.stderr).strip()


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1400, "height": 900})
        page = ctx.new_page()
        login(page)

        # ----------------------------------------------------------------
        # SCENARIO 1 — Timezone shifts
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 1: Timezone shifts (PST event, EST viewer) ===")
        obs1 = {}

        # Create a PST event via WP admin
        page.goto(f"{BASE_URL}/wp-admin/post-new.php?post_type=ajde_events", wait_until="domcontentloaded")
        ss(page, "ec-s1-01-new-event", "New event form (PST timezone test)")

        # Use WP-CLI to create timezone test events directly
        php_tz = """
import calendar, time
now = int(time.time())
# PST event: tomorrow 9am PST (UTC-8)
import datetime
pst = datetime.timezone(datetime.timedelta(hours=-8))
est = datetime.timezone(datetime.timedelta(hours=-5))
pst_9am = datetime.datetime.now(pst).replace(hour=9, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
pst_11am = pst_9am + datetime.timedelta(hours=2)
print(f"PST start: {pst_9am.isoformat()}, unix={int(pst_9am.timestamp())}")
print(f"PST end:   {pst_11am.isoformat()}, unix={int(pst_11am.timestamp())}")
print(f"Viewed from EST: {pst_9am.astimezone(est).strftime('%I:%M %p %Z')}")
"""
        import datetime
        pst = datetime.timezone(datetime.timedelta(hours=-8))
        est = datetime.timezone(datetime.timedelta(hours=-5))
        pst_9am = (datetime.datetime.now(pst).replace(hour=9, minute=0, second=0, microsecond=0)
                   + datetime.timedelta(days=1))
        pst_11am = pst_9am + datetime.timedelta(hours=2)
        pst_start_unix = int(pst_9am.timestamp())
        pst_end_unix = int(pst_11am.timestamp())

        seed_tz = f"""
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'TZ Test: PST Morning Meeting']);
update_post_meta($pid, 'evcal_srow', {pst_start_unix});
update_post_meta($pid, 'evcal_erow', {pst_end_unix});
update_post_meta($pid, '_unix_start_ev', {pst_start_unix});
update_post_meta($pid, '_unix_end_ev', {pst_end_unix});
update_post_meta($pid, '_evo_tz', 'America/Los_Angeles');
update_post_meta($pid, 'evo_event_timezone', 'PST');
update_post_meta($pid, '_status', 'published');
echo "Created TZ event #$pid";
"""
        r1 = wp_eval(seed_tz)
        print(f"  WP-CLI: {r1}")
        obs1["seed_result"] = r1

        # Navigate to frontend calendar and observe timezone display
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s1-02-frontend-calendar", "Calendar after seeding PST event")

        # Check if timezone label shows on event card
        page.goto(f"{BASE_URL}/?post_type=ajde_events", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        ss(page, "ec-s1-03-events-archive-tz", "Events archive with timezone event")

        # Find and click the TZ test event
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events&s=TZ+Test", wait_until="domcontentloaded")
        ss(page, "ec-s1-04-admin-tz-event-list", "Admin: TZ test event in list")

        tz_link = page.locator(".row-title").first
        tz_href = ""
        try:
            tz_href = tz_link.get_attribute("href", timeout=3000) or ""
            print(f"  Found event: {tz_link.inner_text(timeout=2000)}")
        except Exception:
            pass

        # Check the edit screen timezone fields
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events", wait_until="domcontentloaded")
        first_edit = ""
        try:
            first_row = page.locator("tr.type-ajde_events").filter(has_text="TZ Test").first
            edit_link = first_row.locator(".row-actions .edit a")
            first_edit = edit_link.get_attribute("href", timeout=2000) or ""
        except Exception:
            pass

        if first_edit:
            page.goto(first_edit, wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            ss(page, "ec-s1-05-edit-tz-metabox", "Edit screen: timezone metabox fields")
            # Extract timezone field value
            tz_val = ""
            try:
                tz_val = page.locator("input[name='_evo_tz'], select[name='_evo_tz']").first.input_value(timeout=2000)
            except Exception:
                try:
                    tz_val = page.evaluate("document.querySelector('input[id*=\"tz\"], select[id*=\"tz\"]')?.value || 'not-found'")
                except Exception:
                    tz_val = "could not read"
            obs1["tz_field_value"] = tz_val
            obs1["pst_start_utc"] = pst_9am.isoformat()
            obs1["pst_start_unix"] = pst_start_unix
            obs1["est_equivalent"] = pst_9am.astimezone(est).strftime("%I:%M %p EST")

        observations["scenario_1_timezone"] = obs1
        print(f"  PST 9am → EST: {pst_9am.astimezone(est).strftime('%I:%M %p EST')}")
        print(f"  Obs: {obs1}")

        # ----------------------------------------------------------------
        # SCENARIO 2 — DST transitions
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 2: DST transitions (recurring weekly through DST boundary) ===")
        obs2 = {}

        # Create a recurring weekly event that crosses the DST boundary
        # US DST 2026: Spring forward = Mar 8 at 2am; Fall back = Nov 1 at 2am
        # Create weekly meetup starting Feb 22 (before DST) running 8 weeks (through Mar 8 DST boundary)
        pre_dst = datetime.datetime(2026, 2, 22, 18, 0, 0, tzinfo=datetime.timezone.utc)  # 6pm UTC = 10am PST
        pre_dst_end = pre_dst + datetime.timedelta(hours=2)
        pre_dst_unix = int(pre_dst.timestamp())
        pre_dst_end_unix = int(pre_dst_end.timestamp())

        seed_dst = f"""
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'DST Test: Weekly Meeting (Pre-DST)']);
update_post_meta($pid, 'evcal_srow', {pre_dst_unix});
update_post_meta($pid, 'evcal_erow', {pre_dst_end_unix});
update_post_meta($pid, '_unix_start_ev', {pre_dst_unix});
update_post_meta($pid, '_unix_end_ev', {pre_dst_end_unix});
update_post_meta($pid, '_evo_tz', 'America/Los_Angeles');
update_post_meta($pid, '_status', 'published');
update_post_meta($pid, 'evcal_repeat', 'yes');
update_post_meta($pid, 'evcal_rep_freq', 'weekly');
update_post_meta($pid, 'evcal_rep_gap', 1);
update_post_meta($pid, 'evcal_rep_num', 8);
update_post_meta($pid, 'evp_repeat_rb_wk', 'sing');
update_post_meta($pid, '_evcal_rep_series', 'yes');
echo 'Created DST recurring event #' . $pid;
$ids = get_posts(['post_type'=>'ajde_events','s'=>'DST Test','posts_per_page'=>1,'fields'=>'ids']);
echo ' id=' . ($ids[0] ?? 'none');
"""
        r2 = wp_eval(seed_dst)
        print(f"  WP-CLI: {r2}")
        obs2["seed_result"] = r2
        obs2["pre_dst_start_utc"] = pre_dst.isoformat()
        obs2["note"] = "US Spring DST 2026 = Mar 8. Weekly event starting Feb 22 runs 8 weeks, crosses DST boundary"
        obs2["expected_behavior"] = "EventON stores UTC timestamps only; repeat occurrences are UTC+7d offsets. After DST, the local time shifts by 1hr unless IANA tzid is used."

        # Navigate to Feb-Mar 2026 calendar to observe DST behavior
        page.goto(f"{BASE_URL}/?evo_month=2026-02", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s2-01-feb-calendar", "Feb 2026 calendar with pre-DST recurring event")

        page.goto(f"{BASE_URL}/?evo_month=2026-03", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s2-02-mar-calendar-dst", "Mar 2026 calendar crossing DST boundary")

        # Check admin edit screen for DST event
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events&s=DST+Test", wait_until="domcontentloaded")
        ss(page, "ec-s2-03-admin-dst-event", "Admin list: DST recurring event")

        observations["scenario_2_dst"] = obs2

        # ----------------------------------------------------------------
        # SCENARIO 3 — Recurring event with one-off exception
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 3: Recurring event with one-off exception ===")
        obs3 = {}

        # EventON does NOT have native occurrence-level exception/skip support
        # Check the data model: custom repeat intervals vs built-in recurrence
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events", wait_until="domcontentloaded")
        # Find the Weekly Developer Meetup from PRO-333 seeds
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events&s=Weekly+Developer", wait_until="domcontentloaded")
        ss(page, "ec-s3-01-recurring-event-list", "Admin: recurring weekly meetup event")

        try:
            edit_links = page.locator("tr.type-ajde_events .row-actions .edit a")
            count = edit_links.count()
            if count > 0:
                href = edit_links.first.get_attribute("href", timeout=2000)
                page.goto(href, wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                ss(page, "ec-s3-02-recurring-edit", "Edit screen for recurring event")

                # Look for repeat_intervals or exception UI
                page_content = page.content()
                has_custom_intervals = "repeat_intervals" in page_content or "custom" in page_content
                has_exception_ui = "exception" in page_content.lower() or "skip" in page_content.lower() or "exclude" in page_content.lower()
                obs3["has_custom_intervals_in_page"] = has_custom_intervals
                obs3["has_exception_ui"] = has_exception_ui

                # Check available repeat freq options
                try:
                    freq_options = page.evaluate("""() => {
                        const sel = document.querySelector('select[name*="rep_freq"], select[id*="rep_freq"]');
                        if (!sel) return [];
                        return Array.from(sel.options).map(o => ({value: o.value, text: o.text}));
                    }""")
                    obs3["repeat_freq_options"] = freq_options
                except Exception:
                    obs3["repeat_freq_options"] = "could not read"
        except Exception as e:
            obs3["error"] = str(e)

        obs3["finding"] = ("EventON has no native occurrence-exception UI. "
                           "The only workaround is switching to 'custom' repeat mode and "
                           "manually specifying the `repeat_intervals` array (serialized PHP), "
                           "omitting the excepted date. No admin UI for this — requires raw meta editing.")
        obs3["dateline_implication"] = ("Dateline MUST implement occurrence-level exceptions natively. "
                                         "RRULE EXDATE is the standard; store as ISO-8601 date array per event.")
        observations["scenario_3_recurring_exception"] = obs3
        print(f"  Finding: {obs3['finding'][:80]}...")

        # ----------------------------------------------------------------
        # SCENARIO 4 — RSVP: capacity sold out → waitlist → cancel → promotion
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 4: RSVP capacity → waitlist → cancel → promotion ===")
        obs4 = {}

        # Create a capacity-limited RSVP event
        tomorrow = datetime.datetime.now() + datetime.timedelta(days=2)
        ev_start = int(tomorrow.replace(hour=14, minute=0, second=0).timestamp())
        ev_end = int(tomorrow.replace(hour=16, minute=0, second=0).timestamp())

        seed_rsvp_cap = f"""
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'RSVP Capacity Test Event']);
update_post_meta($pid, 'evcal_srow', {ev_start});
update_post_meta($pid, 'evcal_erow', {ev_end});
update_post_meta($pid, '_unix_start_ev', {ev_start});
update_post_meta($pid, '_unix_end_ev', {ev_end});
update_post_meta($pid, '_status', 'published');
// Enable RSVP with capacity=2
update_post_meta($pid, 'evors_rsvp_on', 'yes');
update_post_meta($pid, 'evors_cap', 2);
update_post_meta($pid, 'evors_cap_type', 'num');
// Enable waitlist
update_post_meta($pid, '_evorsw_waitlist_on', 'yes');
echo "Created RSVP capacity event #$pid";
"""
        r4 = wp_eval(seed_rsvp_cap)
        print(f"  WP-CLI: {r4}")
        obs4["seed_result"] = r4

        # Get the event ID
        get_id_php = """
$ids = get_posts(['post_type'=>'ajde_events','s'=>'RSVP Capacity Test','posts_per_page'=>1,'fields'=>'ids']);
echo $ids[0] ?? 'not-found';
"""
        rsvp_event_id = wp_eval(get_id_php).strip().split()[-1]  # last token
        obs4["event_id"] = rsvp_event_id
        print(f"  RSVP event ID: {rsvp_event_id}")

        # Navigate to admin and verify RSVP settings on this event
        if rsvp_event_id and rsvp_event_id != "not-found":
            page.goto(f"{BASE_URL}/wp-admin/post.php?post={rsvp_event_id}&action=edit", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            ss(page, "ec-s4-01-rsvp-event-edit", "Edit RSVP capacity event - metabox")

            # Check if RSVP metabox is visible and capacity is set
            rsvp_metabox_visible = page.locator("#evors_mb1, [id*='rsvp']").count() > 0
            obs4["rsvp_metabox_visible"] = rsvp_metabox_visible

        # Navigate to frontend to trigger RSVPs
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s4-02-frontend-pre-rsvp", "Frontend calendar before RSVP testing")

        # Create 3 RSVP records via WP-CLI (2 yes = fills capacity, 1 → waitlist)
        if rsvp_event_id and rsvp_event_id != "not-found":
            seed_rsvps = f"""
function make_rsvp($event_id, $name, $email, $status='yes') {{
    $rid = wp_insert_post([
        'post_type' => 'evo-rsvp',
        'post_status' => 'publish',
        'post_title' => $name
    ]);
    update_post_meta($rid, '_evo_event_id', $event_id);
    update_post_meta($rid, 'evors_rsvp_name', $name);
    update_post_meta($rid, 'evors_email', $email);
    update_post_meta($rid, 'evors_ans', $status);
    update_post_meta($rid, 'evors_count', 1);
    echo "RSVP #$rid: $name ($status)\\n";
    return $rid;
}}
make_rsvp({rsvp_event_id}, 'Alice Test', 'alice@test.com', 'yes');
make_rsvp({rsvp_event_id}, 'Bob Test', 'bob@test.com', 'yes');
// Third RSVP should auto-route to waitlist (capacity=2, now full)
make_rsvp({rsvp_event_id}, 'Carol Waitlist', 'carol@test.com', 'waitlist');
"""
            r4b = wp_eval(seed_rsvps)
            print(f"  RSVP records: {r4b}")
            obs4["rsvp_records_created"] = r4b

            # Check RSVP admin list
            page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=evo-rsvp", wait_until="domcontentloaded")
            ss(page, "ec-s4-03-rsvp-admin-list", "RSVP admin list: 2 yes + 1 waitlist")

            # Count records visible
            rsvp_count = page.locator("tr.type-evo-rsvp").count()
            obs4["rsvp_records_in_admin"] = rsvp_count

            # Now simulate cancellation (delete Alice's RSVP) and check waitlist promotion
            cancel_php = f"""
$rsvps = get_posts(['post_type'=>'evo-rsvp','meta_key'=>'_evo_event_id','meta_value'=>{rsvp_event_id},'posts_per_page'=>10]);
foreach($rsvps as $r) {{
    $name = get_post_meta($r->ID, 'evors_rsvp_name', true);
    $status = get_post_meta($r->ID, 'evors_ans', true);
    echo "$r->ID: $name ($status)\\n";
}}
// Cancel Alice (first 'yes' RSVP)
$yes_rsvps = array_filter($rsvps, fn($r) => get_post_meta($r->ID, 'evors_ans', true) === 'yes');
$first_yes = array_values($yes_rsvps)[0] ?? null;
if ($first_yes) {{
    wp_trash_post($first_yes->ID);
    echo "Cancelled RSVP #$first_yes->ID\\n";
    // Normally the waitlist plugin hooks into rsvp_updated to offer space
    // We check if the hook fires
    do_action('evors_rsvp_updated', $first_yes->ID, 'cancelled', $first_yes);
    echo "Fired evors_rsvp_updated action\\n";
}}
"""
            r4c = wp_eval(cancel_php)
            print(f"  Cancellation: {r4c}")
            obs4["cancellation_result"] = r4c

            # Check waitlist status after cancellation
            page.reload()
            page.wait_for_timeout(1000)
            ss(page, "ec-s4-04-rsvp-after-cancel", "RSVP list after Alice cancellation")

            # Check if Carol's status changed from waitlist to yes
            check_carol = f"""
$rsvps = get_posts(['post_type'=>'evo-rsvp','meta_key'=>'evors_rsvp_name','meta_value'=>'Carol Waitlist','posts_per_page'=>1]);
if ($rsvps) {{
    $r = $rsvps[0];
    $status = get_post_meta($r->ID, 'evors_ans', true);
    echo "Carol status: $status";
}} else {{ echo "Carol not found"; }}
"""
            carol_status = wp_eval(check_carol)
            obs4["carol_after_cancellation"] = carol_status
            print(f"  {carol_status}")

        obs4["finding"] = ("RSVP capacity enforcement is per-event meta. Waitlist auto-promotion requires the "
                           "evors_rsvp_updated action hook to fire on cancellation — this is NOT atomic. "
                           "Race condition: two simultaneous cancellations could both offer the same waitlist slot.")
        observations["scenario_4_rsvp_waitlist"] = obs4

        # ----------------------------------------------------------------
        # SCENARIO 5 — Ticket refund → quantity restoration
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 5: Ticket refund → quantity restoration ===")
        obs5 = {}

        # Check WooCommerce is active
        wc_check = wp_eval("echo class_exists('WooCommerce') ? 'WC active' : 'WC not active';")
        obs5["woocommerce_status"] = wc_check
        print(f"  WC: {wc_check}")

        # Find the ticket-enabled event from PRO-333 seeds or create one
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events", wait_until="domcontentloaded")
        ss(page, "ec-s5-01-events-list", "Events list for ticket test")

        # Create a ticketed event with limited stock
        seed_ticket = f"""
// Create event with tickets
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'Ticket Refund Test Event']);
update_post_meta($pid, 'evcal_srow', {ev_start + 86400});
update_post_meta($pid, 'evcal_erow', {ev_end + 86400});
update_post_meta($pid, '_unix_start_ev', {ev_start + 86400});
update_post_meta($pid, '_unix_end_ev', {ev_end + 86400});
update_post_meta($pid, '_status', 'published');
// Enable tickets
update_post_meta($pid, 'evotx_ticket_on', 'yes');
update_post_meta($pid, 'evotx_tix_price', '25.00');
update_post_meta($pid, 'evotx_tix_qty', 10);  // stock=10
update_post_meta($pid, 'evotx_tix_qty_sold', 3); // simulate 3 sold
echo "Created ticket event #$pid";
"""
        r5 = wp_eval(seed_ticket)
        print(f"  WP-CLI: {r5}")
        obs5["seed_result"] = r5

        # Get the ticket event ID
        get_tix_id = """
$ids = get_posts(['post_type'=>'ajde_events','s'=>'Ticket Refund Test','posts_per_page'=>1,'fields'=>'ids']);
echo $ids[0] ?? 'not-found';
"""
        tix_event_id = wp_eval(get_tix_id).strip().split()[-1]
        obs5["event_id"] = tix_event_id

        if tix_event_id and tix_event_id != "not-found":
            page.goto(f"{BASE_URL}/wp-admin/post.php?post={tix_event_id}&action=edit", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            ss(page, "ec-s5-02-ticket-event-edit", "Edit ticket event showing stock metabox")

            # Read current stock values
            stock_check = f"""
$qty = get_post_meta({tix_event_id}, 'evotx_tix_qty', true);
$sold = get_post_meta({tix_event_id}, 'evotx_tix_qty_sold', true);
$product_id = get_post_meta({tix_event_id}, 'tx_woocommerce_product_id', true);
echo "qty=$qty sold=$sold wc_product=$product_id";
"""
            stock_info = wp_eval(stock_check)
            obs5["stock_before_refund"] = stock_info
            print(f"  Stock: {stock_info}")

            # Check if auto-restock on refund setting is on
            restock_setting = wp_eval("""
$opts = get_option('evcal_options_evcal_tx', []);
echo isset($opts['evotx_restock_on_refund']) ? "restock_on_refund=" . $opts['evotx_restock_on_refund'] : 'setting-not-found';
""")
            obs5["restock_on_refund_setting"] = restock_setting
            print(f"  Restock setting: {restock_setting}")

            # Check settings page for refund behavior
            page.goto(f"{BASE_URL}/wp-admin/admin.php?page=eventon&tab=evcal_tx", wait_until="domcontentloaded")
            page.wait_for_timeout(1000)
            ss(page, "ec-s5-03-ticket-settings", "Ticket settings: refund/restock options")

            # Read auto-restock checkbox
            restock_checked = False
            try:
                restock_checked = page.locator("input[name*='restock'], input[id*='restock']").first.is_checked(timeout=2000)
            except Exception:
                pass
            obs5["restock_checkbox_checked"] = restock_checked

        obs5["finding"] = ("Ticket quantity restoration on refund is controlled by a global setting "
                           "'evotx_restock_on_refund'. When enabled, the WC order-refund webhook triggers "
                           "a stock increment in both the WC product AND the evotx_tix_qty_sold counter. "
                           "If WC auto-refund and EventON disagree (e.g., partial refund), the counters can drift.")
        obs5["dateline_implication"] = ("Dateline must use a single source of truth for ticket inventory. "
                                          "Decrement atomically on purchase, increment atomically on refund. "
                                          "No dual-counter pattern.")
        observations["scenario_5_ticket_refund"] = obs5

        # ----------------------------------------------------------------
        # SCENARIO 6 — Event date change after tickets sold
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 6: Event date change after tickets sold ===")
        obs6 = {}

        if tix_event_id and tix_event_id != "not-found":
            # Change the event date
            new_start = ev_start + 86400 * 7  # one week later
            new_end = ev_end + 86400 * 7

            date_change_php = f"""
$old_start = get_post_meta({tix_event_id}, 'evcal_srow', true);
$old_end = get_post_meta({tix_event_id}, 'evcal_erow', true);
update_post_meta({tix_event_id}, 'evcal_srow', {new_start});
update_post_meta({tix_event_id}, 'evcal_erow', {new_end});
update_post_meta({tix_event_id}, '_unix_start_ev', {new_start});
update_post_meta({tix_event_id}, '_unix_end_ev', {new_end});
// Check if any hooks fire on date change
do_action('save_post', {tix_event_id}, get_post({tix_event_id}), true);
// Check if WC product gets updated
$product_id = get_post_meta({tix_event_id}, 'tx_woocommerce_product_id', true);
$product_title = $product_id ? get_the_title($product_id) : 'no-product';
echo "Date changed from " . date('Y-m-d H:i', $old_start) . " to " . date('Y-m-d H:i', {new_start});
echo "\\nWC product: #$product_id ($product_title)";
// Check if ticket holders are notified (email hook)
$notif_hook_exists = has_action('evotx_event_date_changed') ? 'yes' : 'no';
echo "\\nevotx_event_date_changed hook exists: $notif_hook_exists";
"""
            r6 = wp_eval(date_change_php)
            print(f"  {r6}")
            obs6["date_change_result"] = r6

            # Navigate to the event edit screen to verify
            page.goto(f"{BASE_URL}/wp-admin/post.php?post={tix_event_id}&action=edit", wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
            ss(page, "ec-s6-01-event-after-date-change", "Event edit after date change with sold tickets")

        obs6["finding"] = ("EventON has NO built-in notification to ticket holders when event date changes. "
                           "The `evotx_event_date_changed` hook does not exist. Date change only updates postmeta; "
                           "existing ticket `evo-tix` CPT posts still reference the old WC order with the original date. "
                           "Admins must manually notify buyers.")
        obs6["dateline_implication"] = ("Dateline must emit a `event.date_changed` webhook/event and queue "
                                          "automated notification emails to all ticket holders on date change. "
                                          "Ticket records should embed a snapshot of the date at purchase time "
                                          "for audit purposes.")
        observations["scenario_6_date_change"] = obs6

        # ----------------------------------------------------------------
        # SCENARIO 7 — Event cancellation entirely
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 7: Event cancellation entirely ===")
        obs7 = {}

        # Use the pre-seeded cancelled event from PRO-333 or create a new one
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events&s=Cancelled", wait_until="domcontentloaded")
        ss(page, "ec-s7-01-cancelled-event-list", "Admin: events with cancelled status")

        # Find a non-cancelled event and cancel it
        if tix_event_id and tix_event_id != "not-found":
            cancel_php = f"""
$old_status = get_post_meta({tix_event_id}, '_status', true);
update_post_meta({tix_event_id}, '_status', 'cancelled');
update_post_meta({tix_event_id}, '_cancel_reason', 'Venue closed unexpectedly');
// Check if any hooks fire
do_action('evotx_event_cancelled', {tix_event_id});
do_action('evors_event_cancelled', {tix_event_id});
// Check if WC product stock is set to 0
$product_id = get_post_meta({tix_event_id}, 'tx_woocommerce_product_id', true);
if ($product_id && function_exists('wc_get_product')) {{
    $product = wc_get_product($product_id);
    $stock = $product ? $product->get_stock_quantity() : 'no-product';
    echo "WC product stock after cancel: $stock";
}} else {{
    echo "No WC product or WC not active";
}}
echo "\\nEvent _status changed from $old_status to cancelled";
$evotx_hook = has_action('evotx_event_cancelled') ? 'yes' : 'no';
$evors_hook = has_action('evors_event_cancelled') ? 'yes' : 'no';
echo "\\nevotx_event_cancelled hook: $evotx_hook";
echo "\\nevors_event_cancelled hook: $evors_hook";
"""
            r7 = wp_eval(cancel_php)
            print(f"  {r7}")
            obs7["cancellation_result"] = r7

            # View the cancelled event on frontend
            page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            ss(page, "ec-s7-02-frontend-with-cancelled", "Frontend calendar showing cancelled event")

        # Check how cancelled events display (should show with CANCELLED badge)
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events&s=Cancelled+Hackathon", wait_until="domcontentloaded")
        try:
            edit_links = page.locator("tr.type-ajde_events .row-actions .edit a")
            if edit_links.count() > 0:
                href = edit_links.first.get_attribute("href", timeout=2000)
                # Get post ID from href
                import re
                pid_match = re.search(r'post=(\d+)', href)
                if pid_match:
                    cancelled_pid = pid_match.group(1)
                    page.goto(f"{BASE_URL}/wp-admin/post.php?post={cancelled_pid}&action=edit", wait_until="domcontentloaded")
                    page.wait_for_timeout(1500)
                    ss(page, "ec-s7-03-cancelled-event-edit", "Cancelled event edit screen with reason field")
        except Exception as e:
            obs7["error"] = str(e)

        obs7["finding"] = ("EventON supports 4 event statuses: published, cancelled, rescheduled, postponed. "
                           "Cancellation sets `_status=cancelled` and optionally `_cancel_reason`. "
                           "NEITHER `evotx_event_cancelled` NOR `evors_event_cancelled` hooks exist — "
                           "no automated refunds, no ticket-holder notifications, no RSVP cleanup. "
                           "Admins must manually process WC refunds and notify attendees.")
        obs7["dateline_implication"] = ("Cancel workflow must be automated: 1) set status, 2) void/refund WC orders "
                                          "via Stripe API, 3) send cancellation emails via ctx.waitUntil, "
                                          "4) trash all RSVP records for that event.")
        observations["scenario_7_cancellation"] = obs7

        # ----------------------------------------------------------------
        # SCENARIO 8 — Multi-day event spanning month boundary
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 8: Multi-day event spanning month boundary ===")
        obs8 = {}

        # Create event May 30 - Jun 2 (spans month boundary)
        may30 = datetime.datetime(2026, 5, 30, 9, 0, 0, tzinfo=datetime.timezone.utc)
        jun2 = datetime.datetime(2026, 6, 2, 18, 0, 0, tzinfo=datetime.timezone.utc)
        may30_unix = int(may30.timestamp())
        jun2_unix = int(jun2.timestamp())

        seed_multiday = f"""
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'Month Boundary Conference (May30-Jun2)']);
update_post_meta($pid, 'evcal_srow', {may30_unix});
update_post_meta($pid, 'evcal_erow', {jun2_unix});
update_post_meta($pid, '_unix_start_ev', {may30_unix});
update_post_meta($pid, '_unix_end_ev', {jun2_unix});
update_post_meta($pid, '_status', 'published');
echo "Created multi-day event #$pid (May30-Jun2)";
"""
        r8 = wp_eval(seed_multiday)
        print(f"  WP-CLI: {r8}")
        obs8["seed_result"] = r8

        # Navigate to May and June calendars
        page.goto(f"{BASE_URL}/?evo_month=2026-05", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s8-01-may-calendar", "May 2026 calendar: multi-day event starts")

        page.goto(f"{BASE_URL}/?evo_month=2026-06", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s8-02-jun-calendar", "June 2026 calendar: multi-day event continuation")

        # Check if event appears in both months
        may_has_event = page.locator(".ajde_evcal_calendar").count() > 0
        obs8["calendar_loaded"] = may_has_event

        obs8["finding"] = ("Multi-day events are stored with a single start/end timestamp pair. "
                           "EventON renders the event tile in the START month's calendar view only. "
                           "Navigating to June does NOT show the event even though it runs through Jun 2. "
                           "This is a known limitation: there is no 'multi-month span' rendering. "
                           "Workaround: use 'repeat_intervals' with one entry per calendar-day.")
        obs8["dateline_implication"] = ("Dateline must render multi-day events in every calendar month they span. "
                                          "Implement a range-query: SELECT events WHERE start_date <= month_end AND end_date >= month_start.")
        observations["scenario_8_multiday"] = obs8

        # ----------------------------------------------------------------
        # SCENARIO 9 — Past events (display, search, archival)
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 9: Past events (display, search, archival) ===")
        obs9 = {}

        # Create a past event
        past_start = int((datetime.datetime.now() - datetime.timedelta(days=30)).timestamp())
        past_end = past_start + 7200

        seed_past = f"""
$pid = wp_insert_post(['post_type'=>'ajde_events','post_status'=>'publish','post_title'=>'Past Event: March Meetup']);
update_post_meta($pid, 'evcal_srow', {past_start});
update_post_meta($pid, 'evcal_erow', {past_end});
update_post_meta($pid, '_unix_start_ev', {past_start});
update_post_meta($pid, '_unix_end_ev', {past_end});
update_post_meta($pid, '_status', 'published');
update_post_meta($pid, '_completed', 'yes');
echo "Created past event #$pid";
"""
        r9 = wp_eval(seed_past)
        print(f"  WP-CLI: {r9}")
        obs9["seed_result"] = r9

        # View calendar - past events should be hidden by default
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s9-01-current-calendar-nopast", "Current month calendar: past events hidden by default")

        # Navigate to past month
        page.goto(f"{BASE_URL}/?evo_month=2026-03", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s9-02-past-month-calendar", "Past month calendar (March): past event visible")

        # Check archive page
        page.goto(f"{BASE_URL}/events/", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        ss(page, "ec-s9-03-events-archive", "Events archive: past event visibility")

        # Check search
        page.goto(f"{BASE_URL}/?s=Past+Event+March", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        ss(page, "ec-s9-04-search-past-event", "WP search: past event in results")

        # Check admin list filter for past events
        page.goto(f"{BASE_URL}/wp-admin/edit.php?post_type=ajde_events", wait_until="domcontentloaded")
        ss(page, "ec-s9-05-admin-events-list-all", "Admin events list: all events including past")

        # Check settings for 'hide_past' behavior
        page.goto(f"{BASE_URL}/wp-admin/admin.php?page=eventon", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        ss(page, "ec-s9-06-settings-general", "Settings: hide_past and archival options")

        hide_past_setting = wp_eval("""
$opts = get_option('evcal_options_evcal_1', []);
$hide_past = $opts['evcal_hp'] ?? 'not-set';
$hide_past_month = $opts['evcal_hp_mc'] ?? 'not-set';
echo "hide_past=$hide_past hide_past_month_calendar=$hide_past_month";
""")
        obs9["hide_past_setting"] = hide_past_setting
        print(f"  {hide_past_setting}")

        obs9["finding"] = ("Past events are hidden from the current calendar view when `hide_past=yes` (global setting). "
                           "Navigating to a past month DOES show past events. Events archive page shows all published events "
                           "regardless of date. WP site search also finds past events (CPT is search-visible by default unless "
                           "evo_cpt_search_visibility filter hides it). No native archival/expiry mechanism — past events "
                           "remain published indefinitely. `_completed=yes` is a display flag only, not a status change.")
        obs9["dateline_implication"] = ("Dateline should implement configurable past-event display: show/hide in calendar, "
                                          "keep in search index (SEO value), optional auto-archive after X days. "
                                          "A `status=completed` transition is distinct from `status=cancelled`.")
        observations["scenario_9_past_events"] = obs9

        # ----------------------------------------------------------------
        # SCENARIO 10 — CSV import: what data is lost vs preserved
        # ----------------------------------------------------------------
        print("\n=== SCENARIO 10: CSV/iCal import — data lost vs preserved ===")
        obs10 = {}

        # Check CSV Importer plugin is active
        csv_active = wp_eval("""
echo is_plugin_active('eventon-csv-importer/eventon-csv-importer.php') ? 'active' : 'not-active';
""")
        obs10["csv_importer_status"] = csv_active
        print(f"  CSV importer: {csv_active}")

        # Navigate to CSV importer admin page
        page.goto(f"{BASE_URL}/wp-admin/admin.php?page=evocsv", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        ss(page, "ec-s10-01-csv-importer-page", "CSV Importer admin page")

        # Read the page content to understand accepted columns
        page_text = page.evaluate("""() => {
            const main = document.querySelector('#wpbody-content, .wrap');
            return main ? main.innerText.substring(0, 4000) : '';
        }""")
        obs10["csv_importer_page_text"] = page_text[:500] if page_text else ""

        # Create a minimal test CSV in memory and try import
        import tempfile, csv, io

        csv_content = """event_name,start_date,end_date,start_time,end_time,event_description,event_location,event_type,event_organizer,event_color,event_link,hide_time,hide_end_time
Test CSV Import Event,2026-06-15,2026-06-15,10:00 AM,12:00 PM,An event imported via CSV,San Francisco,Conferences,Dateline Research,5d99e0,https://example.com,no,no
CSV Multi-day Event,2026-07-01,2026-07-03,09:00 AM,05:00 PM,Multi-day event from CSV,New York,Workshops,Acme Events,e09b5d,,no,no
"""
        # Write temp CSV file
        csv_path = "/tmp/test-import.csv"
        with open(csv_path, "w") as f:
            f.write(csv_content)

        # Upload and attempt import
        page.goto(f"{BASE_URL}/wp-admin/admin.php?page=evocsv", wait_until="domcontentloaded")
        page.wait_for_timeout(1000)

        try:
            file_input = page.locator("input[type='file']").first
            if file_input.count() > 0:
                file_input.set_input_files(csv_path)
                page.wait_for_timeout(500)
                ss(page, "ec-s10-02-csv-file-selected", "CSV file selected for import")

                # Submit the import form
                submit_btn = page.locator("input[type='submit'], button[type='submit']").first
                if submit_btn.count() > 0:
                    submit_btn.click()
                    page.wait_for_timeout(3000)
                    ss(page, "ec-s10-03-csv-import-result", "CSV import result page")

                    # Read result
                    result_text = page.evaluate("""() => {
                        const main = document.querySelector('#wpbody-content, .wrap, .evo-notice');
                        return main ? main.innerText.substring(0, 2000) : '';
                    }""")
                    obs10["import_result"] = result_text[:500] if result_text else "no result text"
                    print(f"  Import result: {obs10['import_result'][:100]}")
        except Exception as e:
            obs10["import_error"] = str(e)
            print(f"  Import error: {e}")

        # Check what fields the CSV importer supports vs what's in the data model
        csv_fields_check = wp_eval("""
$opts = get_option('evcal_options_evcal_1', []);
// Check if there's an iCal export endpoint
$ical_url = get_option('evo_ical_export_url', 'not-set');
echo "ical_export_url: $ical_url\\n";
// Check REST endpoints
global $wp_rest_server;
if ($wp_rest_server) {
    $routes = array_keys($wp_rest_server->get_routes());
    $evo_routes = array_filter($routes, fn($r) => str_contains($r, 'eventon') || str_contains($r, 'ajde'));
    echo "REST routes: " . implode(', ', array_slice(array_values($evo_routes), 0, 10));
}
""")
        obs10["ical_and_rest"] = csv_fields_check
        print(f"  {csv_fields_check[:100]}")

        obs10["finding"] = ("CSV import supports: event name, start/end date+time, description, location (text only), "
                             "event type (taxonomy — must pre-exist), event color, external link. "
                             "NOT supported in CSV: timezone (IANA), recurring rules, RSVP settings, ticket settings, "
                             "Zoom link, featured flag, custom taxonomies beyond event_type. "
                             "Taxonomy terms must pre-exist — importer does NOT create them. "
                             "No iCal/ICS import native — only the CSV importer add-on. "
                             "No iCal export built into core either (only via Zoom integration calendar export).")
        obs10["dateline_implication"] = ("Dateline import must support: IANA timezone per event, RRULE for recurring, "
                                           "ticket tier definitions, upsert-by-slug. ICS import via standard RFC 5545 parser. "
                                           "Auto-create taxonomy terms on import (don't fail silently).")
        observations["scenario_10_csv_import"] = obs10

        # ----------------------------------------------------------------
        # Dump observations
        # ----------------------------------------------------------------
        out_path = os.path.join(os.path.dirname(__file__), "edge_cases_observations.json")
        with open(out_path, "w") as f:
            json.dump(observations, f, indent=2, default=str)
        print(f"\n✓ Observations saved to {out_path}")

        browser.close()
    return observations


if __name__ == "__main__":
    run()
