import { expect, test } from "@playwright/test";

// A-M3-1 / A-M3-2 / A-M3-3: the calendar, list, and detail pages render from the
// live EmDash sqlite content store (seeded titles), not from deleted fixtures.

test("homepage month view renders seeded event titles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Month view" })).toBeVisible();
  // The month view is anchored on the seeded May 2026 dataset; these titles
  // fall in that month and surface as links inside the calendar grid.
  const monthView = page.locator('[data-dateline-component="CalendarMonth"]');
  await expect(monthView.getByRole("link", { name: "Friday Meetup RSVP Night" })).toBeVisible();
  await expect(monthView.getByRole("link", { name: "Closing Social" })).toBeVisible();
});

test("events list renders the seeded events linking to detail pages", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "All seeded Dateline events" })).toBeVisible();
  // Every seeded event title appears; the RSVP event links to its detail page.
  await expect(page.getByText("Friday Meetup RSVP Night").first()).toBeVisible();
  await expect(page.getByText("Closing Social").first()).toBeVisible();
  await expect(page.locator('a[href="/events/friday-meetup"]').first()).toBeVisible();
});

test("event detail renders title, time, and an RSVP form for RSVP-enabled events", async ({ page }) => {
  await page.goto("/events/friday-meetup");
  await expect(page.getByRole("heading", { name: "Friday Meetup RSVP Night", level: 1 })).toBeVisible();
  // Datetime is rendered from the content store (not statically baked).
  await expect(page.getByText("Time:")).toBeVisible();
  // The RSVP form must render now that rsvp_required is read from live data.
  await expect(page.getByRole("button", { name: "Submit RSVP" })).toBeVisible();
});
