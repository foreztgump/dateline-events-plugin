import { describe, expect, it } from "vitest";
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
