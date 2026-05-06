# PRO-398 Importer

## Why

Dateline needs a low-friction migration path for sites moving from WordPress event plugins and generic calendar exports. The importer package provides the v0.1 adoption lever: TEC one-shot migration plus generic iCal, CSV, and JSON imports into the Dateline core collections.

## What Changes

- Replace the importer stub with a sandboxed EmDash plugin manifest declaring `content:read`, `content:write`, and `network:request`.
- Add import pipelines for TEC JSON dumps, iCalendar files/feeds, CSV with explicit field mapping, and JSON event arrays.
- Add Block Kit admin routes for source whitelist settings and mapping-driven import workflows.
- Add idempotent content writes keyed by `sourceId`, with per-row errors and partial success results.

## Rollback

The change is isolated to `packages/importer` plus this OpenSpec directory. Roll back by reverting the package changes and removing `openspec/changes/pro-398-importer/`; no shared schemas or locked artifacts are modified.
