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
    const response = await iCalFeed({ ctx: listContext([eventFixture]) });
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
