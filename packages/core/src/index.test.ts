import { describe, expect, it, vi } from "vitest";
import { validateBlocks } from "@dateline/blocks";
import createCorePlugin, {
  adminHandlers,
  afterSave,
  beforeDelete,
  beforeSave,
  calendarFeed,
  collections,
  eventToJsonLd,
  iCalFeed,
  privacyErase,
  privacyExport,
} from "./index.js";
import type { DatelineEvent } from "./index.js";
import { invalidateEventCaches } from "./cache.js";

const eventFixture: DatelineEvent = {
  id: "evt_1",
  title: "Dateline Launch",
  description: [],
  status: "published",
  startsAt: "2026-03-08T09:00:00-08:00",
  endsAt: "2026-03-08T11:00:00-08:00",
  timezone: "America/Los_Angeles",
  allDay: false,
  locationType: "physical",
  organizers: ["org_1"],
  categories: ["launch"],
  recurrenceRule: "FREQ=WEEKLY;COUNT=2",
  x402Price: { amount: 500, currency: "USD" },
};

describe("core plugin manifest", () => {
  it("declares the Dateline core sandbox manifest", () => {
    const manifest = createCorePlugin();

    expect(manifest.id).toBe("dateline-core");
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.capabilities).toEqual(["content:read", "content:write", "media:read"]);
    expect(Object.keys(manifest.hooks)).toContain("content:beforeSave");
    expect(manifest.routes).toEqual(expect.arrayContaining(["privacy/export", "privacy/erase"]));
  });
});

describe("core collection schemas", () => {
  it("exports events, venues, and organizers with the 34 MVP event fields", () => {
    const eventFieldNames = collections.dateline_events.fields.map((field) => field.name);

    expect(collections.dateline_events.slug).toBe("dateline_events");
    expect(collections.dateline_venues.slug).toBe("dateline_venues");
    expect(collections.dateline_organizers.slug).toBe("dateline_organizers");
    expect(eventFieldNames).toHaveLength(34);
    expect(eventFieldNames).toEqual(expect.arrayContaining(["startsAt", "endsAt", "timezone", "recurrenceRule", "x402Price"]));
  });
});

describe("content hooks", () => {
  it("normalizes valid event times to UTC and validates RRULE values", () => {
    const event = { collection: "dateline_events", content: { ...eventFixture } };

    beforeSave(event);

    expect(event.content.startsAt).toBe("2026-03-08T17:00:00.000Z");
    expect(event.content.endsAt).toBe("2026-03-08T19:00:00.000Z");
  });

  it("rejects invalid timezone and end-before-start values", () => {
    expect(() => beforeSave({ collection: "dateline_events", content: { ...eventFixture, timezone: "NotATimezone" } }))
      .toThrow("INVALID_TIMEZONE");
    expect(() => beforeSave({ collection: "dateline_events", content: { ...eventFixture, endsAt: "2026-03-08T08:00:00-08:00" } }))
      .toThrow("END_BEFORE_START");
  });

  it("blocks deleting events with attendees", async () => {
    const ctx = { content: { list: vi.fn().mockResolvedValue({ items: [{ id: "att_1" }] }) } };

    await expect(beforeDelete({ collection: "dateline_events", id: "evt_1" }, ctx)).rejects.toThrow("ATTENDEES_EXIST");
  });

  it("uses ctx.waitUntil for event cache invalidation", () => {
    const promiseSink = vi.fn();
    const ctx = { waitUntil: promiseSink, kv: { delete: vi.fn().mockResolvedValue(undefined) } };

    afterSave({ collection: "dateline_events", content: { id: "evt_1" } }, ctx);

    expect(promiseSink).toHaveBeenCalledWith(expect.any(Promise));
  });
});

describe("routes", () => {
  it("returns an iCal feed with TZID and RRULE", async () => {
    const response = await iCalFeed({
      request: new Request("https://example.com/ical-feed?range=2026-03-01..2026-03-31"),
      ctx: listContext([eventFixture]),
    });
    const body = await response.text();

    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("DTSTART;TZID=America/Los_Angeles");
    expect(body).toContain("RRULE:FREQ=WEEKLY;COUNT=2");
  });

  it("returns a range-filterable calendar JSON feed", async () => {
    const response = await calendarFeed({
      request: new Request("https://example.com/calendar-feed?range=2026-03-01..2026-03-31"),
      ctx: listContext([eventFixture]),
    });

    await expect(response.json()).resolves.toMatchObject({ events: [expect.objectContaining({ id: "evt_1" })] });
  });

  it("renders valid Block Kit admin pages", () => {
    const pages = ["events", "venues", "organizers", "settings"] as const;

    for (const page of pages) expect(validateBlocks(adminHandlers[page]().blocks).valid).toBe(true);
  });

  it("exports and erases privacy data by email", async () => {
    const ctx = privacyContext();

    await expect(privacyExport({ request: new Request("https://example.com/privacy/export?email=a@example.com"), ctx }).then((res) => res.json()))
      .resolves.toMatchObject({ ok: true, email: "a@example.com" });
    await expect(privacyErase({ request: new Request("https://example.com/privacy/erase?email=a@example.com"), ctx }).then((res) => res.json()))
      .resolves.toMatchObject({ ok: true, erasedAttendees: 1 });
  });
});

describe("schema.org helper", () => {
  it("emits Event JSON-LD with Place, Organization, and Offer", () => {
    const jsonLd = eventToJsonLd(eventFixture, {
      name: "Launch Hall",
      address: { street: "1 Main", city: "SF", state: "CA", zip: "94105", country: "US" },
    }, [{ name: "Dateline" }]);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      location: { "@type": "Place" },
      organizer: [{ "@type": "Organization", name: "Dateline" }],
      offers: { "@type": "Offer", price: "5.00", priceCurrency: "USD" },
    });
  });
});

describe("privacy field selection (PRO-478)", () => {
  it("filters events by contactEmail and attendees by email", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "att_1", email: "a@example.com" }] })
      .mockResolvedValueOnce({ items: [{ id: "evt_1", contactEmail: "a@example.com" }] });
    const ctx = { content: { list } };

    await privacyExport({ request: new Request("https://example.com/privacy/export?email=a@example.com"), ctx });

    expect(list).toHaveBeenNthCalledWith(1, "dateline_attendees", { filter: { email: "a@example.com" } });
    expect(list).toHaveBeenNthCalledWith(2, "dateline_events", { filter: { contactEmail: "a@example.com" } });
  });

  it("uses contactEmail filter for events on erase as well", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });
    const ctx = {
      content: {
        list,
        delete: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      },
    };

    await privacyErase({ request: new Request("https://example.com/privacy/erase?email=b@example.com"), ctx });

    expect(list.mock.calls[1]).toEqual(["dateline_events", { filter: { contactEmail: "b@example.com" } }]);
  });
});

describe("cache invalidation via inverted index (PRO-480)", () => {
  it("filters range-keyed iCal output and indexes only rendered events (PRO-492)", async () => {
    const janEvent = { ...eventFixture, id: "evt_jan", title: "January Event", startsAt: "2026-01-15T10:00:00Z", endsAt: "2026-01-15T11:00:00Z", recurrenceRule: undefined };
    const futureEvent = { ...eventFixture, id: "evt_future", title: "Future Event", startsAt: "2027-06-01T10:00:00Z", endsAt: "2027-06-01T11:00:00Z", recurrenceRule: undefined };
    const ctx = kvBackedContext([janEvent, futureEvent]);
    const response = await iCalFeed({ request: new Request("https://example.com/ical-feed?range=2026-01-01..2026-01-31"), ctx });
    const body = await response.text();

    expect(body).toContain("UID:evt_jan@dateline");
    expect(body).toContain("SUMMARY:January Event");
    expect(body).not.toContain("UID:evt_future@dateline");
    expect(body).not.toContain("SUMMARY:Future Event");
    expect(await ctx.kv.get("event-cache-index:ical:evt_jan")).toBe("[\"ical-feed:2026-01-01..2026-01-31\"]");
    expect(await ctx.kv.get("event-cache-index:ical:evt_future")).toBeNull();
  });

  it("returns both iCal events when no range is provided (PRO-492)", async () => {
    const janEvent = { ...eventFixture, id: "evt_jan", title: "January Event", startsAt: "2026-01-15T10:00:00Z", endsAt: "2026-01-15T11:00:00Z", recurrenceRule: undefined };
    const futureEvent = { ...eventFixture, id: "evt_future", title: "Future Event", startsAt: "2027-06-01T10:00:00Z", endsAt: "2027-06-01T11:00:00Z", recurrenceRule: undefined };

    const response = await iCalFeed({ request: new Request("https://example.com/ical-feed"), ctx: listContext([janEvent, futureEvent]) });
    const body = await response.text();

    expect(body).toContain("UID:evt_jan@dateline");
    expect(body).toContain("UID:evt_future@dateline");
  });

  it("invalidates a cached calendar feed entry after a matching event is saved", async () => {
    const ctx = kvBackedContext([eventFixture]);
    const request = new Request("https://example.com/calendar-feed?range=2026-03-01..2026-03-31");

    await calendarFeed({ request, ctx });

    const cacheKey = "dateline_events:calendar:2026-03-01..2026-03-31";
    expect(await ctx.kv.get(cacheKey)).not.toBeNull();

    await invalidateEventCaches(ctx, "evt_1");

    expect(await ctx.kv.get(cacheKey)).toBeNull();
  });

  it("invalidates a cached iCal feed entry after a matching event is saved", async () => {
    const ctx = kvBackedContext([eventFixture]);
    const request = new Request("https://example.com/ical?range=2026-03-01..2026-03-31");

    await iCalFeed({ request, ctx });

    const cacheKey = "ical-feed:2026-03-01..2026-03-31";
    expect(await ctx.kv.get(cacheKey)).not.toBeNull();

    await invalidateEventCaches(ctx, "evt_1");

    expect(await ctx.kv.get(cacheKey)).toBeNull();
  });
});

describe("recurring occurrence range filtering (PRO-481)", () => {
  it("matches a week-4 occurrence whose end is derived from the per-occurrence duration", async () => {
    // Weekly 2-hour event starting Monday 2026-03-02 10:00 America/Los_Angeles.
    // Series ends on the first occurrence (10:00–12:00 PT). Week-4 occurrence is 2026-03-23 10:00–12:00 PT.
    const recurringEvent: DatelineEvent = {
      ...eventFixture,
      id: "evt_recurring",
      startsAt: "2026-03-02T10:00:00-08:00",
      endsAt: "2026-03-02T12:00:00-08:00",
      timezone: "America/Los_Angeles",
      recurrenceRule: "FREQ=WEEKLY;COUNT=6",
    };
    const week4Range = "2026-03-23..2026-03-23";

    const response = await calendarFeed({
      request: new Request(`https://example.com/calendar-feed?range=${week4Range}`),
      ctx: listContext([recurringEvent]),
    });

    await expect(response.json()).resolves.toMatchObject({
      events: [expect.objectContaining({ id: "evt_recurring" })],
    });
  });

  it("treats negative recurrence duration as zero for range matching (PRO-492)", async () => {
    const invertedDurationEvent: DatelineEvent = {
      ...eventFixture,
      id: "evt_inverted_duration",
      startsAt: "2026-03-02T10:00:00-08:00",
      endsAt: "2026-03-01T10:00:00-08:00",
      timezone: "America/Los_Angeles",
      recurrenceRule: "FREQ=WEEKLY;COUNT=2",
    };

    const response = await calendarFeed({
      request: new Request("https://example.com/calendar-feed?range=2026-03-09..2026-03-09"),
      ctx: listContext([invertedDurationEvent]),
    });

    await expect(response.json()).resolves.toMatchObject({
      events: [expect.objectContaining({ id: "evt_inverted_duration" })],
    });
  });
});

function kvBackedContext(events: unknown[]) {
  const store = new Map<string, string>();
  return {
    content: { list: vi.fn().mockResolvedValue({ items: events }) },
    kv: {
      get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      put: vi.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      delete: vi.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
    },
  };
}

function listContext(events: unknown[]) {
  return {
    kv: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) },
    content: { list: vi.fn().mockResolvedValue({ items: events }) },
  };
}

function privacyContext() {
  return {
    content: {
      list: vi.fn()
        .mockResolvedValueOnce({ items: [{ id: "att_1", email: "a@example.com" }] })
        .mockResolvedValueOnce({ items: [{ id: "evt_1", contactEmail: "a@example.com" }] })
        .mockResolvedValueOnce({ items: [{ id: "att_1", email: "a@example.com" }] })
        .mockResolvedValueOnce({ items: [{ id: "evt_1", contactEmail: "a@example.com" }] }),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
}
