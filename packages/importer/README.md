# @dateline/importer

Sandboxed EmDash plugin that imports events into Dateline from external sources: iCalendar (.ics) feeds, CSV, JSON, and The Events Calendar (TEC) exports. Parses data, maps to the `@dateline/core` schema, and deduplicates by UID. Processes large imports asynchronously via `ctx.waitUntil()` to stay within the 50ms CPU budget.

## Install

```bash
pnpm add @dateline/importer @dateline/core emdash@^0.9.0
```

## Peer dependencies

- `emdash@^0.9.0` — EmDash CMS runtime
- `@dateline/core` — event schemas and collection definitions

## Capabilities required

This sandboxed plugin declares these capabilities:

- `content:read` — check for existing events during deduplication
- `content:write` — create and update imported events
- `network:request` — fetch iCal feeds and external sources (see `allowedHosts` below)

## Sandboxed?

✅ Yes. Runs in Cloudflare Workers Dynamic Worker sandbox (Paid plan required).

**Budget:** 50ms CPU + 10 subrequests per invocation. Large imports are chunked and processed in the background via `ctx.waitUntil()` so the admin UI returns immediately with a job status.

## Usage

```ts
import createImporterPlugin from "@dateline/importer";

export default {
  plugins: [createImporterPlugin()],
};

// Access utilities for programmatic imports
import { parseCsv, parseICal, importRows } from "@dateline/importer";
```

### Routes

Importer exposes these routes at `/_emdash/api/plugins/dateline-importer/{route}`:

- `admin/import/tec` — Block Kit UI to paste a The Events Calendar export
- `admin/import/ical` — Block Kit UI to fetch an iCal URL or paste .ics content
- `admin/import/csv` — Block Kit UI to upload a CSV file with custom field mapping
- `admin/import/json` — Block Kit UI for raw JSON event objects
- `admin/import/settings` — Block Kit settings to configure whitelisted iCal URLs

### Collections

Importer does not define new collections; it creates entries in `dateline_events` (managed by core).

## Key gotchas

**`allowedHosts` whitelist:** External iCal URLs are whitelisted via the plugin's `allowedHosts` setting. Events can be imported only from approved hosts. This prevents plugins from blindly fetching arbitrary URLs.

Configure via the plugin settings:

```jsonc
{
  "dateline-importer": {
    "allowedHosts": [
      "calendar.google.com",
      "outlook.calendar.microsoft.com",
      "ical.example.com"
    ]
  }
}
```

**UID deduplication:** Imported events are matched to existing events by their `uid` (from the source feed). Re-importing the same feed will update existing events rather than create duplicates.

**Partial imports:** If 50 events are imported and 5 fail to parse, the importer reports the success count, failed count, and error summary. Successful events are still created.

**CSV field mapping:** CSV imports require a header row and explicit column-to-field mapping (e.g., "Column 1 → title", "Column 2 → startsAt"). The mapping UI is interactive.

**The Events Calendar migrator:** `migrateTecExport()` is a specialized importer for TEC's XML export format. It handles TEC-specific data like organizers, custom taxonomies, and ticket prices (when tickets are installed).

## See also

- [Root README](../../README.md) — architecture overview
- [Capabilities & security](/docs/capabilities-and-security.md) — EmDash capability model and network access
- [Plugin development](/docs/plugin-development.md) — async patterns and testing
