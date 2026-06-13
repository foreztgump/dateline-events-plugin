import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

// A-M3-9 / A-M3-10: the iCal feed renders from live content, and the importer
// round-trips a sample feed so imported events appear on /events and in the feed.

test("iCal feed is valid and carries seeded titles plus the recurring RRULE", async ({ request }) => {
  const res = await request.get("/events.ics");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");

  const body = await res.text();
  expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
  expect(body).toContain("BEGIN:VEVENT");
  expect(body).toContain("DTSTART");
  // SUMMARY matches a seeded title.
  expect(body).toContain("SUMMARY:Friday Meetup RSVP Night");
  // The recurring event carries an RRULE with a TZID-correct DTSTART.
  expect(body).toMatch(/RRULE:FREQ=WEEKLY/);
  expect(body).toMatch(/DT(START|END);TZID=/);
});

test("importer round-trip: a sample feed appears on /events and in the iCal feed", async ({ page, request }) => {
  const feedPath = fileURLToPath(new URL("../seed/sample-import.ics", import.meta.url));
  const feed = await readFile(feedPath, "utf-8");

  const importRes = await request.post("/api/import?format=ical", {
    headers: { "content-type": "text/calendar" },
    data: feed,
  });
  expect(importRes.status()).toBe(200);
  const summary = (await importRes.json()) as { created: number; skipped: number };
  // Idempotent by slug: created on first run, skipped if a prior run already imported.
  expect(summary.created + summary.skipped).toBeGreaterThanOrEqual(2);

  // Imported titles appear on the events list.
  await page.goto("/events");
  await expect(page.getByText("Imported Harbor Cleanup").first()).toBeVisible();
  await expect(page.getByText("Imported Night Market").first()).toBeVisible();

  // ...and in the iCal feed.
  const ics = await (await request.get("/events.ics")).text();
  expect(ics).toContain("SUMMARY:Imported Harbor Cleanup");
  expect(ics).toContain("SUMMARY:Imported Night Market");
});
