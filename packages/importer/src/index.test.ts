import { validateBlocks } from "@dateline/blocks";
import { describe, expect, it, vi } from "vitest";
import createImporterPlugin, {
  adminHandlers,
  importRows,
  parseCsv,
  parseICal,
  parseJsonEvents,
  migrateTecExport,
} from "./index.js";
import type { ImportRow } from "./index.js";

describe("@dateline/importer", () => {
  it("declares the sandbox manifest and whitelist settings", () => {
    const manifest = createImporterPlugin();

    expect(manifest.id).toBe("dateline-importer");
    expect(manifest.capabilities).toEqual(["content:read", "content:write", "network:request"]);
    expect(manifest.capabilities).not.toContain("network:request:unrestricted");
    expect(manifest.storage.settings.allowedHosts).toEqual([]);
    expect(manifest.routes).toEqual(expect.arrayContaining(["admin/import/tec", "admin/import/ical", "admin/import/csv", "admin/import/json"]));
  });

  it("renders valid Block Kit admin import pages with field mapping controls", () => {
    const pages = ["settings", "tec", "ical", "csv", "json"] as const;

    for (const page of pages) expect(validateBlocks(adminHandlers[page]().blocks).valid).toBe(true);
    expect(JSON.stringify(adminHandlers.csv().blocks)).toContain("CSV field mapping");
  });

  it("migrates a 50-event TEC export into Dateline rows", () => {
    const migration = migrateTecExport(createTecExportFixture(50));

    expect(migration.errors).toEqual([]);
    expect(migration.rows).toHaveLength(50);
    expect(migration.rows[0]?.event).toMatchObject({
      title: "TEC Event 1",
      timezone: "America/Los_Angeles",
      recurrenceRule: "FREQ=WEEKLY;COUNT=4",
      venue: "tec-venue-1",
      organizers: ["tec-organizer-1"],
      categories: ["conference"],
      tags: ["migration"],
    });
    expect(migration.venues).toHaveLength(1);
    expect(migration.organizers).toHaveLength(1);
  });

  it("parses recurring iCalendar VEVENT data with TZID, RRULE, and EXDATE", () => {
    const importedEvents = parseICal(icsFixture());

    expect(importedEvents.rows).toHaveLength(1);
    expect(importedEvents.rows[0]?.event).toMatchObject({
      title: "Dateline Launch",
      startsAt: "2026-03-08T16:00:00.000Z",
      endsAt: "2026-03-08T17:00:00.000Z",
      timezone: "America/Los_Angeles",
      recurrenceRule: "FREQ=WEEKLY;COUNT=3",
      recurrenceExceptions: ["2026-03-15T16:00:00.000Z"],
    });
  });

  it("keeps valid iCalendar rows when another VEVENT is malformed", () => {
    const importedEvents = parseICal(icsFixtureWithMalformedEvent());

    expect(importedEvents.rows).toHaveLength(1);
    expect(importedEvents.errors).toEqual([{ row: 2, sourceId: "ical:broken@example.com", message: "Error: VEVENT missing dtstart." }]);
  });

  it("parses CSV rows through explicit mapping and keeps row errors partial", () => {
    const parsedCsv = parseCsv("title,start,end,timezone,location\nLaunch,2026-05-01T17:00:00Z,2026-05-01T18:00:00Z,UTC,Online\nBroken,,2026-05-01T18:00:00Z,UTC,Online", {
      title: "title",
      startsAt: "start",
      endsAt: "end",
      timezone: "timezone",
      location: "location",
    });

    expect(parsedCsv.rows).toHaveLength(1);
    expect(parsedCsv.errors).toEqual([{ row: 3, sourceId: "csv:3", message: "Missing required field startsAt." }]);
  });

  it("parses JSON arrays into import rows", () => {
    const parsedJson = parseJsonEvents(JSON.stringify([{ sourceId: "json:1", title: "JSON Event", startsAt: "2026-06-01T17:00:00Z", endsAt: "2026-06-01T18:00:00Z", timezone: "UTC" }]));

    expect(parsedJson.rows[0]?.event).toMatchObject({ title: "JSON Event", sourceId: "json:1" });
  });

  it("skips already imported source IDs on re-import", async () => {
    const row: ImportRow = {
      sourceId: "ical:launch",
      event: eventDraft("ical:launch", "Launch"),
    };
    const ctx = contentContext();

    await expect(importRows([row], ctx)).resolves.toMatchObject({ created: 1, skipped: 0, errors: [] });
    await expect(importRows([row], ctx)).resolves.toMatchObject({ created: 0, skipped: 1, errors: [] });
    expect(ctx.content.create).toHaveBeenCalledTimes(1);
  });
});

function createTecExportFixture(count: number) {
  return {
    venues: [{ sourceId: "tec-venue-1", name: "Migration Hall" }],
    organizers: [{ sourceId: "tec-organizer-1", name: "Dateline Team" }],
    events: Array.from({ length: count }, (_, index) => ({
      sourceId: `tec-event-${index + 1}`,
      title: `TEC Event ${index + 1}`,
      description: "Migrated from TEC.",
      start: `2026-05-${String((index % 28) + 1).padStart(2, "0")}T17:00:00Z`,
      end: `2026-05-${String((index % 28) + 1).padStart(2, "0")}T18:00:00Z`,
      timezone: "America/Los_Angeles",
      allDay: false,
      recurrence: index === 0 ? "FREQ=WEEKLY;COUNT=4" : undefined,
      venueId: "tec-venue-1",
      organizerIds: ["tec-organizer-1"],
      categories: ["conference"],
      tags: ["migration"],
      customFields: { legacyKey: "legacy value" },
    })),
  };
}

function icsFixture(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:launch@example.com",
    "SUMMARY:Dateline Launch",
    "DTSTART;TZID=America/Los_Angeles:20260308T090000",
    "DTEND;TZID=America/Los_Angeles:20260308T100000",
    "RRULE:FREQ=WEEKLY;COUNT=3",
    "EXDATE;TZID=America/Los_Angeles:20260315T090000",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function icsFixtureWithMalformedEvent(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:launch@example.com",
    "SUMMARY:Dateline Launch",
    "DTSTART:20260501T170000Z",
    "DTEND:20260501T180000Z",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:broken@example.com",
    "SUMMARY:Broken Event",
    "DTEND:20260502T180000Z",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function eventDraft(sourceId: string, title: string) {
  return {
    sourceId,
    title,
    startsAt: "2026-05-01T17:00:00.000Z",
    endsAt: "2026-05-01T18:00:00.000Z",
    timezone: "UTC",
    status: "published",
    allDay: false,
    locationType: "physical" as const,
    organizers: [],
    categories: [],
    tags: [],
  };
}

function contentContext() {
  const createdSourceIds = new Set<string>();
  return {
    content: {
      list: vi.fn((_collection: string, options?: unknown) => {
        const sourceId = (options as { filter?: { sourceId?: string } } | undefined)?.filter?.sourceId;
        return Promise.resolve({ items: sourceId && createdSourceIds.has(sourceId) ? [{ id: "existing", sourceId }] : [] });
      }),
      create: vi.fn((_collection: string, value: unknown) => {
        createdSourceIds.add((value as { sourceId: string }).sourceId);
        return Promise.resolve({ id: "created" });
      }),
    },
  };
}
