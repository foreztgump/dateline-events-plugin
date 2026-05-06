---
"@dateline/views": patch
---

Sanitize external `href` values via `safeHref()` in OrganizerCard, OrganizerCardHeadless, VenueMap, and VenueMapHeadless to block `javascript:` / `data:` / `vbscript:` XSS through CMS-controlled organizer/venue website fields, and pass `event.timezone` (defaulting to `UTC`) into `Intl.DateTimeFormat` in `formatEventTimeRange` / `formatEventDateTime` so rendered times reflect the event timezone instead of the host. Invalid CMS-stored timezone strings now fall back to `UTC` instead of crashing view rendering. [PRO-482, PRO-479, PRO-493]
