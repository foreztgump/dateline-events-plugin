import { JSON_HEADERS } from "./constants.js";
import { parseCsv } from "./csv.js";
import { parseICal } from "./ical.js";
import { importRows } from "./importer.js";
import { parseJsonEvents } from "./json.js";
import { migrateTecExport } from "./tec.js";
import type { CsvFieldMapping, RouteInput } from "./types.js";

export async function importTec(input: RouteInput): Promise<Response> {
  try {
    const body = await readJson(input.request);
    const migration = migrateTecExport(body);
    return jsonResponse(await importRows(migration.rows, input.ctx));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importICal(input: RouteInput): Promise<Response> {
  try {
    const icsText = await readText(input.request);
    const parsedCalendar = parseICal(icsText);
    return jsonResponse(await importRows(parsedCalendar.rows, input.ctx));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importCsv(input: RouteInput): Promise<Response> {
  try {
    const requestBody = await readJson(input.request) as { csv: string; mapping: CsvFieldMapping };
    const parsedCsv = parseCsv(requestBody.csv, requestBody.mapping);
    return jsonResponse(await importRows(parsedCsv.rows, input.ctx));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importJson(input: RouteInput): Promise<Response> {
  try {
    const jsonText = await readText(input.request);
    const parsedEvents = parseJsonEvents(jsonText);
    return jsonResponse(await importRows(parsedEvents.rows, input.ctx));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

async function readText(request?: Request): Promise<string> {
  if (!request) return "";
  return request.text();
}

async function readJson(request?: Request): Promise<unknown> {
  if (!request) return {};
  return request.json();
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}

function routeError(error: unknown) {
  return { row: 1, sourceId: "route:request", message: String(error) };
}
