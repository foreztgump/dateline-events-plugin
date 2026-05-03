# Design: PRO-401 — Scaffold dateline-events-plugin Monorepo

## Context

This change is **build infrastructure**, not a runtime feature. The "module" being designed is the workspace itself — the contract every future package will live inside. Decisions made here propagate into ten downstream changes; bad choices here cost a re-flow of every package's `package.json`, every CI run, and every release. So design discipline applies even though there is no plugin code yet.

The constraints driving the design:

1. **Seven packages from day one** — `blocks`, `core`, `rsvp`, `recurring`, `importer`, `views`, `reference-site`. The build system must support all seven without per-package custom config.
2. **TypeScript strict + project references** — the only way to get cross-package type checking and incremental builds at this scale.
3. **Vitest 4** — the deprecated `vitest.workspace.ts` form is gone in v4; the replacement is the `projects` field inside `vitest.config.ts`. We must adopt the new form on day one rather than migrate later.
4. **ESLint flat config** — ESLint 9+ requires it; the legacy `.eslintrc.*` form is dead. Must be flat from day one.
5. **Changesets independent versioning** — every package releases on its own cadence; no fixed/linked groups. Required because `@dateline/blocks` (internal builder lib) versions move much faster than `@dateline/core` (stable plugin).
6. **EmDash 0.9.0 peer-dep** — every package declares `peerDependencies: { emdash: "^0.9.0" }`. PRO-402 confirms or revises this range; we pin to `^0.9.0` based on current research and treat the root `package.json` set as the single point of truth.
7. **CI must be green on day one** — the scaffold's value is the green pipeline. A scaffold that almost works is no better than no scaffold.
8. **No plugin code** — strictly YAGNI. The smoke tests assert a string. The `src/index.ts` exports a string. The pipeline runs end-to-end on that string.

## Module Depth — Prefer Deep Modules

The root build system is the deepest module in the monorepo: the **interface is a small set of root scripts** (`pnpm install`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, `pnpm -r test`, `pnpm changeset`); the **implementation hides** pnpm workspace resolution, TypeScript project-reference graph computation, ESLint flat-config inheritance, Vitest project aggregation, Changesets independence rules, and CI pinning.

Every per-package `package.json` is **shallow on purpose** — it has at most a name, version, type, exports, scripts pointing at the root tools, peer dep on emdash, and a couple of dev deps that the package genuinely owns. Build, lint, and test config are **not** per-package; they live at the root and are referenced. This is the deep-module test: the caller (a future implementer) needs to know "edit `src/`, run `pnpm test` at the root" and nothing more.

## Information Hiding

Each root-level config file encapsulates one cross-cutting decision:

1. **`pnpm-workspace.yaml`** hides the package-discovery glob and the `workspace:*` protocol convention. Future packages don't need to register anywhere else.
2. **`tsconfig.base.json`** hides every strict-mode flag, target, module resolution, and lib choice. Per-package `tsconfig.json` files extend it and only declare `references`, `include`, and `outDir`.
3. **`eslint.config.js`** hides the rule set, type-aware lint setup, and ignored-paths list. Per-package code never sees rule names directly.
4. **`vitest.config.ts`** hides project aggregation, coverage thresholds, and reporter wiring. Per-package tests just `import { describe, it, expect } from "vitest"`.
5. **`.changeset/config.json`** hides versioning mode and changelog wiring. Authors run `pnpm changeset` and never touch the config.
6. **`.github/workflows/ci.yml`** hides Node/pnpm version pinning, cache key strategy, and step ordering. Future CI features (e.g., turbo cache, AgentShield) extend this file in one place.

This separation matters because **changing a strict-mode flag should not require touching seven `tsconfig.json` files**. Changing the lint rule set should not require seven ESLint configs. The cost of getting this wrong compounds over the lifetime of the monorepo.

## Design It Twice

### Approach A — Pure pnpm + tsc -b + ESLint flat + Vitest 4 projects + Changesets (CHOSEN)

A vanilla, mainstream stack. Each tool is the official current generation: pnpm 10.x for the workspace, `tsc -b` for typed builds via project references, ESLint 9 flat config, Vitest 4 with the `projects` field, Changesets in independent mode.

- **Pros.** Minimal moving parts. Every tool is the current official version, with stable docs and active maintenance. Project references give correct cross-package type checking out of the box. Vitest 4 projects are the supported aggregation form (workspace config is removed in v4, so adopting v4 means adopting projects). Changesets independent mode matches the package-cadence reality. CI is plain `pnpm -r <script>`. No bundler, no Turborepo, no Nx — fewer abstractions to leak.
- **Cons.** Builds are not cached across CI runs at this layer (no Turborepo remote cache). For seven small packages, this is fine; we can add Turbo later if build wall-time becomes a problem. `tsc -b` is slower than esbuild for emit, but at this scale (smoke tests + a few exports) the difference is sub-second.

### Approach B — pnpm + Turborepo + tsup + Vitest + Changesets

Same workspace, but Turborepo orchestrates `build`/`test`/`lint` with task caching, and `tsup` (esbuild-based) emits JS while `tsc --noEmit` handles types separately.

- **Pros.** Faster cold builds and CI caching once the cache fills. tsup emits ESM and CJS in one pass. Turbo's `--filter` syntax gives ergonomic per-package task runs.
- **Cons.** Two more tools to learn, document, and pin. Turborepo's caching adds correctness risk (a stale cache produces a green-but-wrong CI). tsup-emitted JS plus `tsc --noEmit` types means **two build pipelines** instead of one — easy to drift. At seven small packages this is over-engineering. Hard rule **#8 YAGNI** applies: we can adopt Turbo + tsup later in one localized change if the simple approach proves slow.

### Decision

**Approach A.** The deciding factor is YAGNI plus the value of having a green CI pipeline on day one with the smallest tool surface. Approach B is a future option, not a current requirement. We will measure CI wall-time after the scaffold lands and revisit if `pnpm -r build` exceeds two minutes on a clean cache.

## Dependency Direction

The arrow runs **outside-in**:

```text
Root config (tsconfig.base, eslint, vitest, changesets, CI workflow)
        │
        ▼
Per-package config (tsconfig.json, package.json scripts that proxy to root)
        │
        ▼
Per-package source (src/index.ts — placeholder export)
        │
        ▼
Per-package tests (src/index.test.ts — asserts the placeholder)
```

No package depends on another package's internals at scaffold time. The `workspace:*` protocol is wired in `package.json` only where a real cross-package import will exist later (e.g., `@dateline/core` will eventually depend on `@dateline/blocks`); at scaffold time, **no internal dependencies are declared** because none are needed by smoke tests. This avoids creating false coupling that would have to be unwound when real implementation begins.

EmDash is a **peer dependency**, not a direct one. The peer-dep range `^0.9.0` is set in every `packages/*/package.json` and the same range as a direct dep in `examples/reference-site/package.json`. The reference site is the only place that resolves an actual EmDash install.

## Risks / Mitigations

- **[Risk] Vitest 4 projects config syntax is new and easy to misconfigure.** → Pin `vitest@^4.1.5` (the version named in `openspec/config.yaml`); mirror the documented `defineConfig({ test: { projects: [...] } })` shape; verify by running `pnpm -r test` locally before opening the PR.
- **[Risk] ESLint flat config plus `@typescript-eslint` type-aware linting is slow on a fresh clone.** → Constrain `parserOptions.project` to a `tsconfig.eslint.json` that includes only source and tests, not generated `dist/`. Cache ESLint results in CI (`ESLINT_USE_FLAT_CONFIG=true` and `--cache`).
- **[Risk] Project references with `composite: true` block file emits unless every dep has built first.** → Root `pnpm -r build` runs `tsc -b` from the root `tsconfig.json` so dependency order is computed for us. Smoke-test packages have **no inter-package imports** at scaffold time, so the order is trivial.
- **[Risk] Changesets independent mode is forgiving but the GitHub changelog plugin requires a token.** → Document the `GITHUB_TOKEN` requirement in `release` script comments and CI workflow; do **not** run `changeset publish` from PR CI — only from a release workflow added in a follow-up change.
- **[Risk] EmDash `^0.9.0` peer-dep is incorrect once PRO-402 lands.** → Centralize the range string as a comment-pinned literal in every `package.json`; the rollback is a single sed across `packages/*/package.json`. Smoke tests do not import EmDash so no test changes are required when the range moves.
- **[Risk] CI silently green because smoke tests are too trivial.** → Each smoke test asserts a non-trivial string equality (the package name) and the test file path is verified by Vitest's reporter. CI also runs `pnpm -r typecheck` and `pnpm -r lint` so the test pass alone cannot mask compile or lint regressions.
- **[Risk] `.factory-state` directory is local-agent state that must not leak.** → Listed in `.gitignore` alongside `node_modules`, `dist`, and `.wrangler` per the acceptance criteria.
- **[Risk] Reference site Astro setup is heavy and the smoke test pattern doesn't fit.** → At scaffold time, `examples/reference-site` is a plain TypeScript package with `package.json` declaring `astro` as a dep but **no Astro pages**. The smoke test asserts the package name. Astro page scaffolding is deferred to a `@dateline/views` consumption change once `views` has real components.
- **[Risk] PRO-401 ships before PRO-402 EmDash 0.9.0 findings are confirmed.** → The peer-dep range is the single decision pinned to `^0.9.0`. Every other piece of scaffolding is independent of EmDash internals. If PRO-402 forces a shift, we update one literal string in seven `package.json` files plus the reference-site dep — no code change required.

## Migration Plan

There is nothing to migrate from — the repo previously had no packages. The "migration" is the rollout itself:

1. Land this change. CI green on the scaffold is the success signal.
2. Future per-plugin changes (`@dateline/core`, `@dateline/rsvp`, etc.) replace each package's `src/index.ts` placeholder with real code, add real tests, and update the `package.json` for any added runtime deps. They do **not** edit root config files unless the change explicitly requires it.
3. The first publishable release happens once at least one package has shipping code; until then `changeset publish` is not invoked.

If we need to **abandon** the scaffold (unlikely), the rollback is a single revert of this change. No external system has been touched.

## Open Questions

1. **Should `@dateline/views` use Astro 6.1 or stay TypeScript-only at scaffold time?** Current decision: TypeScript-only at scaffold (the package re-exports a name string and nothing else). Astro integration lands in the `@dateline/views` implementation change. Reasoning: scaffolding Astro pulls in @astrojs/cloudflare, content collections, and a `dev` server — all out of scope here.
2. **Do we generate Changesets release PRs from CI on day one?** Current decision: No. The `.github/workflows/ci.yml` runs install/typecheck/lint/build/test only. A separate `release.yml` workflow (Changesets action) is deferred until at least one package has real shipping code. Acceptance criteria asks only for "GitHub Actions CI on PR".
3. **Should we adopt Turborepo?** Decided: No (see Approach B). Revisit only if `pnpm -r build` wall-time on CI exceeds two minutes after several packages have real code.
4. **Should the `peerDependencies: { emdash }` be `peerDependenciesMeta: { optional: true }`?** Current decision: No, EmDash is required for every plugin runtime. Optional makes peer-dep warnings vanish but masks real install bugs. Revisit only if PRO-402 documents a use case where a Dateline package can run without EmDash.
5. **Where does `@dateline/blocks` live in the dependency graph?** Current decision: it is a workspace package like the rest, and at scaffold time has no consumers (no `workspace:*` link in any other package's `dependencies`). The `@dateline/core` implementation change will add the link when it actually needs the builders.

## Sequence Diagram — Scaffold-Verification CI Run

```text
GitHub PR                Actions runner               pnpm/tsc/eslint/vitest        Workspace
    |                          |                              |                          |
    |--- open PR ------------->|                              |                          |
    |                          |--- checkout ---------------->|                          |
    |                          |--- setup-node + pnpm ------->|                          |
    |                          |--- pnpm install --frozen --->|                          |
    |                          |                              |--- read workspace.yaml ->|
    |                          |                              |<-- 7 packages -----------|
    |                          |                              |--- link node_modules --->|
    |                          |--- pnpm -r typecheck ------->|                          |
    |                          |                              |--- tsc -b across refs -->|
    |                          |                              |<-- 0 errors -------------|
    |                          |--- pnpm -r lint ------------>|                          |
    |                          |                              |--- eslint flat ----------|
    |                          |                              |<-- 0 errors -------------|
    |                          |--- pnpm -r build ----------->|                          |
    |                          |                              |--- tsc -b emit dist ---->|
    |                          |                              |<-- 7 dist/ trees --------|
    |                          |--- pnpm -r test ------------>|                          |
    |                          |                              |--- vitest projects ----->|
    |                          |                              |<-- 7 passing tests ------|
    |<-- check passes ---------|                              |                          |
```

The pipeline is entirely synchronous and entirely root-driven. Per-package work happens because the root scripts fan out (`-r`), not because any package owns its own pipeline.
