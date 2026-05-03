# Tasks: PRO-401 — Scaffold dateline-events-plugin Monorepo

All file paths are relative to the change worktree root: `./`.

**Cross-cutting CODE_PRINCIPLES.md rules that apply to every task:**
- Hard Rule **#2 No Magic Values** — version strings, ports, paths get named constants in scripts; literal versions in `package.json` are necessarily literal.
- Hard Rule **#3 Names Reveal Intent** — package names follow `@dateline/<role>`; script names follow established pnpm conventions (`build`, `typecheck`, `lint`, `test`).
- Hard Rule **#8 YAGNI** — no plugin behavior, no helper utilities, no React components, no Astro pages. Smoke tests assert one thing.
- Hard Rule **#11 No Speculative Abstractions** — no shared `dateline-config` package, no shared base classes. Root config files are the only shared surface.
- Soft Guideline **#1 KISS** — vanilla pnpm + tsc + ESLint + Vitest + Changesets. No Turborepo, no tsup at scaffold time.

**Cross-cutting error handling:** All CI steps fail loudly on non-zero exit. `pnpm install` runs with `--frozen-lockfile` to prevent silent drift. Any tool that produces warnings on a clean install is treated as a configuration bug and fixed before the change is reviewed. Smoke tests have nothing to catch — assertion failures simply propagate.

---

## Task 1 — Initialize root pnpm workspace

**Files to Create:**
- `package.json` (root)
- `pnpm-workspace.yaml`
- `.npmrc`
- `.nvmrc`

**Acceptance criteria**
- [x] Root `package.json` declares `"private": true`, `"type": "module"`, `"packageManager": "pnpm@10.33.2"`, and the script set: `build`, `typecheck`, `lint`, `lint:fix`, `test`, `test:watch`, `clean`, `changeset`, `version-packages`, `release`.
- [x] All `-r` aware scripts use `pnpm -r run <script>`; `clean` removes every package's `dist/` and `node_modules/.cache/`.
- [x] `pnpm-workspace.yaml` declares `packages: ["packages/*", "examples/*"]` and nothing else.
- [x] `.npmrc` sets `auto-install-peers=true` and `strict-peer-dependencies=false` (Cloudflare Workers types are routinely peer-only).
- [x] `.nvmrc` pins the Node version used by CI (20.x LTS or whatever `openspec/config.yaml` references).
- [x] No `package-lock.json` or `yarn.lock` is created.

**Test files:** none for this task — verified by Task 9 (`pnpm install` clean run).

---

## Task 2 — Add shared TypeScript base config

**Files to Create:**
- `tsconfig.base.json`
- `tsconfig.json` (root project-references manifest)
- `tsconfig.eslint.json`

**Acceptance criteria**
- [x] `tsconfig.base.json` sets `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `lib: ["ES2022"]`, `composite: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `skipLibCheck: true`.
- [x] Root `tsconfig.json` has `references: [...]` for all seven scaffolded packages and `files: []`.
- [x] `tsconfig.eslint.json` extends the base and adds `include: ["packages/**/*", "examples/**/*"]` plus `exclude: ["**/dist/**", "**/node_modules/**"]` so type-aware linting only sees source.

**Test files:** none — verified by Task 9 (`pnpm -r typecheck`).

---

## Task 3 — Add ESLint flat config and lint scripts

**Files to Create:**
- `eslint.config.js`

**Files to Modify:**
- `package.json` (root) — confirm `lint` and `lint:fix` scripts wired to `eslint . --cache` and `eslint . --cache --fix`.

**Acceptance criteria**
- [x] Config uses ESLint 9 flat-config form (array of objects, no `extends:` strings).
- [x] Includes `@typescript-eslint/recommended-type-checked` rules with `parserOptions.project: "./tsconfig.eslint.json"`.
- [x] Enforces (named constants for thresholds inside the config file): `max-lines-per-function: 40`, `max-params: 3`, `max-depth: 3`, `complexity: 10`, `no-magic-numbers` with `ignore: [-1, 0, 1, 2]` and `ignoreEnums: true`, `no-console: ["error", { allow: ["warn", "error"] }]`.
- [x] Test files (`**/*.test.ts`) are excepted from `max-lines-per-function` and `no-magic-numbers` (test inputs are deliberately literal).
- [x] `dist/`, `node_modules/`, `.wrangler/`, `.factory-state/` are globally ignored.

**Error handling:** Lint failures are treated as build failures — no `--no-error-on-unmatched-pattern`. The script uses `--cache` to keep CI fast.

**Test files:** none — verified by Task 9 (`pnpm -r lint`).

---

## Task 4 — Add Vitest 4 root config with projects aggregation

**Files to Create:**
- `vitest.config.ts`

**Acceptance criteria**
- [x] Config uses `defineConfig({ test: { projects: [...] } })` from `vitest/config` — NOT `defineWorkspace` and NOT a `vitest.workspace.ts` file (deprecated in v4).
- [x] `projects` lists each scaffolded package by glob: `packages/*`, `examples/reference-site`.
- [x] Root reporter is `"default"`; coverage is configured (provider `v8`) but with no enforced thresholds at scaffold time (deferred until packages have real code).
- [x] `test` and `test:watch` scripts at the root run `vitest run` and `vitest`.

**Test files:** none directly — Task 5 adds the per-package smoke tests this config will collect. Verified end-to-end by Task 9 (`pnpm -r test`).

---

## Task 5 — Scaffold the seven packages

This task is intentionally large but mechanically uniform: seven packages, each with the same five files (`package.json`, `tsconfig.json`, `src/index.ts`, `src/index.test.ts`, `README.md`).

**Files to Create (per package):**

For each of `packages/blocks`, `packages/core`, `packages/rsvp`, `packages/recurring`, `packages/importer`, `packages/views`, `examples/reference-site`:

- `<package-dir>/package.json`
- `<package-dir>/tsconfig.json`
- `<package-dir>/src/index.ts`
- `<package-dir>/src/index.test.ts`
- `<package-dir>/README.md` (one-paragraph stub)

**Naming map**

| Directory                  | npm name              | License    |
| -------------------------- | --------------------- | ---------- |
| `packages/blocks`          | `@dateline/blocks`    | MIT        |
| `packages/core`            | `@dateline/core`      | MIT        |
| `packages/rsvp`            | `@dateline/rsvp`      | MIT        |
| `packages/recurring`       | `@dateline/recurring` | MIT        |
| `packages/importer`        | `@dateline/importer`  | MIT        |
| `packages/views`           | `@dateline/views`     | MIT        |
| `examples/reference-site`  | `@dateline/reference-site` (private, `"private": true`) | MIT |

**Per-package `package.json` acceptance criteria**
- [x] `name` matches the table above; `version` is `0.0.0`.
- [x] `type: "module"`, `main: "./dist/index.js"`, `types: "./dist/index.d.ts"`, `exports: { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`.
- [x] `files: ["dist", "README.md"]` on publishable packages; reference-site is `"private": true` and omits `files`.
- [x] `scripts`: `build: "tsc -b"`, `typecheck: "tsc -b --noEmit"`, `lint: "eslint src --cache"`, `test: "vitest run"`, `clean: "rm -rf dist .turbo node_modules/.cache"`.
- [x] All six `packages/*` declare `peerDependencies: { "emdash": "^0.9.0" }` and do **not** list emdash under `dependencies`.
- [x] `examples/reference-site/package.json` declares `dependencies: { "emdash": "^0.9.0" }` (no peer-dep) and `astro` (version per `openspec/config.yaml`).
- [x] `devDependencies` on each package: `typescript`, `vitest`, `@types/node`. No other deps at scaffold time.

**Per-package `tsconfig.json` acceptance criteria**
- [x] `extends: "../../tsconfig.base.json"` (adjust path for `examples/reference-site`).
- [x] `compilerOptions: { outDir: "dist", rootDir: "src" }`.
- [x] `include: ["src"]`.
- [x] No `references` between packages at scaffold time (no internal imports exist yet — see design.md "Dependency Direction").

**Per-package `src/index.ts` acceptance criteria**
- [x] Exports exactly one named constant: `export const PACKAGE_NAME = "@dateline/<role>";` matching the npm name.
- [x] No imports, no side effects, no other exports.

**Per-package `src/index.test.ts` acceptance criteria** (AAA structure, Hard Rule #10)
- [x] Imports `describe, it, expect` from `vitest`.
- [x] Imports `PACKAGE_NAME` from `./index`.
- [x] One test: `it("exports its npm package name", () => { expect(PACKAGE_NAME).toBe("@dateline/<role>"); });`.
- [x] No fixtures, no mocks, no `beforeEach`.

**Per-package `README.md` acceptance criteria**
- [x] One paragraph stating the package's role per `openspec/config.yaml` `Structure (monorepo)` section. Three sentences max.

**Error handling:** Smoke tests have nothing external to catch. The placeholder `src/index.ts` has no boundaries to wrap. Hard Rule #4 applies once real code lands — not in this task.

---

## Task 6 — Configure Changesets with independent versioning

**Files to Create:**
- `.changeset/config.json`
- `.changeset/README.md` (the standard Changesets-generated stub)

**Acceptance criteria**
- [x] `config.json` sets `"$schema": "https://unpkg.com/@changesets/config@<latest>/schema.json"` (literal version pinned to whatever pnpm install resolves).
- [x] `"changelog": ["@changesets/changelog-github", { "repo": "<owner>/<repo>" }]` — operator fills `<owner>/<repo>` to the actual GitHub coords for the project.
- [x] `"commit": false`, `"fixed": []`, `"linked": []`, `"access": "public"`, `"baseBranch": "main"` (matches `openspec/config.yaml` default branch).
- [x] `"updateInternalDependencies": "patch"`, `"ignore": []`.
- [x] Root `package.json` adds `@changesets/cli` and `@changesets/changelog-github` to `devDependencies`.

**Test files:** none — verified by `pnpm changeset --help` exiting 0 in CI.

---

## Task 7 — Add GitHub Actions CI workflow

**Files to Create:**
- `.github/workflows/ci.yml`

**Acceptance criteria**
- [x] Workflow named `CI`; triggers on `pull_request` against `main` and on `push` to `main`.
- [x] Single job `verify` running on `ubuntu-latest`.
- [x] Steps in order: `actions/checkout@v4`, `pnpm/action-setup@v4` (version pinned to `10.33.2`), `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install --frozen-lockfile`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, `pnpm -r test`.
- [x] Workflow has `permissions: contents: read` (least privilege; release workflow that needs write is deferred).
- [x] Concurrency group: `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.
- [x] No secrets referenced — release secrets land in a separate workflow once publishing begins.

**Error handling:** Each shell step uses default `set -e`; non-zero exits fail the job. No `continue-on-error` anywhere.

**Test files:** none — the workflow IS the verification harness for every other task.

---

## Task 8 — Add root `.gitignore`

**Files to Modify:**
- `.gitignore` (extend the existing file)

**Acceptance criteria**
- [x] Lines present (one per line, trailing newline): `node_modules`, `dist`, `.wrangler`, `.factory-state`.
- [x] Existing `.gitignore` content (e.g., `.DS_Store`, OS noise) is preserved.
- [x] After committing, `git status` from a clean install shows none of the four ignored paths as untracked or modified.

**Test files:** none — verified manually by running `pnpm install` then `git status` clean.

---

## Task 9 — End-to-end pipeline verification

**Files to Modify:** none — this task is a verification checklist that the parent agent runs from the worktree root before opening the PR.

**Acceptance criteria** (run from the worktree root, in this order):

- [x] `pnpm install --frozen-lockfile` exits 0 with no warnings about peer-dep mismatches or workspace protocol issues.
- [x] `pnpm -r typecheck` exits 0; output shows 7 packages compiled.
- [x] `pnpm -r lint` exits 0; output shows 7 packages linted with 0 errors and 0 warnings.
- [x] `pnpm -r build` exits 0; every `packages/*/dist/index.js` and `packages/*/dist/index.d.ts` exists; `examples/reference-site/dist/index.js` exists.
- [x] `pnpm -r test` exits 0; reporter shows exactly 7 passing tests, one per package.
- [x] `pnpm changeset --help` exits 0 (CLI installed).
- [x] `git status` is clean (no generated artifacts tracked or pending).
- [x] CI workflow file passes `actionlint` if available (best-effort; the GitHub Actions runner is the authoritative validator).

**Error handling:** Any failure here means an earlier task is incomplete — do not proceed to opening a PR. Fix the failing tool config in the owning task's files; do not paper over with `--ignore-scripts` or per-package overrides.

---

## Notes on deferred decisions

- **EmDash 0.9.0 peer-dep range** — pinned to `^0.9.0` based on PRO-402 research findings. If PRO-402 lands a different range before this change merges, update every `packages/*/package.json` and `examples/reference-site/package.json` in a single sweep.
- **Astro page scaffolding for `examples/reference-site`** — deferred. At scaffold time the reference site is a TypeScript package with `astro` as a dep but no pages. The first page lands when `@dateline/views` exposes a real component.
- **Release workflow (`release.yml`)** — deferred. Acceptance criteria asks only for "CI on PR". Release pipeline lands once at least one package has shipping code.
- **Turborepo / remote caching** — deferred. See design.md Approach B for the criteria that would justify revisiting.
