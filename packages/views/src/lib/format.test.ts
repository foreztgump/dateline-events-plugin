import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEventDateTime, formatEventTimeRange } from "./format.js";
import type { DatelineViewEvent } from "./types.js";

function buildEvent(overrides: Partial<DatelineViewEvent> = {}): DatelineViewEvent {
  return {
    id: "evt-1",
    title: "Test event",
    startsAt: "2026-05-15T18:00:00.000Z",
    endsAt: "2026-05-15T20:00:00.000Z",
    timezone: "America/Los_Angeles",
    allDay: false,
    status: "published",
    locationType: "physical",
    organizers: [],
    categories: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatEventTimeRange", () => {
  it("renders 11:00 AM – 1:00 PM in event timezone (America/Los_Angeles) regardless of host TZ", () => {
    // Arrange
    vi.stubEnv("TZ", "America/New_York");
    const event = buildEvent();

    // Act
    const result = formatEventTimeRange(event);

    // Assert
    expect(result).toBe("11:00 AM – 1:00 PM");
  });

  it("returns identical output under host TZ=UTC and host TZ=America/New_York", () => {
    // Arrange
    const event = buildEvent();

    // Act
    vi.stubEnv("TZ", "UTC");
    const underUtc = formatEventTimeRange(event);
    vi.stubEnv("TZ", "America/New_York");
    const underNewYork = formatEventTimeRange(event);

    // Assert
    expect(underUtc).toBe(underNewYork);
    expect(underUtc).toBe("11:00 AM – 1:00 PM");
  });

  it("defaults to UTC (not host TZ) when event.timezone is missing", () => {
    // Arrange
    vi.stubEnv("TZ", "America/New_York");
    const event = buildEvent({ timezone: "" });

    // Act
    const result = formatEventTimeRange(event);

    // Assert
    expect(result).toBe("6:00 PM – 8:00 PM");
  });

  it("falls back to UTC when event.timezone is invalid", () => {
    // Arrange
    const event = buildEvent({ timezone: "America/Not_A_Place" });
    const utcEvent = buildEvent({ timezone: "UTC" });

    // Act / Assert
    expect(() => formatEventTimeRange(event)).not.toThrow();
    expect(formatEventTimeRange(event)).toBe(formatEventTimeRange(utcEvent));
  });

  it("returns 'All day' when event.allDay is true", () => {
    // Arrange
    const event = buildEvent({ allDay: true });

    // Act
    const result = formatEventTimeRange(event);

    // Assert
    expect(result).toBe("All day");
  });
});

describe("formatEventDateTime", () => {
  it("formats start time in event timezone regardless of host TZ", () => {
    // Arrange
    vi.stubEnv("TZ", "America/New_York");
    const event = buildEvent();

    // Act
    const result = formatEventDateTime(event);

    // Assert
    expect(result).toBe("May 15, 2026, 11:00 AM");
  });

  it("returns identical output under host TZ=UTC and host TZ=America/New_York", () => {
    // Arrange
    const event = buildEvent();

    // Act
    vi.stubEnv("TZ", "UTC");
    const underUtc = formatEventDateTime(event);
    vi.stubEnv("TZ", "America/New_York");
    const underNewYork = formatEventDateTime(event);

    // Assert
    expect(underUtc).toBe(underNewYork);
    expect(underUtc).toBe("May 15, 2026, 11:00 AM");
  });

  it("defaults to UTC (not host TZ) when event.timezone is missing", () => {
    // Arrange
    vi.stubEnv("TZ", "America/New_York");
    const event = buildEvent({ timezone: "" });

    // Act
    const result = formatEventDateTime(event);

    // Assert
    expect(result).toBe("May 15, 2026, 6:00 PM");
  });

  it("falls back to UTC when event.timezone is invalid", () => {
    // Arrange
    const event = buildEvent({ timezone: "America/Not_A_Place" });
    const utcEvent = buildEvent({ timezone: "UTC" });

    // Act / Assert
    expect(() => formatEventDateTime(event)).not.toThrow();
    expect(formatEventDateTime(event)).toBe(formatEventDateTime(utcEvent));
  });
});
