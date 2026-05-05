# Proposal: PRO-401 — Scaffold dateline-events-plugin Monorepo

## Why

Every downstream Dateline change (`@dateline/core`, `@dateline/rsvp`, `@dateline/recurring`, `@dateline/importer`, `@dateline/views`, `@dateline/blocks`, and the reference site) needs a working monorepo before any plugin code can be written, tested, or released. Without a clean scaffold — pnpm workspaces, strict TypeScript with project references, ESLint flat config, Vitest 4 projects, Changesets independent versioning, and CI — every implementation task would re-invent build infrastructure and drift from the conventions captured in `openspec/config.yaml` and `CODE_PRINCIPLES.md`. This change establishes that scaffold once, with no plugin logic, so the next ten changes can focus on behavior.

## What Changes

- Create a pnpm 10.x workspace at the repo root with `packages/*` and `examples/*` globs and the `workspace:*` protocol for internal links.
- Generate the seven scaffolded packages: `packages/blocks`, `packages/core`, `packages/rsvp`, `packages/recurring`, `packages/importer`, `packages/views`, `examples/reference-site`. Each ships with `package.json`, `tsconfig.json`, `src/index.ts`, and a single passing smoke test — no plugin behavior.
- Add a strict TypeScript root config using project references and composite builds; every package extends a shared `tsconfig.base.json`.
- Add an ESLint flat config (`eslint.config.js`) at the root, shared by all packages, enforcing `CODE_PRINCIPLES.md` Hard Rule limits where lintable (no magic numbers, max nesting, max function length, max params).
- Add a Vitest 4 root config using the `projects` field (the workspace config is deprecated in v4). Each package has at least one smoke test; root `pnpm -r test` aggregates results.
- Configure Changesets with **independent versioning** and the GitHub changelog plugin. Add `changeset` and `version-packages` scripts at the root.
- Declare `peerDependencies: { "emdash": "^0.9.0" }` on every package (the reference-site app declares it as a direct dependency).
- Add a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs `pnpm install --frozen-lockfile`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, and `pnpm -r test` on every pull request.
- Add a `.gitignore` at the repo root covering `node_modules`, `dist`, `.wrangler`, and `.factory-state`.
- Add root scripts: `build`, `typecheck`, `lint`, `lint:fix`, `test`, `test:watch`, `clean`, `changeset`, `version-packages`, `release`.

This change is **pure scaffolding**. It contains no Dateline plugin logic, no EmDash hooks, no Stripe code, no rrule code, no Block Kit builders. Smoke tests assert only that the package exports a stable identifier so the build, typecheck, lint, and test pipelines have something real to chew on.

## Capabilities

### New
- `monorepo-build-system` — the workspace, build, lint, type-check, test, versioning, and CI infrastructure that every Dateline package depends on.

### Modified
- *(none)* — the repository previously had no packages. This change initializes the build system from a clean state.

## Impact

- **New top-level files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `.changeset/config.json`, `.gitignore` (extended), `.npmrc`, `.github/workflows/ci.yml`, `.nvmrc`.
- **New package directories (each with `package.json`, `tsconfig.json`, `src/index.ts`, one `*.test.ts`):** `packages/blocks/`, `packages/core/`, `packages/rsvp/`, `packages/recurring/`, `packages/importer/`, `packages/views/`, `examples/reference-site/`.
- **Affected systems:** build (pnpm), type-check (tsc -b), lint (ESLint flat), test (Vitest 4), versioning (Changesets), CI (GitHub Actions). All new — none replaced.
- **Downstream dependents:** PRO-402 through PRO-41x (per-plugin implementations) all depend on this scaffold. Each will fill in the empty `src/` of one package.
- **Blocking dependency:** PRO-402 (EmDash 0.9.0 findings) — the EmDash peer-dependency range and any 0.9.0 plugin-SDK shape decisions land there. This change pins `emdash ^0.9.0` per current research; if PRO-402 changes that range, this scaffold is the single place to update it.
- **Legal:** No source contamination risk — this is original infrastructure config. No GPL inputs touched.

## Rollback Plan

- The change is purely additive. To roll back: revert the scaffold commit. No runtime, schema, deployed worker, or external integration has been touched, so revert is a local-only operation.
- If a tool choice (e.g., Vitest 4 projects, Changesets independent mode) proves wrong after merge, the rollback path is to amend the chosen tool's config file in isolation — no package source code depends on tool internals at scaffold time, so swapping a tool affects only the root config files.
- If the EmDash 0.9.0 peer-dep range shifts in PRO-402, the rollback is a one-line edit in each package's `package.json` plus a regenerated lockfile; smoke tests do not import EmDash so no test changes are required.
