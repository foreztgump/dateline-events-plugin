import { describe, expect, it } from "vitest";
import { displayEvents, seedEvents, seedOrganizers, seedVenues } from "./fixtures.js";

describe("reference fixtures", () => {
  it("cover the milestone 4 seeded content requirements", () => {
    // Arrange
    const recurringEvent = seedEvents.find((event) => event.recurrenceRule?.includes("FREQ=WEEKLY"));
    const pricedEvent = seedEvents.find((event) => event.x402Price);
    const rsvpEvent = seedEvents.find((event) => event.rsvpRequired);
    const nonUtcEvent = seedEvents.find((event) => event.timezone !== "UTC");
    const richEvent = seedEvents.find((event) => Boolean(event.venue) && event.organizers.length > 0);

    // Act
    const weeklyOccurrences = displayEvents.filter((event) => event.parentSeries === recurringEvent?.id);

    // Assert
    expect(seedEvents).toHaveLength(10);
    expect(seedVenues.length).toBeGreaterThanOrEqual(3);
    expect(seedOrganizers.length).toBeGreaterThanOrEqual(3);
    expect(recurringEvent?.timezone).toBe("America/Los_Angeles");
    expect(weeklyOccurrences).toHaveLength(6);
    expect(richEvent?.venue).toBeTruthy();
    expect(pricedEvent?.x402Price).toEqual({ amount: 250, currency: "USD" });
    expect(nonUtcEvent).toBeTruthy();
    expect(rsvpEvent?.capacity).toBe(5);
  });
});
