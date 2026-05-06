---
"@dateline/core": patch
---

Three v0.1.1 patch fixes:

- PRO-480: invalidate cached calendar/iCal feeds via an inverted `event-cache-index:<kind>:<eventId>` map so range-keyed entries containing a mutated event are evicted on save.
- PRO-478: `privacyExport`/`privacyErase` now filter events by `contactEmail` (was: `email`), matching the GDPR-relevant field on `dateline_events`.
- PRO-481: recurring-event range filter derives each occurrence's end from the event's duration (`occurrence.startsAt + (event.endsAt - event.startsAt)`) instead of reusing the original series end for every occurrence.
