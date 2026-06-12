import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_TTL_SECONDS,
  materializeOccurrences,
  validateRRule,
  type OccurrenceCache,
} from "./index.js";

declare const process: { env: Record<string, string | undefined> };

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

  it("matches lowercase TZID param names on EXDATE lines (PRO-494)", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=3",
        "EXDATE;tzid=America/Los_Angeles:20260514T090000",
      ].join("\n"),
      dtstart: "2026-05-07T16:00:00.000Z",
      tzid: "UTC",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-07T16:00:00.000Z",
      "2026-05-21T16:00:00.000Z",
    ]);
  });

  it("matches mixed-case TZID param names on EXDATE lines (PRO-494)", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=3",
        "EXDATE;Tzid=America/Los_Angeles:20260514T090000",
      ].join("\n"),
      dtstart: "2026-05-07T16:00:00.000Z",
      tzid: "UTC",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-07T16:00:00.000Z",
      "2026-05-21T16:00:00.000Z",
    ]);
  });

  it("continues matching uppercase TZID param names on EXDATE lines (PRO-494)", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=3",
        "EXDATE;TZID=America/Los_Angeles:20260514T090000",
      ].join("\n"),
      dtstart: "2026-05-07T16:00:00.000Z",
      tzid: "UTC",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-07T16:00:00.000Z",
      "2026-05-21T16:00:00.000Z",
    ]);
  });

  it("matches mixed-case TZID param names when other EXDATE params precede them (PRO-494)", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=3",
        "EXDATE;VALUE=DATE-TIME;Tzid=Europe/Paris:20260520T100000",
      ].join("\n"),
      dtstart: "2026-05-06T08:00:00.000Z",
      tzid: "UTC",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-06T08:00:00.000Z",
      "2026-05-13T08:00:00.000Z",
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

  it("parses TZID when followed by additional iCal property params (PRO-489)", async () => {
    // Arrange — VALUE param sits after TZID; naive split on TZID= used to
    // capture "America/Los_Angeles;VALUE=DATE-TIME" as the tzid.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
        "EXDATE;TZID=America/Los_Angeles;VALUE=DATE-TIME:20260511T090000",
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

    // Assert — second Monday is excluded.
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("parses TZID when other property params precede it (PRO-489)", async () => {
    // Arrange
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2",
        "RDATE;VALUE=DATE-TIME;TZID=America/Los_Angeles:20260514T090000",
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

    // Assert — extra Thursday at 09:00 LA is included as 16:00Z.
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-11T16:00:00.000Z",
      "2026-05-14T16:00:00.000Z",
    ]);
  });

  it("treats offset-less ISO EXDATE values as wall time in tzid (PRO-483)", async () => {
    // Arrange — extended ISO without offset must NOT be parsed via host TZ.
    // 09:00 LA == 16:00Z; under a UTC host the buggy code would interpret
    // "2026-05-11T09:00:00" as 09:00Z and fail to exclude the 16:00Z occurrence.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
        "EXDATE;TZID=America/Los_Angeles:2026-05-11T09:00:00",
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
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("preserves explicit-offset ISO EXDATE values (PRO-483)", async () => {
    // Arrange — Z-suffixed ISO is unambiguous; conversion stays correct.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
        "EXDATE:2026-05-11T16:00:00Z",
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
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("preserves numeric-offset ISO EXDATE values (PRO-483)", async () => {
    // Arrange — explicit -07:00 offset on the ISO value resolves unambiguously.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
        "EXDATE;TZID=America/Los_Angeles:2026-05-11T09:00:00-07:00",
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
      "2026-05-18T16:00:00.000Z",
    ]);
  });

  it("falls back to the input tzid when EXDATE has no TZID param (PRO-489)", async () => {
    // Arrange — basic-format UTC value (`...Z`) with no TZID param; the
    // bug-prone `split("TZID=")` path returned a polluted tzid; the fix walks
    // params and falls back to `input.tzid` when none is present.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=3",
        "EXDATE:20260514T090000Z",
      ].join("\n"),
      dtstart: "2026-05-07T09:00:00.000Z",
      tzid: "America/Los_Angeles",
      range: {
        start: "2026-05-01T00:00:00.000Z",
        end: "2026-06-01T00:00:00.000Z",
      },
    };

    // Act
    const occurrences = await materializeOccurrences(input);

    // Assert — the 2026-05-14T09:00:00Z occurrence is excluded.
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-07T09:00:00.000Z",
      "2026-05-21T09:00:00.000Z",
    ]);
  });

  it("converts RDATE with an explicit numeric ISO offset to UTC (PRO-483)", async () => {
    // Arrange — `+09:00` is unambiguous; parseIsoDateValue must route this via
    // `new Date(rawDate)` so the offset is honoured rather than reinterpreted
    // as wall time in `tzid`.
    const input = {
      rule: [
        "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2",
        "RDATE:2026-05-14T09:00:00+09:00",
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

    // Assert — 09:00 JST == 00:00 UTC same day.
    expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
      "2026-05-04T16:00:00.000Z",
      "2026-05-11T16:00:00.000Z",
      "2026-05-14T00:00:00.000Z",
    ]);
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

// Re-runs the PRO-489 / PRO-483 parsing cases under multiple host process
// timezones to assert host-tz independence (the regression class fixed by
// v0.1.0 PR #24 and completed here).
describe.each(["UTC", "America/New_York"])(
  "@dateline/recurring host-tz independence (TZ=%s)",
  (hostTz) => {
    let originalTz: string | undefined;

    beforeEach(() => {
      originalTz = process.env.TZ;
      process.env.TZ = hostTz;
      vi.stubEnv("TZ", hostTz);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it("parses TZID with trailing iCal params (PRO-489)", async () => {
      // Arrange
      const input = {
        rule: [
          "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
          "EXDATE;TZID=America/Los_Angeles;VALUE=DATE-TIME:20260511T090000",
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
        "2026-05-18T16:00:00.000Z",
      ]);
    });

    it("parses TZID with leading iCal params (PRO-489)", async () => {
      // Arrange
      const input = {
        rule: [
          "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2",
          "RDATE;VALUE=DATE-TIME;TZID=Europe/Paris:20260520T100000",
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

      // Assert — 10:00 Europe/Paris (CEST, +02:00) == 08:00Z.
      expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
        "2026-05-04T16:00:00.000Z",
        "2026-05-11T16:00:00.000Z",
        "2026-05-20T08:00:00.000Z",
      ]);
    });

    it("falls back to input tzid when EXDATE has no TZID param (PRO-489)", async () => {
      // Arrange
      const input = {
        rule: [
          "RRULE:FREQ=WEEKLY;BYDAY=TH;COUNT=3",
          "EXDATE:20260514T090000Z",
        ].join("\n"),
        dtstart: "2026-05-07T09:00:00.000Z",
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
        "2026-05-07T09:00:00.000Z",
        "2026-05-21T09:00:00.000Z",
      ]);
    });

    it("treats offset-less ISO EXDATE as wall time in tzid (PRO-483)", async () => {
      // Arrange — under TZ=UTC the buggy `new Date("2026-05-11T09:00:00")`
      // path produced 09:00Z and missed the 16:00Z occurrence; under
      // TZ=America/New_York it produced 13:00Z. Both must convert to 16:00Z
      // via wall→UTC in `America/Los_Angeles`.
      const input = {
        rule: [
          "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3",
          "EXDATE;TZID=America/Los_Angeles:2026-05-11T09:00:00",
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
        "2026-05-18T16:00:00.000Z",
      ]);
    });

    it("converts RDATE with explicit ISO offset to UTC (PRO-483)", async () => {
      // Arrange
      const input = {
        rule: [
          "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2",
          "RDATE:2026-05-14T09:00:00+09:00",
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

      // Assert — 09:00 +09:00 == 00:00Z same day.
      expect(occurrences.map((occurrence) => occurrence.startsAt)).toEqual([
        "2026-05-04T16:00:00.000Z",
        "2026-05-11T16:00:00.000Z",
        "2026-05-14T00:00:00.000Z",
      ]);
    });
  },
);
