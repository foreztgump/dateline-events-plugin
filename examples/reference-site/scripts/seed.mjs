/**
 * Seed the reference-site EmDash database and wire dev email delivery.
 *
 * Two steps:
 *   1. Apply `seed/seed.json` (collections + content) via the EmDash CLI.
 *   2. Select the trusted mock email transport as the `email:deliver` provider.
 *
 * Step 2 is required because EmDash auto-registers a built-in dev console email
 * provider (`emdash-console-email`) in DEV mode. With two providers present the
 * exclusive `email:deliver` hook has no single auto-selectable provider, so we
 * deterministically pin the option `emdash:exclusive_hook:email:deliver` to the
 * mock plugin id. That makes RSVP confirmation emails land in the observable
 * log (.emdash-dev/mock-email.log) rather than only the console.
 */
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import BetterSqlite3 from "better-sqlite3";

import { MOCK_EMAIL_PLUGIN_ID } from "../plugins/mock-email/index.mjs";
import { LOG_PATH } from "../plugins/mock-email/plugin.mjs";

// EmDash exclusive-hook selection key (see resolveExclusiveHooks). Stored in
// the `options` table as a JSON-encoded plugin id.
const EMAIL_DELIVER_OPTION = "emdash:exclusive_hook:email:deliver";
const RSVP_PLUGIN_ID = "dateline-rsvp";
const RSVP_STORAGE_COLLECTION = "rsvps";
const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(siteDir, "data.db");

const cli = fileURLToPath(new URL("../node_modules/emdash/dist/cli/index.mjs", import.meta.url));
const seedResult = spawnSync(
  process.execPath,
  [cli, "seed", "seed/seed.json", "--database", "./data.db", "--uploads-dir", "./uploads", "--on-conflict", "update"],
  { cwd: siteDir, stdio: "inherit" },
);
if (seedResult.error) {
  console.error("Failed to launch EmDash seed CLI:", seedResult.error);
  process.exit(1);
}
if (seedResult.status !== 0) process.exit(seedResult.status ?? 1);

// OptionsRepository stores values JSON-encoded; replicate its upsert with raw
// SQL to avoid pulling Kysely into the script's dependency surface.
const sqlite = new BetterSqlite3(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
try {
  sqlite
    .prepare("INSERT INTO options (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value")
    .run(EMAIL_DELIVER_OPTION, JSON.stringify(MOCK_EMAIL_PLUGIN_ID));
  console.log(`Selected mock email transport "${MOCK_EMAIL_PLUGIN_ID}" for email:deliver.`);
  resetRsvpStorage(sqlite);
  resetMockEmailLog();
} finally {
  sqlite.close();
}

function resetRsvpStorage(sqlite) {
  sqlite.prepare("DELETE FROM _plugin_storage WHERE plugin_id = ? AND collection = ?").run(RSVP_PLUGIN_ID, RSVP_STORAGE_COLLECTION);
  const events = sqlite.prepare("SELECT slug, title, capacity FROM ec_dateline_events WHERE rsvp_required = 1 AND capacity IS NOT NULL").all();
  const upsert = sqlite.prepare(`
    INSERT INTO _plugin_storage (plugin_id, collection, id, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(plugin_id, collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  for (const event of events) {
    upsert.run(RSVP_PLUGIN_ID, RSVP_STORAGE_COLLECTION, `capacity:${event.slug}`, capacityRecord(event), now, now);
  }
  console.log(`Seeded RSVP capacity records for ${events.length} event(s).`);
}

function capacityRecord(event) {
  return JSON.stringify({ kind: "capacity", eventId: event.slug, eventTitle: event.title, capacity: event.capacity, remaining: event.capacity });
}

function resetMockEmailLog() {
  if (existsSync(LOG_PATH)) unlinkSync(LOG_PATH);
  console.log(`Reset mock email capture log at ${LOG_PATH}.`);
}
