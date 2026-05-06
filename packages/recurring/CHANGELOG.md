# @dateline/recurring

## 0.1.1

### Patch Changes

- [#32](https://github.com/foreztgump/dateline-events-plugin/pull/32) [`b6ab30e`](https://github.com/foreztgump/dateline-events-plugin/commit/b6ab30e6e144f7a4be67a97f9b3ff09b0ce6e80d) Thanks [@foreztgump](https://github.com/foreztgump)! - Fix three recurrence-parsing defects, completing the host-tz determinism work begun in v0.1.0 PR #24.
  - [PRO-489] `extractTzidParam` now walks `;`-separated iCal property params instead of `split("TZID=")`, so trailing params (e.g. `EXDATE;TZID=America/Los_Angeles;VALUE=DATE-TIME:...`) and leading params before TZID no longer pollute the parsed tzid.
  - [PRO-494] `extractTzidParam` compares the `TZID` param name case-insensitively while preserving the original-cased IANA timezone value, so non-canonical `tzid=` and `Tzid=` params no longer fall back to the input timezone.
  - [PRO-483] `parseIsoDateValue` detects an explicit UTC offset (`Z` or `[+-]HH:MM`) and routes those through `new Date(...)`; offset-less extended ISO values (`YYYY-MM-DDTHH:MM:SS`) are now interpreted as wall time in the supplied `tzid` via `wallTimeToUtc`, removing the host-process timezone dependency.

## 0.1.0

### Minor Changes

- Ship the v0.1.0 recurring events package with RRULE validation, IANA timezone-aware occurrence materialization, EXDATE/RDATE support, and KV cache helpers.
