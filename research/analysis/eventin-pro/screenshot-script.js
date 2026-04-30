/**
 * Eventin Pro UX Documentation Script
 * Captures admin + frontend screenshots and extracts page structure
 * for PRO-330 feature inventory
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:32772';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR = __dirname;

const LOGIN = { username: 'admin', password: 'adminpass123' };

async function login(page) {
  await page.goto(`${BASE_URL}/wp-login.php`);
  await page.fill('#user_login', LOGIN.username);
  await page.fill('#user_pass', LOGIN.password);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**');
  console.log('✓ Logged in');
}

async function screenshot(page, name, description) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename} — ${description}`);
  return filename;
}

async function getText(page, selector) {
  try {
    return await page.textContent(selector, { timeout: 2000 });
  } catch {
    return '';
  }
}

// Collect observations per screen
const observations = {
  adminScreens: [],
  frontendScreens: [],
  integrations: []
};

async function visitAdminScreen(page, url, name, description) {
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const title = await page.title();
    const heading = await getText(page, 'h1, h2.eventin-page-title, .eventin-title');
    const screenshotFile = await screenshot(page, name, description);
    
    // Get page text content for structured analysis
    const bodyText = await page.evaluate(() => {
      // Remove scripts, styles, noscript
      const cloned = document.body.cloneNode(true);
      ['script', 'style', 'noscript', '#adminmenuwrap', '#wpfooter'].forEach(sel => {
        cloned.querySelectorAll(sel).forEach(el => el.remove());
      });
      return cloned.innerText.substring(0, 8000);
    });

    observations.adminScreens.push({
      name, description, url, title, heading: heading?.trim(), screenshot: screenshotFile,
      content: bodyText
    });
    console.log(`  ✓ Admin: ${description}`);
    return true;
  } catch (e) {
    console.log(`  ✗ Admin: ${description} — ${e.message.substring(0, 80)}`);
    return false;
  }
}

async function visitFrontendScreen(page, url, name, description) {
  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);
    const title = await page.title();
    const screenshotFile = await screenshot(page, name, description);
    
    const bodyText = await page.evaluate(() => {
      const cloned = document.body.cloneNode(true);
      ['script', 'style', 'noscript', '.admin-bar'].forEach(sel => {
        cloned.querySelectorAll(sel).forEach(el => el.remove());
      });
      return cloned.innerText.substring(0, 6000);
    });

    observations.frontendScreens.push({
      name, description, url, title, screenshot: screenshotFile, content: bodyText
    });
    console.log(`  ✓ Frontend: ${description}`);
    return true;
  } catch (e) {
    console.log(`  ✗ Frontend: ${description} — ${e.message.substring(0, 80)}`);
    return false;
  }
}

async function exploreEventinProMenus(page) {
  console.log('\n--- Discovering Eventin menu items ---');
  await page.goto(`${BASE_URL}/wp-admin/`, { waitUntil: 'networkidle' });
  
  // Get all menu items
  const menuItems = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('#adminmenu li.menu-top').forEach(li => {
      const link = li.querySelector('a');
      if (!link) return;
      const text = link.textContent.trim().replace(/\d+$/, '').trim();
      const href = link.getAttribute('href');
      items.push({ text, href });
    });
    return items;
  });
  
  console.log('Top-level menu items:');
  menuItems.forEach(m => console.log(`  - ${m.text}: ${m.href}`));
  return menuItems;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Suppress SSL errors for DDEV
  page.on('pageerror', () => {});

  try {
    await login(page);
    
    // === STEP 1: Discover menus ===
    await exploreEventinProMenus(page);
    
    // === STEP 2: Eventin admin pages ===
    console.log('\n--- Eventin Pro Admin Screens ---');
    
    // Dashboard / overview
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn', 
      'admin-001-events-list', 'Events list table');
    
    // Event creation
    await visitAdminScreen(page, '/wp-admin/post-new.php?post_type=etn',
      'admin-002-event-create', 'New event creation screen');
    
    // Event edit — try to find an existing event first
    const eventId = await page.evaluate(async () => {
      const res = await fetch('/wp-admin/admin-ajax.php?action=query-attachments&query[post_type]=etn&query[posts_per_page]=1', {
        credentials: 'include'
      });
      return null; // fallback
    });
    
    // Attendees list
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn-attendee',
      'admin-003-attendees-list', 'Attendees list table');
    
    // Speakers list
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn-speaker',
      'admin-004-speakers-list', 'Speakers list table');
    
    // Webhooks
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn-webhook',
      'admin-005-webhooks-list', 'Webhooks list table');
    
    // Template builder
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn-template',
      'admin-006-templates-list', 'Template builder list');
    
    // Eventin settings
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_settings',
      'admin-007-settings-general', 'Eventin general settings');
    
    // Try different settings tabs
    const settingsTabs = [
      ['eventin_settings&tab=ticket', 'admin-008-settings-ticket', 'Ticket settings'],
      ['eventin_settings&tab=email', 'admin-009-settings-email', 'Email settings'],
      ['eventin_settings&tab=payments', 'admin-010-settings-payments', 'Payment settings'],
      ['eventin_settings&tab=zoom', 'admin-011-settings-zoom', 'Zoom settings'],
      ['eventin_settings&tab=google', 'admin-012-settings-google', 'Google Meet settings'],
      ['eventin_settings&tab=certificate', 'admin-013-settings-certificate', 'Certificate settings'],
      ['eventin_settings&tab=rsvp', 'admin-014-settings-rsvp', 'RSVP settings'],
      ['eventin_settings&tab=api', 'admin-015-settings-api', 'API settings'],
      ['eventin_settings&tab=ai', 'admin-016-settings-ai', 'AI settings'],
      ['eventin_settings&tab=advanced', 'admin-017-settings-advanced', 'Advanced settings'],
    ];
    for (const [tab, name, desc] of settingsTabs) {
      await visitAdminScreen(page, `/wp-admin/admin.php?page=${tab}`, name, desc);
    }
    
    // License page
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_license',
      'admin-018-license', 'License activation');
    
    // Permission settings
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_permission',
      'admin-019-permissions', 'Role-based permissions');
    
    // Shortcode settings
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_shortcode',
      'admin-020-shortcodes', 'Shortcode configuration');
    
    // Ticket scanner
    await visitAdminScreen(page, '/wp-admin/edit.php?post_type=etn-attendee&etn_action=ticket_scanner',
      'admin-021-ticket-scanner', 'QR ticket scanner');
    
    // Get all Eventin admin page links
    await page.goto(`${BASE_URL}/wp-admin/`, { waitUntil: 'networkidle' });
    const eventinSubmenus = await page.evaluate(() => {
      const items = [];
      const eventinMenu = Array.from(document.querySelectorAll('#adminmenu li.menu-top')).find(li => {
        const text = li.textContent.toLowerCase();
        return text.includes('eventin') || text.includes('event');
      });
      if (eventinMenu) {
        eventinMenu.querySelectorAll('a').forEach(a => {
          items.push({ text: a.textContent.trim(), href: a.getAttribute('href') });
        });
      }
      return items;
    });
    console.log('Eventin submenus found:', JSON.stringify(eventinSubmenus, null, 2));
    
    // === STEP 3: Create a sample event to explore edit screen ===
    console.log('\n--- Creating sample event ---');
    await page.goto(`${BASE_URL}/wp-admin/post-new.php?post_type=etn`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Get the new event edit page screenshot with all metaboxes visible
    await screenshot(page, 'admin-022-event-edit-full', 'Event edit screen — full metaboxes');
    
    // Scroll to see metaboxes
    await page.evaluate(() => window.scrollTo(0, 500));
    await screenshot(page, 'admin-023-event-edit-meta', 'Event edit — metabox area');
    
    await page.evaluate(() => window.scrollTo(0, 1000));
    await screenshot(page, 'admin-024-event-edit-settings', 'Event edit — lower settings');
    
    await page.evaluate(() => window.scrollTo(0, 1500));
    await screenshot(page, 'admin-025-event-edit-bottom', 'Event edit — bottom area');
    
    // === STEP 4: Frontend screens ===
    console.log('\n--- Frontend Screens ---');
    
    await visitFrontendScreen(page, '/', 'frontend-001-home', 'Site home page');
    
    // Look for eventin shortcodes / calendar on frontend
    // Try to find any published event
    await page.goto(`${BASE_URL}/wp-admin/edit.php?post_type=etn`, { waitUntil: 'networkidle' });
    const eventLinks = await page.evaluate(() => {
      const rows = document.querySelectorAll('#the-list tr');
      const links = [];
      rows.forEach(row => {
        const link = row.querySelector('.row-title a');
        if (link) links.push({ text: link.textContent.trim(), href: link.href });
      });
      return links.slice(0, 5);
    });
    console.log('Existing events:', JSON.stringify(eventLinks));
    
    // Create a test event via WP admin
    await page.goto(`${BASE_URL}/wp-admin/post-new.php?post_type=etn`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Fill in title via Gutenberg or classic editor
    const titleField = page.locator('.editor-post-title__input, #title, [aria-label="Add title"]');
    try {
      await titleField.first().fill('Test Event — Eventin Pro', { timeout: 5000 });
    } catch {}
    
    await screenshot(page, 'admin-026-event-title-filled', 'Event with title — showing React frontend dashboard concept');
    
    // === STEP 5: Explore frontend dashboard shortcode page ===
    // Create a page with eventin shortcodes if possible
    console.log('\n--- Looking for existing pages with Eventin content ---');
    await page.goto(`${BASE_URL}/wp-admin/edit.php?post_type=page`, { waitUntil: 'networkidle' });
    const pageLinks = await page.evaluate(() => {
      const rows = document.querySelectorAll('#the-list tr');
      const links = [];
      rows.forEach(row => {
        const link = row.querySelector('.row-title a');
        if (link) links.push({ text: link.textContent.trim(), href: link.href });
      });
      return links.slice(0, 10);
    });
    console.log('Pages:', JSON.stringify(pageLinks));
    
    await screenshot(page, 'admin-027-pages-list', 'WordPress pages list');
    
    // Visit sample page
    for (const pl of pageLinks.slice(0, 3)) {
      const slug = pl.href.split('/').filter(Boolean).pop();
      await visitFrontendScreen(page, `/?p=${slug}`, `frontend-page-${slug}`, `Page: ${pl.text}`);
    }
    
    // === STEP 6: Integration screens ===
    console.log('\n--- Integration Screens ---');
    
    // Google settings
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_settings&tab=google',
      'integration-001-google', 'Google Meet integration settings');
    
    // Stripe/PayPal in payments tab
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_settings&tab=payments',
      'integration-002-payments', 'Payment methods (Stripe/PayPal)');
    
    // Zoom settings  
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_settings&tab=zoom',
      'integration-003-zoom', 'Zoom meeting integration');
    
    // WooCommerce interop — check if WC settings exist
    await visitAdminScreen(page, '/wp-admin/admin.php?page=eventin_settings&tab=woocommerce',
      'integration-004-woocommerce', 'WooCommerce settings');
    
    // === STEP 7: REST API spot check ===
    console.log('\n--- REST API verification ---');
    const apiEndpoints = [
      '/wp-json/eventin/v2/events',
      '/wp-json/eventin/v2/permissions',
      '/wp-json/eventin/v2/webhooks',
    ];
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(`${BASE_URL}${endpoint}`);
        const status = response.status();
        const body = await response.text();
        console.log(`  REST ${endpoint}: ${status} — ${body.substring(0, 100)}`);
        observations.integrations.push({ endpoint, status, sample: body.substring(0, 200) });
      } catch (e) {
        console.log(`  REST ${endpoint}: error — ${e.message.substring(0, 50)}`);
      }
    }
    
  } finally {
    await browser.close();
  }
  
  // Save raw observations to JSON for later processing
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'observations.json'),
    JSON.stringify(observations, null, 2)
  );
  console.log('\n✓ Observations saved to observations.json');
  console.log(`✓ ${observations.adminScreens.length} admin screens captured`);
  console.log(`✓ ${observations.frontendScreens.length} frontend screens captured`);
}

main().catch(console.error);
