import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import CalendarMonth from "./CalendarMonth.astro";
import CalendarMonthHeadless from "./CalendarMonthHeadless.astro";
import type { DatelineViewEvent } from "../lib/types.js";

const events: DatelineViewEvent[] = [
  { id: "spring-series", title: "Spring Workshop", startsAt: "2026-05-15T09:00:00.000Z", endsAt: "2026-05-17T17:00:00.000Z", timezone: "America/Los_Angeles", allDay: false, status: "live", locationType: "physical", organizers: [], categories: ["learning"] },
  { id: "keynote", title: "Keynote", startsAt: "2026-05-15T18:00:00.000Z", endsAt: "2026-05-15T19:00:00.000Z", timezone: "America/Los_Angeles", allDay: false, status: "live", locationType: "physical", organizers: [], categories: ["talk"] },
  { id: "extra-1", title: "Extra One", startsAt: "2026-05-15T20:00:00.000Z", endsAt: "2026-05-15T21:00:00.000Z", timezone: "America/Los_Angeles", allDay: false, status: "live", locationType: "physical", organizers: [], categories: [] },
  { id: "extra-2", title: "Extra Two", startsAt: "2026-05-15T22:00:00.000Z", endsAt: "2026-05-15T23:00:00.000Z", timezone: "America/Los_Angeles", allDay: false, status: "live", locationType: "physical", organizers: [], categories: [] },
];

describe("CalendarMonth", () => {
  it("renders a fixed accessible month grid with events on their date cells", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(CalendarMonth, { props: { events, month: "2026-05" } });

    // Assert
    expect(html).toContain('<table');
    expect(html.match(/data-date=/g)).toHaveLength(42);
    expect(html).toContain('aria-label="Events calendar for May 2026"');
    expect(html).toContain('data-date="2026-05-15"');
    expect(html).toContain("Spring Workshop");
    expect(html).toContain('data-span-days="3"');
    expect(html).toContain("+1 more");
  });

  it("renders the headless variant without class attributes", async () => {
    // Arrange
    const container = await AstroContainer.create();

    // Act
    const html = await container.renderToString(CalendarMonthHeadless, { props: { events, month: "2026-05" } });

    // Assert
    expect(html).toContain('data-dateline-component="CalendarMonthHeadless"');
    expect(html).not.toContain("class=");
  });
});
