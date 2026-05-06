---
"@dateline/recurring": patch
---

Fix two recurrence-parsing defects, completing the host-tz determinism work begun in v0.1.0 PR #24.

- [PRO-489] `extractTzidParam` now walks `;`-separated iCal property params instead of `split("TZID=")`, so trailing params (e.g. `EXDATE;TZID=America/Los_Angeles;VALUE=DATE-TIME:...`) and leading params before TZID no longer pollute the parsed tzid.
- [PRO-483] `parseIsoDateValue` detects an explicit UTC offset (`Z` or `[+-]HH:MM`) and routes those through `new Date(...)`; offset-less extended ISO values (`YYYY-MM-DDTHH:MM:SS`) are now interpreted as wall time in the supplied `tzid` via `wallTimeToUtc`, removing the host-process timezone dependency.
