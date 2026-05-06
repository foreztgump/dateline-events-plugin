---
"@dateline/rsvp": patch
---

Canonicalize the capacity lock key in the fallback (non-atomic KV) path so reserve and release for the same event share a lock, preventing counter drift under concurrency. Clean up capacity lock map entries by comparing the inserted chained promise, preventing unbounded lock map growth after reserve/release cycles complete. [PRO-488, PRO-491]
