import { describe, it, expect } from "vitest";
import {
  CACHE_TTL_SECONDS,
  materializeOccurrences,
  validateRRule,
  type OccurrenceCache,
} from "./index.js";

describe("@dateline/recurring", () => {
  it("accepts valid RRULEs with an IANA timezone", () => {
    // Arrange
    const rule = "FREQ=WEEKLY;BYDAY=MO;COUNT=2";

    // Act
    const validation = validateRRule(rule, "America/Los_Angeles");

    // Assert
    expect(validation).toEqual({ ok: true });
  });

  it("rejects bogus IANA timezone identifiers", () => {
    // Arrange
    const rule = "FREQ=WEEKLY;BYDAY=MO;COUNT=2";

    // Act
    const validation = validateRRule(rule, "Mars/Olympus_Mons");

    // Assert
    expect(validation).toMatchObject({ ok: false, code: "INVALID_TZID" });
  });

  it("rejects RRULEs without FREQ", () => {
    // Arrange
    const rule = "BYDAY=MO;COUNT=2";

    // Act
    const validation = validateRRule(rule, "UTC");

    // Assert
    expect(validation).toMatchObject({ ok: false, code: "MISSING_FREQ" });
  });

  it("rejects invalid FREQ values with structured errors", () => {
    // Arrange
    const rule = "FREQ=SOMEDAY;COUNT=2";

    // Act
    const validation = validateRRule(rule, "UTC");

    // Assert
    expect(validation).toMatchObject({ ok: false, code: "INVALID_FREQ" });
  });

  it("materializes occurrences within range only", async () => {
    // Arrange
    const input = {
      rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=6",
      dtstart: "2026-05-04T16:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-11T16:00:00.000Z",
      "2026-05-18T16:00:00.000Z",
      "2026-05-25T16:00:00.000Z",
    ]);
  });

  it("caps materialization at two years forward", async () => {
    // Arrange
    const input = {
      rule: "FREQ=WEEKLY;BYDAY=MO",
      dtstart: "2026-01-05T17:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-01-01T00:00:00.000Z",
        end: "2036-01-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences).toHaveLength(104);
  });

  it("applies EXDATE and RDATE inputs", async () => {
    // Arrange
    const input = {
      rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=3",
      dtstart: "2026-05-04T16:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
      exdates: ["2026-05-11T16:00:00.000Z"],
      rdates: ["2026-05-14T16:00:00.000Z"],
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-14T16:00:00.000Z",
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("applies EXDATE and RDATE lines embedded with the RRULE", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
        "EXDATE;TZID=America/Los_Angeles:20260511T090000",
        "RDATE;TZID=America/Los_Angeles:20260514T090000",
      ].join("\n"),
      dtstart: "2026-05-04T16:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-14T16:00:00.000Z",
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("preserves wall-clock time across Los Angeles spring-forward DST", async () => {
    // Arrange
    const input = {
      rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=5",
      dtstart: "2026-03-02T17:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-03-01T00:00:00.000Z",
        end: "2026-04-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-03-02T17:00:00.000Z",
      "2026-03-09T16:00:00.000Z",
      "2026-03-16T16:00:00.000Z",
      "2026-03-23T16:00:00.000Z",
      "2026-03-30T16:00:00.000Z",
    ]);
    expect(
      occurrences.map((occurrence) =>
        new Intl.DateTimeFormat("en-US", {
          timeZone: input.tzid,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(occurrence.startsAt)),
      ),
    ).toEqual(["09:00", "09:00", "09:00", "09:00", "09:00"]);
  });

  it("uses KV cache with a one-hour TTL on repeated materialization", async () => {
    // Arrange
    const cache = createMemoryCache();
    const input = {
      rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=1",
      dtstart: "2026-05-04T16:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    await materializeOccurrences(input, cache);
    const occurrences = await materializeOccurrences(input, cache);

    // Assert
    expect(occurrences).toHaveLength(1);
    expect(cache.getCalls).toBe(2);
    expect(cache.putTtl).toBe(CACHE_TTL_SECONDS);
  });
});

function createMemoryCache(): OccurrenceCache & { getCalls: number; putTtl: number } {
  const values = new Map<string, string>();

  return {
    getCalls: 0,
    putTtl: 0,
    async get(key: string): Promise<string | null> {
      await Promise.resolve();
      this.getCalls += 1;
      return values.get(key) ?? null;
    },
    async put(key: string, value: string, options: { expirationTtl: number }): Promise<void> {
      await Promise.resolve();
      this.putTtl = options.expirationTtl;
      values.set(key, value);
    },
  };
}
