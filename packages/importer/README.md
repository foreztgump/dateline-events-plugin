# @dateline/importer

Sandboxed EmDash plugin that imports events into Dateline from external sources: iCalendar (.ics) feeds, CSV, JSON, and The Events Calendar (TEC) exports. Remote feed bodies are fetched through `ctx.http.fetch`, parsed, mapped to the `@dateline/core` schema, and deduplicated by UID.

## Install

```bash
pnpm add @dateline/importer @dateline/core emdash@^0.18.0
```

## Peer dependencies

- `emdash@^0.18.0` - EmDash CMS runtime
- `@dateline/core` - event schemas and collection definitions

## Capabilities required

This sandboxed plugin declares these capabilities:

- `content:read` - check for existing events during deduplication
- `content:write` - create and update imported events
- `network:request:unrestricted` - fetch operator-entered feed URLs through `ctx.http.fetch`

`allowedHosts` is intentionally `[]`. Feed URLs are typed by site operators at import time, so the complete host list is not enumerable during plugin installation. This trades a broader consent prompt for real remote-feed support. Installers should grant the capability only to operators who are allowed to import external calendars and migration feeds.

## Sandboxed?

✅ Yes. Runs in Cloudflare Workers Dynamic Worker sandbox (Paid plan required).

**Budget:** 50ms CPU + 10 subrequests per invocation. Remote-feed imports fetch at most 10 URLs per invocation and report the remaining URLs as deferred work for a later scheduled import pass.

**Local runner note:** `@emdash-cms/sandbox-workerd@0.1.6` still checks the deprecated internal capability name `network:fetch:any` for outbound fetches and blocks private IP and `127.0.0.1` URLs as an SSRF guard. This package still ships the current manifest capability, `network:request:unrestricted`. Local tests mock `ctx.http.fetch` instead of using localhost listeners; M3 end-to-end tests should not expect private-IP fetches to work in the local sandbox runner.

## Usage

```ts
import importer from "@dateline/importer/sandbox";

// Access utilities for programmatic imports
import { parseCsv, parseICal, importRows } from "@dateline/importer";
```

### Routes

Importer exposes these routes at `/_emdash/api/plugins/dateline-importer/{route}`:

- `admin/import/tec` - Block Kit UI to paste a The Events Calendar export
- `admin/import/ical` - Block Kit UI to fetch an iCal URL or paste .ics content
- `admin/import/csv` - Block Kit UI to fetch or paste CSV data with custom field mapping
- `admin/import/json` - Block Kit UI to fetch or paste raw JSON event objects
- `admin/import/settings` - Block Kit settings for scheduled importer configuration

### Collections

Importer does not define new collections; it creates entries in `dateline_events` (managed by core).

## Key gotchas

**Remote URLs:** Remote iCal, CSV, JSON, and TEC routes accept `{ "url": "https://..." }`; JSON imports also accept `{ "urls": ["https://...", "..."] }` and process only the first 10 URLs in the current invocation.

**UID deduplication:** Imported events are matched to existing events by their `uid` (from the source feed). Re-importing the same feed will update existing events rather than create duplicates.

**Partial imports:** If 50 events are imported and 5 fail to parse, the importer reports the success count, failed count, and error summary. Successful events are still created.

**CSV field mapping:** CSV imports require a header row and explicit column-to-field mapping (e.g., "Column 1 → title", "Column 2 → startsAt"). The mapping UI is interactive.

**The Events Calendar migrator:** `migrateTecExport()` is a specialized importer for TEC's XML export format. It handles TEC-specific data like organizers, custom taxonomies, and ticket prices (when tickets are installed).

## See also

- [Root README](../../README.md) - architecture overview
- [Capabilities & security](/docs/capabilities-and-security.md) - EmDash capability model and network access
- [Plugin development](/docs/plugin-development.md) - async patterns and testing
