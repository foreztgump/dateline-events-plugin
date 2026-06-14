# PRO-885 / PRO-887 design

## Publish metadata

Each `package.json` gains:

- `description` — one-line summary (npm search + package page header).
- `repository` — `{ "type": "git", "url": "git+https://github.com/foreztgump/dateline-events-plugin.git", "directory": "packages/<name>" }`. The `directory` subpath is the monorepo convention; npm provenance matches on `repository.url`.
- `homepage` — repo URL with the package subpath.
- `bugs` — `{ "url": "https://github.com/foreztgump/dateline-events-plugin/issues" }`.
- `keywords` — discovery terms (emdash, events, calendar, rsvp, etc.).
- `files` — `core` and `recurring` add `"README.md"` (already present in the other four).

`publishConfig.access` is NOT added per-package because the root `.changeset/config.json` already sets `access: public`, and changesets passes it through. Both `npm publish` and `changeset publish` honor the scope-wide public access set at first publish.

## Version bump

A single changeset entry marks all six packages `minor` (0.2.0 → 0.3.0). `changeset version` rewrites `package.json` versions and generates `CHANGELOG.md` entries from the changeset summary. `workspace:*` internal deps are rewritten to the published version range at pack time by pnpm.

## Release workflow

`.github/workflows/release.yml`:

- Triggers: `push` on tags matching `v*`, plus `workflow_dispatch` with a `dry_run` boolean input.
- Permissions: `contents: read`, `id-token: write` (OIDC for provenance).
- Steps mirror the existing `ci.yml` setup (pnpm action-setup pinned, setup-node with `.nvmrc`, `pnpm install --frozen-lockfile`), then build the workspace (`pnpm -r build`), then publish.
- Publish step: `pnpm -r publish --provenance --access public --no-git-checks` on a real tag; the dry-run path runs `pnpm -r publish --dry-run` and exits without authentication.
- `NODE_AUTH_TOKEN` is NOT set when trusted publishing is configured (OIDC auto-detect). For the transitional period before trusted publishing is configured, the workflow reads `NPM_TOKEN` from secrets if present; once trusted publishing is live the secret is removed.

Provenance is generated automatically by the npm CLI when `id-token: write` is present AND the source repo is public AND trusted publishing is configured for the package. The first 0.3.0 publish runs locally (outside CI) and therefore carries no provenance; this is a documented, accepted one-time gap.

## Rollback runbook (CONTRIBUTING.md)

- Bad version → `npm deprecate @dateline/<pkg>@<version> "reason; use <next>"`. Never `npm unpublish` after 72h (registry policy; breaks dependents).
- Cut a follow-up patch via a new changeset + `v0.3.x` tag.
- Provenance/visibility: the repo must stay public for provenance source links to resolve; making it private again invalidates published provenance.

## Sequencing (irreversible actions last)

1. Reversible: metadata edits, version bump, workflow, runbook, build/test green, review, PR.
2. Irreversible (human-gated, after review): secret-scan git history → make repo public → `pnpm -r publish` locally for 0.3.0 → verify `npm view` ×6 → configure trusted publishing on npmjs.com.
