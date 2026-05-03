# @dateline/recurring

Sandboxed EmDash plugin that extends Dateline events with RFC 5545 recurrence rules via `rrule.js`. Implements lazy occurrence materialization with a two-year forward cap, caches occurrence ranges in EmDash KV, and handles IANA timezone-aware DST transitions correctly. Recurrence data is stored on the parent event entry managed by `@dateline/core`.
