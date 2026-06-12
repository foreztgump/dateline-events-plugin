import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

import type { DatelineViewEvent } from "@dateline/views";

const fridayMeetup: DatelineViewEvent = {
  id: "friday-meetup",
  slug: "friday-meetup",
  title: "Friday Meetup RSVP Night",
  shortDescription: "Capacity-limited community meetup with free RSVP.",
  startsAt: "2026-05-08T01:00:00.000Z",
  endsAt: "2026-05-08T03:00:00.000Z",
  timezone: "America/Los_Angeles",
  allDay: false,
  status: "published",
  locationType: "physical",
  venue: "harbor-hall",
  organizers: ["dateline-community"],
  categories: ["community"],
  rsvpRequired: true,
};

vi.mock("../../lib/events.js", () => ({
  loadEventBySlug: (slug: string) => Promise.resolve(slug === "friday-meetup" ? fridayMeetup : undefined),
  loadVenueForEvent: () => Promise.resolve(undefined),
  loadOrganizersForEvent: () => Promise.resolve([]),
}));

import EventPage from "./[slug].astro";

describe("event detail page", () => {
  it("renders schema.org JSON-LD and the RSVP form for RSVP-required events", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(EventPage, { params: { slug: "friday-meetup" } });

    // Assert
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('data-dateline-component="RsvpForm"');
  });
});
