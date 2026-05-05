# PRO-404 — Dateline Block Kit builders and validators

## Why

Dateline plugins must return EmDash Block Kit JSON from sandboxed admin routes. The most common failures are field-name drift (`stats` vs `items`, `text` vs `label`) and accidental route responses that include non-Block Kit keys such as `redirect`.

## What changes

- Add `@dateline/blocks` typed builders for the current EmDash Block Kit block and element surface.
- Add `validateBlocks(blocks)` as the Dateline runtime invariant for all plugin admin UI blocks.
- Add `assertResponse(response)` so plugin routes can validate `{ blocks, toast? }` and reject redirects, raw bodies, headers, and unknown keys.
- Document the gotcha catalog in the package README.

## Rollback plan

This package is a leaf dependency. Reverting this change restores the previous stub package without affecting other packages, provided milestone 2+ packages have not yet imported it.
