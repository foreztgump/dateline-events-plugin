import { importCsv, importICal, importJson, importTec } from "@dateline/importer/routes";
import { createImporterContentContext } from "../../lib/importer-content.js";

type ImportFormat = "ical" | "csv" | "json" | "tec";
type ImportRoute = (input: { request: Request; ctx: Awaited<ReturnType<typeof createImporterContentContext>> }) => Promise<Response>;

const ROUTES: Record<ImportFormat, ImportRoute> = {
  ical: importICal,
  csv: importCsv,
  json: importJson,
  tec: importTec,
};

const HTTP_BAD_REQUEST = 400;

/**
 * Endpoint choice: a same-origin `/api/import` proxy is the documented importer
 * invocation for the reference site (mirrors the `/api/rsvp` pattern). It runs
 * the live `@dateline/importer` route handlers in-process against the EmDash
 * content store, so imported events land in `dateline_events` and appear on
 * `/events`. The sandboxed plugin's admin routes require an authenticated CMS
 * session; this proxy is the unauthenticated path validators use for A-M3-10.
 *
 * Usage: POST a feed with a `format` query param (default `ical`) and the feed
 * body keyed by format (`ics`/`ical`, `csv`, `json`/`events`, `tec`/`json`), or
 * a raw text/calendar body. Example:
 *   curl -X POST 'http://127.0.0.1:4321/api/import?format=ical' \
 *     -H 'content-type: text/calendar' --data-binary @seed/sample-import.ics
 */
export async function POST({ request }: { request: Request }): Promise<Response> {
  const format = importFormat(request);
  if (!format) return Response.json({ error: "Unsupported import format. Use ?format=ical|csv|json|tec." }, { status: HTTP_BAD_REQUEST });
  const ctx = await createImporterContentContext();
  return ROUTES[format]({ request, ctx });
}

function importFormat(request: Request): ImportFormat | undefined {
  const requested = new URL(request.url).searchParams.get("format") ?? "ical";
  return isImportFormat(requested) ? requested : undefined;
}

function isImportFormat(value: string): value is ImportFormat {
  return value === "ical" || value === "csv" || value === "json" || value === "tec";
}
