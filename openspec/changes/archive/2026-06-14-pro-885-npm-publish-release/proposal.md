# PRO-885 / PRO-887 npm publish + release automation (v0.3.0)

## Why

The v0.2.0 modernization shipped six conforming `@dateline/*` packages but never published them — `npm view @dateline/core` returns E404, and the release was a changesets dry-run only. No operator can install Dateline without cloning and building from source. This change makes the six packages real, installable npm artifacts and promotes the dry-run to a tagged publish pipeline (PRD §3 WS-A1 + WS-A3, milestone M1).

## What changes

- **Publish metadata.** Add the npm `repository`, `homepage`, `bugs`, `description`, and `keywords` fields to all six `package.json` files. The `repository` field is REQUIRED for npm provenance verification (npm rejects a provenance publish with HTTP 422 when `repository.url` is empty). Add `README.md` to the `files` array of `core` and `recurring` (the other four already include it) so npm package pages render docs.
- **Version bump.** Bump all six packages 0.2.0 → 0.3.0 via a changeset, matching the M1 "Ship it (v0.3.0)" milestone.
- **Release workflow (PRO-887).** Add `.github/workflows/release.yml` triggered on `v*` tags that builds the workspace and runs `changeset publish` with provenance enabled (`id-token: write` + OIDC). Include a manual `workflow_dispatch` dry-run path for verification before a real tag.
- **Rollback runbook.** Document the deprecate/rollback path (`npm deprecate`, never `npm unpublish` after 72h, how to cut a follow-up patch) in `CONTRIBUTING.md`.

## Scope decisions (recorded)

- **Scope = `@dateline` (Option A).** A dedicated npm org named `dateline` was created (owner: `networkreef`). Package names are unchanged — zero rename. `@dateline` was verified unclaimed before org creation.
- **First publish is local; provenance starts at 0.3.1.** npm provenance requires (a) a PUBLIC source repository and (b) the package to already exist for OIDC trusted publishing. The repo is made public as part of this change, but trusted publishing cannot authenticate a first-ever publish, so 0.3.0 is published locally (no provenance). Trusted publishing is then configured per-package on npmjs.com so provenance is automatic from 0.3.1 onward.

## Impact

- Affected: all six `packages/*/package.json`, `.github/workflows/release.yml` (new), `CONTRIBUTING.md` (new or updated), `.changeset/`.
- A brand-new operator can run `npm add @dateline/core @dateline/rsvp @dateline/importer @dateline/views @dateline/recurring @dateline/blocks` against a fresh EmDash site without cloning this repo.
- Source repository visibility changes from private to public (required for provenance and for npm package page source links).
