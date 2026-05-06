---
"@dateline/rsvp": patch
---

Canonicalize capacity lock key in fallback (non-atomic KV) path so reserve and release for the same event share a lock, preventing counter drift under concurrency. [PRO-488]
