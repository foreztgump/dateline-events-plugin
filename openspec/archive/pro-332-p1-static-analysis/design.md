# Design: PRO-332 — P1 Static Analysis

## Context

This change is a research deliverable. The "module" being designed is the **methodology and output schema** that turns four GPL plugins into paraphrased reference docs. There is no runtime, no API, no package boundary in code — but module-design discipline still applies because the resulting corpus must be:

1. **Uniform** across all four plugins, so cross-plugin synthesis (Phase 5) can read it mechanically.
2. **Parallel-safe** to produce, because the four tasks are independent and fan out to subagents.
3. **Legally clean**, because GPL contamination is irreversible.
4. **Verifiable**, because a human reviewer must be able to check correctness without re-reading 80 PHP files.

## Module Depth — Prefer Deep Modules

The "module" here is the **per-plugin task contract**: a single instruction that hides complexity behind a simple interface.

- **Simple interface (the task definition):** "Analyze plugin `<slug>`. Produce four files in `research/analysis/<slug>/` matching the spec." Three inputs: plugin slug, source path, output path.
- **Complex implementation (what the analyst does):** running ripgrep across PHP files, classifying hooks vs filters vs REST routes, decoding postmeta semantics from call-site context, mining the `.pot` file for feature taxonomy, paraphrasing without leaking PHP — all hidden inside the task.

Caller (the parent agent) does not need to know how postmeta keys are extracted, only that the output table is exhaustive. This is the deep-module test: the interface is one paragraph; the implementation is hours of focused reading.

## Information Hiding

Each per-plugin task encapsulates four design decisions:

1. **What counts as "exhaustive."** A grep pass is the lower bound; a second sweep for indirect calls (e.g., `_action(`, `apply_filters_ref_array`) is the upper bound. The task hides this judgment from the caller.
2. **How identifiers are normalized in tables.** Hook names with dynamic suffixes (`evo_event_{$type}_meta`) are recorded with the suffix variable preserved. The task hides this convention from the caller.
3. **How i18n strings are bucketed into the feature taxonomy.** Grouping rules (UI / email / admin / errors) are the analyst's call. The task hides this taxonomy work from the caller.
4. **How paraphrase distance is enforced.** No PHP function bodies, no copy-pasted comments, identifiers OK as facts. The task hides the discipline; the spec encodes the rule.

Hiding these inside the task means the four tasks can run in parallel without coordination overhead.

## Design It Twice

### Approach A — Four parallel per-plugin tasks (CHOSEN)

One task per plugin. Each task fully owns one plugin and produces all four output docs for it. No cross-task dependencies.

- **Pros:** Maximum parallelism (4× wall-clock speedup if dispatched concurrently). Each task fits in one subagent's context window comfortably (each plugin is 13–30 PHP files). Failure of one task does not block others. Re-running a single plugin is trivial.
- **Cons:** Slight risk of inconsistent table conventions across plugins if subagents diverge in interpretation. Mitigated by writing the requirements precisely in the spec and giving every task an identical prompt structure.

### Approach B — Four sequential per-doc-type tasks

One task produces all four `00-overview.md`s, then one task produces all four `01-data-model.md`s, etc. Each task sees all four plugins through one analytical lens.

- **Pros:** Higher consistency within a doc type — the same analyst sees all four data models in one sitting and can normalize tables.
- **Cons:** Zero parallelism. Each task carries four plugins' worth of source code in its context, which strains attention and risks shallow analysis. A task failure blocks all four plugins for that doc. Wall-clock 4× slower.

### Decision

Approach A. The legal and time-budget constraints (under 50 hr for the full PRD; ~0.7 hr per P1 plugin) make parallelism the dominant factor. Consistency risk is manageable because the spec encodes the table format explicitly. The four plugins are also similar enough (all EventON add-ons) that conventions transfer naturally.

## Dependency Direction

- High-level abstraction (the spec, `specs/p1-plugin-research-corpus/spec.md`) defines what every output doc must contain.
- Lower-level concretes (the four per-plugin tasks in `tasks.md`) depend on that spec, not on each other.
- The PRD methodology (Phase 1 in `research/PRD.md`) is the upstream parent; this change implements one slice of it.
- Future Phase 5 synthesis docs depend on this corpus, not the other way around.

The arrow runs: **PRD → spec → tasks → output corpus → future synthesis docs**. No cycles.

## Risks / Mitigations

- **[Risk] GPL contamination via verbatim PHP** → Spec forbids it explicitly with a checked scenario. Reviewer runs `rg "function .*\(.*\) ?\{" research/analysis/` to spot any PHP-shaped block in output. Identifiers (hook names, postmeta keys) are explicitly allowed as facts.
- **[Risk] Task-to-task drift in table format** → All four tasks use the same prompt template and reference the same spec scenarios for required columns. Reviewer compares one column header at a time across the four `02-hooks.md` files.
- **[Risk] Shallow analysis from a single grep pass** → Spec requires ripgrep coverage AND explicit acknowledgment when a hook is excluded. The analyst must say "12 admin-notice hooks collapsed" instead of silently dropping them.
- **[Risk] Missing `.pot`/`.po` file** → Spec scenario allows the analyst to note the file's absence rather than fabricate a taxonomy. Skim `lang/` first; if empty, the i18n taxonomy section says so.
- **[Risk] Subagent invents postmeta keys not present in source** → Reviewer spot-checks one keyed table row by running `rg "update_post_meta.*<key>"` against the source. Fabricated keys produce zero hits and are flagged.
- **[Risk] Source files are gitignored, so the worktree analyst cannot see them** → Sources live in the main checkout (`/home/cownose/projects/Dateline/research/sources/`); each task explicitly references the absolute path. Output goes to the worktree.
- **[Risk] Inconsistent front-matter dates as the change spans days** → Spec pins `analyzed: 2026-04-30` for all four docs to lock the corpus to a single research session.
- **[Risk] Hook discovery misses dynamic hook names** → Spec scenario for hooks doc accepts dynamic suffixes (`{$type}`) recorded literally.

## Migration Plan

No migration. The change is purely additive markdown under `research/analysis/`. No code, schema, or runtime is altered. To "roll forward" downstream consumers:

1. Land this change.
2. Trigger Phase 5 synthesis only after manual review of all four directories.
3. The Events Plugin PRD's MVP/v0.2/v0.3 tier map cites these docs by `<plugin>/<doc-name>.md` paths.

## Open Questions

1. **Should i18n taxonomy stay inside `03-features.md` or get its own `03b-i18n-taxonomy.md`?** Current decision: stay inside `03-features.md` to match the PRD methodology in `PRD.md` Phase 1 step 6. Revisit if any plugin's taxonomy exceeds ~150 strings.
2. **How exhaustive must the hook table be — every dynamic suffix instance, or just the suffix template?** Current decision: record the template (e.g., `evo_event_meta_{$key}`) once with a note describing the suffix space. Re-evaluate if downstream synthesis needs the per-suffix granularity.
3. **Do we screenshot admin UIs in this Phase 1 P1 pass?** No — screenshots are Phase 2 deliverables per the PRD. This change is static analysis only.
4. **Is `eventon-rsvp-events-waitlist` (the directory name on disk) a P1 plugin?** No — that is `eventon-rsvp-waitlist` in the PRD source inventory and is P2. Out of scope for this change.

## Sequence Diagram — Per-plugin Task Execution

```
Caller (parent agent)              Subagent (impl-droid)             Source (read-only)        Output (worktree)
        |                                  |                                |                        |
        |--- spawn task (slug, paths) ---->|                                |                        |
        |                                  |--- ls source dir ------------->|                        |
        |                                  |<-- file census ---------------|                        |
        |                                  |--- rg hooks/data/REST -------->|                        |
        |                                  |<-- match list ----------------|                        |
        |                                  |--- read .pot/.po ------------->|                        |
        |                                  |<-- translatable strings ------|                        |
        |                                  |                                |                        |
        |                                  |--- write 00-overview.md ----------------------------->|
        |                                  |--- write 01-data-model.md ---------------------------->|
        |                                  |--- write 02-hooks.md --------------------------------->|
        |                                  |--- write 03-features.md ------------------------------>|
        |                                  |                                |                        |
        |<--- summary + file paths --------|                                |                        |
```

Four such pipelines run in parallel; no shared state between them.
