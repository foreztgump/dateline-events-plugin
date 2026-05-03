# Capability: monorepo-build-system

The build, type-check, lint, test, versioning, and CI infrastructure shared by every Dateline package. The capability is "satisfied" when a fresh clone can run a single set of root commands and have every package install, build, type-check, lint, and test cleanly — with no plugin behavior implemented.

## Requirements

### Requirement: pnpm workspace at the repository root

The repository SHALL be a pnpm 10.x workspace declared via `pnpm-workspace.yaml`, with internal package links using the `workspace:*` protocol.

#### Scenario: pnpm install completes without errors on a clean clone

- **WHEN** an operator runs `pnpm install --frozen-lockfile` from the repository root on a freshly cloned checkout
- **THEN** the command exits with status 0
- **AND** every workspace package listed in `pnpm-workspace.yaml` is symlinked under the root `node_modules/`
- **AND** no warnings about unknown protocols or mismatched workspace versions are emitted

#### Scenario: workspace package list matches the planned scaffold

- **WHEN** `pnpm-workspace.yaml` is read
- **THEN** it declares `packages/*` and `examples/*` as the package globs
- **AND** the seven scaffolded directories `packages/blocks`, `packages/core`, `packages/rsvp`, `packages/recurring`, `packages/importer`, `packages/views`, `examples/reference-site` are each present with a valid `package.json`

### Requirement: TypeScript strict mode with project references

Every package MUST extend a single shared `tsconfig.base.json` with `strict: true`, and the root `tsconfig.json` MUST use project references with composite builds so `tsc -b` builds packages in dependency order.

#### Scenario: Root typecheck succeeds across all packages

- **WHEN** an operator runs `pnpm -r typecheck` from the repository root
- **THEN** every package runs `tsc -b --noEmit` (or equivalent) against its own `tsconfig.json`
- **AND** the command exits with status 0
- **AND** the shared base config sets `strict: true`, `noUncheckedIndexedAccess: true`, `module: "ESNext"`, `target: "ES2022"`, and `moduleResolution: "Bundler"`

#### Scenario: Composite build emits declaration files

- **WHEN** an operator runs `pnpm -r build`
- **THEN** every package emits compiled JavaScript and `.d.ts` declaration files under its own `dist/`
- **AND** packages that depend on other workspace packages resolve them through project references, not through `node_modules` source

### Requirement: ESLint flat config shared across the workspace

The root SHALL provide a single ESLint flat config (`eslint.config.js`) that every package consumes, enforcing the lintable subset of `CODE_PRINCIPLES.md` Hard Rules.

#### Scenario: Root lint passes on the scaffolded code

- **WHEN** an operator runs `pnpm -r lint`
- **THEN** every package's source and test files are linted against the shared flat config
- **AND** the command exits with status 0
- **AND** the config enables at minimum `@typescript-eslint/recommended-type-checked`, `no-magic-numbers` (with named-constant ignores), `max-lines-per-function: 40`, `max-params: 3`, `max-depth: 3`, and `complexity` thresholds aligned with `CODE_PRINCIPLES.md`

#### Scenario: Lint fix script repairs auto-fixable findings

- **WHEN** an operator runs `pnpm lint:fix` from the root
- **THEN** ESLint runs with `--fix` across the workspace
- **AND** auto-fixable issues are corrected in place

### Requirement: Vitest 4 root config using projects

The root SHALL provide a Vitest 4.x configuration that uses the `projects` field to aggregate every package's tests. The deprecated workspace config form MUST NOT be used.

#### Scenario: Root test command runs every package's smoke test

- **WHEN** an operator runs `pnpm -r test` from the root
- **THEN** every package's smoke test executes
- **AND** the command exits with status 0
- **AND** Vitest reports at least one passing test for each scaffolded package

#### Scenario: Each package contains exactly one smoke test at scaffold time

- **WHEN** the change is implemented
- **THEN** each of the seven scaffolded packages contains a colocated `src/index.test.ts` (or equivalent) with at least one passing test
- **AND** that test asserts a stable identifier from the package (the package name string or a constant export) so the pipeline runs end-to-end without depending on plugin behavior

### Requirement: Changesets with independent versioning

The repository MUST be configured for Changesets independent versioning with the GitHub changelog plugin, so each package can release on its own cadence.

#### Scenario: Changeset config declares independent mode

- **WHEN** `.changeset/config.json` is read
- **THEN** the `fixed` array is empty
- **AND** the `linked` array is empty
- **AND** the `changelog` entry is the GitHub plugin entry pointing at the correct repository owner/name
- **AND** `access` is `public` and `baseBranch` is the project's default branch

#### Scenario: Root scripts expose changeset workflow

- **WHEN** an operator inspects the root `package.json` scripts
- **THEN** `changeset` invokes `changeset` CLI to create a new changeset
- **AND** `version-packages` invokes `changeset version` to bump versions and update changelogs
- **AND** `release` runs `pnpm -r build` followed by `changeset publish`

### Requirement: emdash peer dependency on every package

Every package under `packages/*` MUST declare `peerDependencies: { "emdash": "^0.9.0" }`. The `examples/reference-site` app MAY declare it as a direct dependency instead.

#### Scenario: Peer dependency present in every plugin package

- **WHEN** any `packages/*/package.json` is read
- **THEN** the `peerDependencies.emdash` field equals `"^0.9.0"`
- **AND** the package does NOT also declare `emdash` in `dependencies` (peer-only at scaffold time)

#### Scenario: Reference site declares emdash as a direct dependency

- **WHEN** `examples/reference-site/package.json` is read
- **THEN** the `dependencies.emdash` field equals `"^0.9.0"`

### Requirement: GitHub Actions CI workflow on pull requests

A `.github/workflows/ci.yml` workflow MUST run on every pull request and exercise install, typecheck, lint, build, and test in that order.

#### Scenario: CI workflow triggers on pull request

- **WHEN** a pull request is opened against the default branch
- **THEN** the workflow runs the steps `pnpm install --frozen-lockfile`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, `pnpm -r test`
- **AND** any non-zero exit fails the check
- **AND** Node.js and pnpm versions are pinned via `actions/setup-node` and `pnpm/action-setup` to the versions declared in `.nvmrc` and `package.json#packageManager`

### Requirement: .gitignore excludes build and tool artifacts

The repository `.gitignore` MUST exclude `node_modules`, `dist`, `.wrangler`, and `.factory-state` from version control.

#### Scenario: .gitignore contains the four required entries

- **WHEN** the repository's root `.gitignore` is read
- **THEN** it contains lines matching `node_modules`, `dist`, `.wrangler`, and `.factory-state`
- **AND** none of those paths are tracked in git after the change is committed

### Requirement: Scaffold contains no plugin behavior

The packages MUST contain only the minimum code required to make build, typecheck, lint, and test pipelines pass. No EmDash plugin definitions, no Stripe code, no rrule code, no Block Kit builders, no Astro components beyond a single placeholder export.

#### Scenario: Smoke test asserts only a stable identifier

- **WHEN** any package's smoke test is read
- **THEN** the test imports a single exported identifier (the package name string or a constant) and asserts its value
- **AND** the test does NOT import or call EmDash, Stripe, rrule, ical-generator, Zod, or React APIs

#### Scenario: src/ contains a single placeholder module

- **WHEN** any package's `src/index.ts` is read
- **THEN** the file exports at most one named constant (the package name) and any types required by the smoke test
- **AND** no business logic, side effects, or external imports are present
