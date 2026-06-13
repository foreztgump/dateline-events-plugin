import { beforeEach, describe, expect, it, vi } from "vitest";

const { importICalMock, importJsonMock } = vi.hoisted(() => ({
  importICalMock: vi.fn<(input: { request: Request; ctx: unknown }) => Promise<Response>>(),
  importJsonMock: vi.fn<(input: { request: Request; ctx: unknown }) => Promise<Response>>(),
}));

vi.mock("@dateline/importer/routes", () => ({
  importICal: importICalMock,
  importJson: importJsonMock,
  importCsv: vi.fn(),
  importTec: vi.fn(),
}));

vi.mock("../../lib/importer-content.js", () => ({
  createImporterContentContext: () => Promise.resolve({ content: { list: vi.fn(), create: vi.fn() } }),
}));

import { POST } from "./import.js";

describe("reference importer API proxy", () => {
  beforeEach(() => {
    importICalMock.mockReset();
    importJsonMock.mockReset();
  });

  it("routes an iCal feed to the importICal handler and returns its summary", async () => {
    importICalMock.mockResolvedValue(Response.json({ created: 2, skipped: 0, errors: [] }));

    const response = await POST({ request: icalRequest("ical") });

    expect(importICalMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ created: 2, skipped: 0, errors: [] });
  });

  it("defaults to the iCal format when no format query param is given", async () => {
    importICalMock.mockResolvedValue(Response.json({ created: 1, skipped: 0, errors: [] }));

    await POST({ request: icalRequest() });

    expect(importICalMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsupported format without invoking any importer handler", async () => {
    const response = await POST({ request: icalRequest("xml") });

    expect(response.status).toBe(400);
    expect(importICalMock).not.toHaveBeenCalled();
    expect(importJsonMock).not.toHaveBeenCalled();
  });
});

function icalRequest(format?: string): Request {
  const url = format ? `http://127.0.0.1:4321/api/import?format=${format}` : "http://127.0.0.1:4321/api/import";
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "text/calendar" },
    body: "BEGIN:VCALENDAR\r\nEND:VCALENDAR",
  });
}
