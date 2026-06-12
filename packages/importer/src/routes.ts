import { JSON_HEADERS } from "./constants.js";
import { parseCsv } from "./csv.js";
import { csvMapping } from "./csv-mapping.js";
import { parseICal } from "./ical.js";
import { importRows, mergeParseResults } from "./importer.js";
import { parseJsonEvents } from "./json.js";
import { loadFeedTexts } from "./remote.js";
import { migrateTecExport } from "./tec.js";
import type { ImportParseResult, ImportSummary, RouteInput } from "./types.js";

export async function importTec(input: RouteInput): Promise<Response> {
  try {
    const feeds = await loadFeedTexts({ request: input.request, ctx: input.ctx, bodyKeys: ["tec", "json"], format: "tec" });
    const parsedFeeds = feeds.texts.map((feedText) => migrateTecExport(JSON.parse(feedText)));
    return jsonResponse(await importParsed(mergeParseResults(parsedFeeds), input, feeds.errors));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importICal(input: RouteInput): Promise<Response> {
  try {
    const feeds = await loadFeedTexts({ request: input.request, ctx: input.ctx, bodyKeys: ["ics", "ical"], format: "ical" });
    const parsedCalendar = mergeParseResults(feeds.texts.map((feedText) => parseICal(feedText)));
    return jsonResponse(await importParsed(parsedCalendar, input, feeds.errors));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importCsv(input: RouteInput): Promise<Response> {
  try {
    const feeds = await loadFeedTexts({ request: input.request, ctx: input.ctx, bodyKeys: ["csv"], format: "csv" });
    const mapping = csvMapping(feeds.payload);
    const parsedCsv = mergeParseResults(feeds.texts.map((feedText) => parseCsv(feedText, mapping)));
    return jsonResponse(await importParsed(parsedCsv, input, feeds.errors));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

export async function importJson(input: RouteInput): Promise<Response> {
  try {
    const feeds = await loadFeedTexts({ request: input.request, ctx: input.ctx, bodyKeys: ["json", "events"], format: "json" });
    const parsedEvents = mergeParseResults(feeds.texts.map((feedText) => parseJsonEvents(feedText)));
    return jsonResponse(await importParsed(parsedEvents, input, feeds.errors));
  } catch (error) {
    return jsonResponse({ created: 0, skipped: 0, errors: [routeError(error)] });
  }
}

async function importParsed(parsedFeed: ImportParseResult, input: RouteInput, priorErrors: ImportSummary["errors"]): Promise<ImportSummary> {
  const summary = await importRows(parsedFeed.rows, input.ctx);
  return { ...summary, errors: [...priorErrors, ...parsedFeed.errors, ...summary.errors] };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: JSON_HEADERS });
}

function routeError(error: unknown) {
  return { row: 1, sourceId: "route:request", message: String(error) };
}
