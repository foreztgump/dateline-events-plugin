---
"@dateline/core": patch
---

Four v0.1.1 patch fixes:

- PRO-480: invalidate cached calendar/iCal feeds via an inverted `event-cache-index:<kind>:<eventId>` map so range-keyed entries containing a mutated event are evicted on save.
- PRO-478: `privacyExport`/`privacyErase` now filter events by `contactEmail` (was: `email`), matching the GDPR-relevant field on `dateline_events`.
- PRO-481: recurring-event range filter derives each occurrence's end from the event's duration (`occurrence.startsAt + (event.endsAt - event.startsAt)`) instead of reusing the original series end for every occurrence.
- PRO-492: range-keyed iCal feeds now render and index only events inside the requested range, preventing all-events cache poisoning; invalid recurrence durations are clamped to zero for range matching.
