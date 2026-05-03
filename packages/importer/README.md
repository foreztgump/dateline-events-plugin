# @dateline/importer

Sandboxed EmDash plugin that imports events into Dateline from iCalendar (.ics) feeds and files. Parses iCal data using `ical-generator`, maps events to the `@dateline/core` entry schema, and deduplicates by UID on re-import. Designed to run within the Cloudflare Workers 50ms CPU budget by streaming and chunking large feeds via `ctx.waitUntil`.
