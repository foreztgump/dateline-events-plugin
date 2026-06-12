import { describe, expect, it, vi } from "vitest";

import type { DatelineViewEvent } from "@dateline/views";

const weeklyYoga: DatelineViewEvent = {
  id: "weekly-yoga-dst",
  slug: "weekly-yoga-dst",
  title: "Weekly Yoga Across DST",
  startsAt: "2027-03-01T17:00:00.000Z",
  endsAt: "2027-03-01T18:00:00.000Z",
  timezone: "America/Los_Angeles",
  allDay: false,
  status: "published",
  locationType: "physical",
  organizers: ["reef-network"],
  categories: ["workshop"],
  recurrenceRule: "FREQ=WEEKLY;COUNT=6",
};

vi.mock("../lib/events.js", () => ({
  loadSeedEvents: () => Promise.resolve([weeklyYoga]),
}));

import { GET } from "./events.ics.js";

describe("events.ics", () => {
  it("returns an RFC 5545 calendar generated through the core iCal route", async () => {
    // Arrange / Act
    const response = await GET();
    const body = await response.text();

    // Assert
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("RRULE:FREQ=WEEKLY;COUNT=6");
    expect(body).toContain("DTSTART;TZID=America/Los_Angeles");
  });
});
