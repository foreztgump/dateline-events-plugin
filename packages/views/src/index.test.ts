import { describe, expect, it } from "vitest";
import {
  CalendarAgenda,
  CalendarAgendaHeadless,
  CalendarDay,
  CalendarDayHeadless,
  CalendarList,
  CalendarListHeadless,
  CalendarMonth,
  CalendarMonthHeadless,
  CalendarWeek,
  CalendarWeekHeadless,
  EventCard,
  EventCardHeadless,
  EventDetail,
  EventDetailHeadless,
  EventHero,
  EventHeroHeadless,
  OrganizerCard,
  OrganizerCardHeadless,
  RsvpForm,
  RsvpFormHeadless,
  VenueMap,
  VenueMapHeadless,
  emdashLoader,
} from "./index.js";

describe("@dateline/views exports", () => {
  it("exports every styled and headless Astro component", () => {
    // Arrange
    const exportsToCheck = [
      CalendarMonth, CalendarMonthHeadless, CalendarWeek, CalendarWeekHeadless, CalendarDay, CalendarDayHeadless,
      CalendarList, CalendarListHeadless, CalendarAgenda, CalendarAgendaHeadless, EventCard, EventCardHeadless,
      EventDetail, EventDetailHeadless, EventHero, EventHeroHeadless, RsvpForm, RsvpFormHeadless, VenueMap,
      VenueMapHeadless, OrganizerCard, OrganizerCardHeadless,
    ];

    // Act
    const missingExports = exportsToCheck.filter((component) => component === undefined);

    // Assert
    expect(missingExports).toEqual([]);
  });

  it("wraps EmDash collection reads in an Astro live collection loader shape", async () => {
    // Arrange
    const loader = emdashLoader({
      collection: "dateline_events",
      getCollection: async (collection) => {
        await Promise.resolve();
        return { entries: [{ id: "evt-1", collection }], error: null };
      },
    });

    // Act
    const result = await loader.load();

    // Assert
    expect(result).toEqual({ entries: [{ id: "evt-1", collection: "dateline_events" }], totalCount: 1 });
  });
});
