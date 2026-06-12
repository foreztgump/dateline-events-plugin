import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

import type { DatelineViewEvent } from "@dateline/views";

const fridayMeetup: DatelineViewEvent = {
  id: "friday-meetup",
  slug: "friday-meetup",
  title: "Friday Meetup RSVP Night",
  startsAt: "2026-05-08T01:00:00.000Z",
  endsAt: "2026-05-08T03:00:00.000Z",
  timezone: "America/Los_Angeles",
  allDay: false,
  status: "published",
  locationType: "physical",
  organizers: ["dateline-community"],
  categories: ["community"],
  rsvpRequired: true,
};

vi.mock("../lib/events.js", () => ({
  referenceMonth: "2026-05",
  referenceWeekStart: "2026-05-25",
  referenceDay: "2026-05-27",
  loadDisplayEvents: () => Promise.resolve([fridayMeetup]),
}));

import IndexPage from "./index.astro";

describe("reference landing page", () => {
  it("renders the Dateline views calendar showcase with live events", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(IndexPage);

    // Assert
    expect(html).toContain('data-dateline-component="CalendarMonth"');
    expect(html).toContain('data-dateline-component="CalendarWeek"');
    expect(html).toContain('data-dateline-component="CalendarDay"');
    expect(html).toContain('data-dateline-component="CalendarAgenda"');
    expect(html).toContain("Friday Meetup RSVP Night");
  });
});
