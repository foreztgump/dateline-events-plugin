import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

import type { DatelineViewEvent } from "@dateline/views";

const { loadEventBySlugMock } = vi.hoisted(() => ({
  loadEventBySlugMock: vi.fn<(slug: string) => Promise<DatelineViewEvent | undefined>>(),
}));

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
  rsvpCapacity: 5,
  rsvpRemaining: 5,
};

vi.mock("../../lib/events.js", () => ({
  loadEventBySlug: loadEventBySlugMock,
  loadVenueForEvent: () => Promise.resolve(undefined),
  loadOrganizersForEvent: () => Promise.resolve([]),
}));

import EventPage from "./[slug].astro";

describe("event detail page", () => {
  it.sequential("renders schema.org JSON-LD and the RSVP form for RSVP-required events", async () => {
    // Arrange
    const container = await AstroContainer.create();
    loadEventBySlugMock.mockResolvedValueOnce(fridayMeetup);

    // Act
    const html = await container.renderToString(EventPage, { params: { slug: "friday-meetup" } });

    // Assert
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('data-dateline-component="RsvpForm"');
    expect(html).toContain('action="/api/rsvp"');
    expect(html).toContain("5 spots remaining");
  });

  it.sequential("renders a full-state message instead of the RSVP submit button when capacity is exhausted", async () => {
    // Arrange
    const container = await AstroContainer.create();
    loadEventBySlugMock.mockResolvedValueOnce({ ...fridayMeetup, rsvpRemaining: 0, rsvpCapacity: 5 });

    // Act
    const html = await container.renderToString(EventPage, { params: { slug: "friday-meetup" } });

    // Assert
    expect(html).toContain("This event is full");
    expect(html).not.toContain("Submit RSVP");
  });
});
