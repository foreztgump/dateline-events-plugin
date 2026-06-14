# release-distribution Specification

## Purpose
TBD - created by archiving change pro-885-npm-publish-release. Update Purpose after archive.
## Requirements
### Requirement: All six packages publish to npm under `@dateline`

The six packages — `@dateline/core`, `@dateline/rsvp`, `@dateline/importer`, `@dateline/recurring`, `@dateline/views`, `@dateline/blocks` — SHALL be publishable to the public npm registry under the `@dateline` scope with public access.

#### Scenario: Operator installs from npm without cloning

- **WHEN** a new operator runs `npm add @dateline/core @dateline/rsvp @dateline/importer @dateline/views @dateline/recurring @dateline/blocks` in a fresh project
- **THEN** all six resolve from the npm registry (no E404)
- **AND** each installed tarball contains the built `dist/` output matching the workspace build
- **AND** the sandboxed plugins expose `.` → `dist/index.mjs` and `./sandbox` → `dist/plugin.mjs`

### Requirement: Publish metadata supports provenance and discovery

Each package SHALL declare a `repository` field pointing at the public source repository, plus `homepage`, `bugs`, `description`, and `keywords`.

#### Scenario: Provenance publish is accepted by npm

- **WHEN** a package is published with provenance from CI against the public repository
- **THEN** npm accepts the publish (no HTTP 422 `repository.url` verification error)
- **AND** the provenance attestation is visible on the package page

#### Scenario: Package page renders documentation

- **WHEN** a package page loads on npmjs.com
- **THEN** the README content is present (each package ships `README.md` in its `files` array)

### Requirement: Tagged release automation

A GitHub Actions workflow SHALL publish all six packages when a `v*` tag is pushed, and SHALL offer a dry-run path for verification.

#### Scenario: Pushing a release tag publishes the packages

- **WHEN** a `v0.3.x` tag is pushed
- **THEN** the workflow builds the workspace and runs the changesets publish step
- **AND** provenance is generated when trusted publishing is configured and the repo is public

#### Scenario: Dry-run verification before a real tag

- **WHEN** the workflow is dispatched with the dry-run input
- **THEN** it packs tarballs and reports what would publish without authenticating or publishing

### Requirement: Documented rollback path

The repository SHALL document how to remediate a bad release.

#### Scenario: Bad version is deprecated, not unpublished

- **WHEN** a maintainer needs to pull a bad version after 72h
- **THEN** the runbook directs them to `npm deprecate` and a follow-up patch release
- **AND** explicitly forbids `npm unpublish` after the 72h window

