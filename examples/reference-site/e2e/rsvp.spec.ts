import { expect, test } from "@playwright/test";

// A-M3-5 / A-M3-7 / A-M3-8: RSVP submit confirms and decrements capacity, a full
// event shows the waitlist state, and the API rejects invalid submissions.
//
// These specs mutate capacity, so the suite runs serially (workers: 1) against a
// freshly reseeded database (webServer command runs scripts/seed.mjs first).

test("RSVP submit confirms and decrements remaining capacity on reload", async ({ page }) => {
  await page.goto("/events/friday-meetup");
  await expect(page.getByText(/spots remaining of 5/)).toBeVisible();

  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill("e2e-tester@example.com");
  await page.getByRole("button", { name: "Submit RSVP" }).click();

  // Confirmation page names the event.
  await expect(page.getByRole("heading", { name: /You're confirmed for Friday Meetup RSVP Night/ })).toBeVisible();

  // Reloading the event page shows the decremented count.
  await page.goto("/events/friday-meetup");
  await expect(page.getByText(/4 spots remaining of 5/)).toBeVisible();
});

test("a full event shows the waitlist state and hides the submit button", async ({ page, request }) => {
  // closing-social has capacity 2 — exhaust it via the API for a cheap full state.
  // maxRedirects: 0 so the 303 status is observed instead of following to 200.
  for (const email of ["full-one@example.com", "full-two@example.com"]) {
    const res = await request.post("/api/rsvp", {
      form: { event: "closing-social", name: "Filler", email },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
  }

  await page.goto("/events/closing-social");
  await expect(page.getByRole("heading", { name: "This event is full" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit RSVP" })).toHaveCount(0);

  // A further POST is rejected with 409 (capacity exhausted).
  const overflow = await request.post("/api/rsvp", {
    form: { event: "closing-social", name: "Too Late", email: "too-late@example.com" },
    maxRedirects: 0,
  });
  expect(overflow.status()).toBe(409);
});

test("the RSVP API rejects an invalid email without decrementing capacity", async ({ page, request }) => {
  const res = await request.post("/api/rsvp", {
    form: { event: "friday-meetup", name: "Bad Email", email: "not-an-email" },
  });
  expect(res.status()).toBe(422);

  // Capacity is unchanged by the rejected submission (still 4 after the first
  // spec's single successful RSVP).
  await page.goto("/events/friday-meetup");
  await expect(page.getByText(/4 spots remaining of 5/)).toBeVisible();
});
