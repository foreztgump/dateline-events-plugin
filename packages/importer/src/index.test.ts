import { validateBlocks } from "@dateline/blocks";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  adminHandlers,
  cron,
  importCsv,
  importICal,
  importJson,
  importRows,
  importTec,
  parseCsv,
  parseICal,
  parseJsonEvents,
  migrateTecExport,
} from "./index.js";
import ICAL from "ical.js";
import plugin from "./plugin.js";
import { IMPORTER_CRON_NAME } from "./constants.js";
import type { ImportRow } from "./index.js";

const REMOTE_FETCH_TIMEOUT_MS = 25_000;

describe("@dateline/importer", () => {
  it("declares the sandbox manifest and whitelist settings", () => {
    const manifest = importerManifest();

    expect(manifest.capabilities).toEqual(["content:read", "content:write", "network:request:unrestricted"]);
    expect(manifest.allowedHosts).toEqual([]);
    expect(Object.keys(plugin.routes ?? {})).toEqual(expect.arrayContaining(["admin/import/tec", "admin/import/ical", "admin/import/csv", "admin/import/json"]));
    expect(manifest.storage.imports.indexes).toEqual(expect.arrayContaining(["kind", "status", "format", "createdAt"]));
    expect(manifest.admin.pages.map((page) => page.path)).toEqual(expect.arrayContaining([
      "/dateline/import/tec",
      "/dateline/import/ical",
      "/dateline/import/csv",
      "/dateline/import/json",
      "/dateline/import/settings",
    ]));
  });

  it("renders valid Block Kit admin import pages with field mapping controls", () => {
    const pages = ["settings", "tec", "ical", "csv", "json"] as const;

    for (const page of pages) expect(validateBlocks(adminHandlers[page]().blocks).valid).toBe(true);
    expect(JSON.stringify(adminHandlers.csv().blocks)).toContain("CSV field mapping");
    expect(JSON.stringify(adminHandlers.settings().blocks)).toContain("unrestricted network access");
    expect(JSON.stringify(adminHandlers.ical().blocks)).toContain("Import feeds now");
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

  it("keeps RRULE text when ical.js returns a plain string", () => {
    const getFirstPropertyValue = vi.spyOn(ICAL.Component.prototype, "getFirstPropertyValue");
    getFirstPropertyValue.mockImplementation(function getPlainStringRrule(this: ICAL.Component, propertyName?: string) {
      if (propertyName === "rrule") return "FREQ=DAILY;COUNT=2";
      return this.getFirstProperty(propertyName)?.getFirstValue() ?? null;
    });

    const importedEvents = parseICal(icsFixture());

    expect(importedEvents.rows[0]?.event.recurrenceRule).toBe("FREQ=DAILY;COUNT=2");
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

  it("fetches a remote iCalendar URL through ctx.http.fetch before parsing", async () => {
    const ctx = remoteImportContext([new Response(icsFixture(), { status: 200 })]);
    const request = jsonRequest({ url: "https://calendar.example.com/events.ics" });

    await expectResponseBody(importICal({ request, ctx }), { created: 1, skipped: 0, errors: [] });
    expect(ctx.http.fetch).toHaveBeenCalledWith("https://calendar.example.com/events.ics");
    expect(ctx.content.create).toHaveBeenCalledTimes(1);
  });

  it("returns an import error when a remote feed responds non-200", async () => {
    const ctx = remoteImportContext([new Response("unavailable", { status: 503, statusText: "Service Unavailable" })]);
    const request = jsonRequest({ url: "https://calendar.example.com/events.ics" });

    await expectResponseBody(importICal({ request, ctx }), {
      created: 0,
      skipped: 0,
      errors: [{ row: 1, sourceId: "remote:https://calendar.example.com/events.ics", message: "Error: Remote feed returned HTTP 503 Service Unavailable." }],
    });
    expect(ctx.content.create).not.toHaveBeenCalled();
  });

  it("returns an import error when a remote fetch rejects", async () => {
    const ctx = remoteImportContext([new Error("operation timed out")]);
    const request = jsonRequest({ url: "https://calendar.example.com/events.ics" });

    await expectResponseBody(importICal({ request, ctx }), {
      created: 0,
      skipped: 0,
      errors: [{ row: 1, sourceId: "remote:https://calendar.example.com/events.ics", message: "Error: Remote feed request failed: operation timed out" }],
    });
  });

  it("times out remote feed requests that never settle", async () => {
    vi.useFakeTimers();
    try {
      const ctx = remoteImportContext([new Promise<Response>(() => undefined)]);
      const request = jsonRequest({ url: "https://calendar.example.com/events.ics" });

      const responsePromise = importICal({ request, ctx });
      await vi.advanceTimersByTimeAsync(REMOTE_FETCH_TIMEOUT_MS);
      await expectResponseBody(responsePromise, {
        created: 0,
        skipped: 0,
        errors: [{ row: 1, sourceId: "remote:https://calendar.example.com/events.ics", message: "Error: Remote feed request failed: Remote feed request timed out after 25000ms." }],
      });
    } finally {
      vi.useRealTimers();
    }
  }, 1000);

  it("preserves empty remote feed bodies as parser errors", async () => {
    const ctx = remoteImportContext([new Response("", { status: 200 })]);
    const request = jsonRequest({ url: "https://calendar.example.com/events.ics" });

    await expectResponseBody(importICal({ request, ctx }), {
      created: 0,
      skipped: 0,
      errors: [{ row: 1, sourceId: "ical:document", message: "TypeError: Cannot read properties of undefined (reading 'length')" }],
    });
  });


  it("fetches at most ten remote JSON feeds per invocation", async () => {
    const remoteBodies = Array.from({ length: 11 }, (_value, index) => new Response(jsonFeedFixture(index + 1), { status: 200 }));
    const ctx = remoteImportContext(remoteBodies);
    const request = jsonRequest({ urls: Array.from({ length: 11 }, (_value, index) => `https://feeds.example.com/${index + 1}.json`) });

    await expectResponseBody(importJson({ request, ctx }), {
      created: 10,
      skipped: 0,
      errors: [{ row: 11, sourceId: "remote:budget", message: "Import deferred 1 remote feed because each invocation may issue at most 10 subrequests." }],
    });
    expect(ctx.http.fetch).toHaveBeenCalledTimes(10);
  });

  it("persists deferred remote feed URLs after the subrequest budget", async () => {
    const remoteBodies = Array.from({ length: 12 }, (_value, index) => new Response(jsonFeedFixture(index + 1), { status: 200 }));
    const ctx = remoteImportContext(remoteBodies);
    const request = jsonRequest({ urls: Array.from({ length: 12 }, (_value, index) => `https://feeds.example.com/${index + 1}.json`) });

    await expectResponseBody(importJson({ request, ctx }), {
      created: 10,
      skipped: 0,
      errors: [{ row: 11, sourceId: "remote:budget", message: "Import deferred 2 remote feeds because each invocation may issue at most 10 subrequests." }],
    });

    expect(readDeferredRecords(ctx.records).map((record) => record.url)).toEqual([
      "https://feeds.example.com/11.json",
      "https://feeds.example.com/12.json",
    ]);
  });

  it("drains persisted deferred importer jobs within the cron subrequest budget", async () => {
    const deferredRecords = Array.from({ length: 12 }, (_value, index) => deferredJsonRecord(index + 1));
    const remoteBodies = Array.from({ length: 10 }, (_value, index) => new Response(jsonFeedFixture(index + 1), { status: 200 }));
    const ctx = remoteImportContext(remoteBodies, deferredRecords);

    await cron({ name: IMPORTER_CRON_NAME }, ctx);

    expect(ctx.http.fetch).toHaveBeenCalledTimes(10);
    expect(ctx.content.create).toHaveBeenCalledTimes(10);
    expect(readDeferredRecords(ctx.records, "completed")).toHaveLength(10);
    expect(readDeferredRecords(ctx.records, "pending")).toHaveLength(2);
  });

  it("leaves an empty deferred queue as a cron no-op", async () => {
    const ctx = remoteImportContext([]);

    await cron({ name: IMPORTER_CRON_NAME }, ctx);

    expect(ctx.http.fetch).not.toHaveBeenCalled();
    expect(ctx.content.create).not.toHaveBeenCalled();
  });

  it("reuses remote feed fetching for CSV and TEC import routes", async () => {
    const csvContext = remoteImportContext([new Response("title,start,end,timezone\nCSV Launch,2026-05-01T17:00:00Z,2026-05-01T18:00:00Z,UTC", { status: 200 })]);
    const tecContext = remoteImportContext([new Response(JSON.stringify(createTecExportFixture(1)), { status: 200 })]);

    await expectResponseBody(importCsv({ request: jsonRequest({ url: "https://feeds.example.com/events.csv", mapping: csvMapping() }), ctx: csvContext }), { created: 1, skipped: 0, errors: [] });
    await expectResponseBody(importTec({ request: jsonRequest({ url: "https://feeds.example.com/events.json" }), ctx: tecContext }), { created: 1, skipped: 0, errors: [] });
    expect(csvContext.http.fetch).toHaveBeenCalledWith("https://feeds.example.com/events.csv");
    expect(tecContext.http.fetch).toHaveBeenCalledWith("https://feeds.example.com/events.json");
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

function importerManifest() {
  const manifestText = readFileSync(new URL("../emdash-plugin.jsonc", import.meta.url), "utf8");
  return JSON.parse(manifestText) as {
    capabilities: string[];
    allowedHosts?: string[];
    storage: { imports: { indexes: string[] } };
    admin: { pages: Array<{ path: string }> };
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

function jsonFeedFixture(index: number): string {
  return JSON.stringify([{ sourceId: `json:${index}`, title: `JSON Event ${index}`, startsAt: "2026-06-01T17:00:00Z", endsAt: "2026-06-01T18:00:00Z", timezone: "UTC" }]);
}

function csvMapping() {
  return {
    title: "title",
    startsAt: "start",
    endsAt: "end",
    timezone: "timezone",
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("https://dateline.example.com/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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

function remoteImportContext(remoteResponses: Array<Response | Error | Promise<Response>>, deferredRecords: Array<Record<string, unknown>> = []) {
  const ctx = contentContext();
  const records = new Map<string, { id: string; data: unknown }>(
    deferredRecords.map((record, index) => [`deferred:${index}`, { id: `deferred:${index}`, data: record }] as const),
  );
  return {
    ...ctx,
    records,
    storage: {
      imports: {
        get: vi.fn((id: string) => Promise.resolve(records.get(id)?.data ?? null)),
        put: vi.fn((id: string, data: unknown) => {
          records.set(id, { id, data });
          return Promise.resolve();
        }),
        query: vi.fn(() => Promise.resolve({ items: Array.from(records.values()) })),
        count: vi.fn(() => Promise.resolve(records.size)),
      },
    },
    http: {
      fetch: vi.fn((url: string) => {
        const response = remoteResponses.shift();
        if (!response) return Promise.reject(new Error(`No fixture response for ${url}.`));
        if (response instanceof Error) return Promise.reject(response);
        return Promise.resolve(response);
      }),
    },
  };
}

function deferredJsonRecord(index: number): Record<string, unknown> {
  return {
    kind: "deferredRemoteFeed",
    status: "pending",
    format: "json",
    url: `https://feeds.example.com/${index}.json`,
    payload: {},
    createdAt: new Date(index).toISOString(),
  };
}

function readDeferredRecords(records: Map<string, { id: string; data: unknown }>, status?: string): Array<Record<string, unknown>> {
  return Array.from(records.values())
    .map((entry) => entry.data)
    .filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null && "kind" in value && value.kind === "deferredRemoteFeed")
    .filter((record) => status === undefined || record.status === status);
}

async function expectResponseBody(responsePromise: Promise<Response>, expectedBody: unknown): Promise<void> {
  const response = await responsePromise;
  await expect(response.json()).resolves.toEqual(expectedBody);
}
