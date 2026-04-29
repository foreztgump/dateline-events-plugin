# Parallelization Plan — Dateline Research

> Companion to `research/PRD.md`. Maps the 22 Linear issues onto a parallel-execution schedule.
>
> Linear project: [Dateline — Events Plugin Research & Build](https://linear.app/projects-linear/project/dateline-events-plugin-research-and-build-28addf3c9185)

---

## Parallelism model

The work has **three independent dimensions** that compose a parallel schedule:

1. **Plugin axis** — 14 plugins, each can be analyzed independently after Phase 0.
2. **Phase axis** — once a plugin's static analysis (Phase 1) is done, its feature inventory (Phase 2), edge cases (Phase 3), and anti-patterns (Phase 4) all start without waiting for the other plugins.
3. **Synthesis stream** — `pricing-and-positioning.md` (P5.5) does not depend on any analysis doc; it can start on day 1 alongside Phase 0.

The bottleneck is the **two test sites**. Site A holds TEC Pro + Eventin Pro; Site B holds EventON + 12 add-ons. Two analysts can therefore work UI-bound phases in parallel without contention; a third blocks on UI access.

---

## Wave-by-wave schedule

### Wave 0 — Setup (sequential, blocking)
**One analyst, ~30 min.**

| Issue | Title |
|---|---|
| `PRO-317` | Phase 0 — Setup |

Nothing else can start until this is done.

### Wave 1 — Static analysis (highly parallel, no test-site contention)
**Up to 5 analysts in parallel — pure code reading + ripgrep, no UI involvement.**

| Issue | Title | Effort |
|---|---|---|
| `PRO-324` | P1.1 — TEC Pro static | 1.5 hr |
| `PRO-329` | P1.2 — Eventin Pro static | 1.5 hr |
| `PRO-327` | P1.3 — EventON static | 1.5 hr |
| `PRO-332` | P1.4 — P1 add-ons static (×4) | 3 hr |
| `PRO-331` | P1.5 — P2/P3 add-ons static (×7) | 2 hr |
| `PRO-334` | **P5.5 — pricing-and-positioning.md** (independent stream) | 1 hr |

All six can run simultaneously. **Wave 1 wall-clock = max of these = ~3 hr** (limited by P1.4).

### Wave 2 — Feature inventory (test-site bound, parallel by site)
**Two analysts max in parallel — one per test site.**

| Issue | Title | Site | Effort |
|---|---|---|---|
| `PRO-326` | P2.1 — TEC Pro UX | Site A | 2 hr |
| `PRO-330` | P2.2 — Eventin Pro UX | Site A | 2 hr |
| `PRO-333` | P2.3 — EventON UX | Site B | 2 hr |
| `PRO-325` | P2.4 — P1 add-ons UX (×4) | Site B | 4 hr |
| `PRO-328` | P2.5 — P2/P3 add-ons UX (×7) | Site B | 3.5 hr |

**Lane A (Site A):** PRO-326 → PRO-330 (sequential on same site, ~4 hr)
**Lane B (Site B):** PRO-333 → PRO-325 → PRO-328 (sequential on same site, ~9.5 hr)

**Wave 2 wall-clock = ~9.5 hr** (Lane B is the bottleneck).

> **Optimization:** if a third analyst is available, they cannot help on UI but CAN start Wave 3a (TEC edge cases) the moment PRO-326 finishes — see overlap below.

### Wave 3 — Edge cases & anti-patterns (per-plugin parallel after its Wave 2)
Each P0 plugin's Wave 3 work starts as soon as its Wave 2 sub-issue completes.

| Issue | Title | Site | Starts after | Effort |
|---|---|---|---|---|
| `PRO-341` | P3.1 — TEC edge cases | Site A | PRO-326 | 3 hr |
| `PRO-338` | P4.1 — TEC anti-patterns | Site A | PRO-326 | 1 hr |
| `PRO-344` | P3.2 — Eventin edge cases | Site A | PRO-330 | 3 hr |
| `PRO-337` | P4.2 — Eventin anti-patterns | Site A | PRO-330 | 1 hr |
| `PRO-335` | P3.3 — EventON edge cases | Site B | PRO-333 | 3 hr |
| `PRO-343` | P4.3 — EventON anti-patterns | Site B | PRO-333 | 1 hr |

Note: edge cases and anti-patterns for the same plugin share the same site, so they run sequentially per plugin but the three plugins' streams run in parallel.

### Wave 4 — Synthesis (depends on all analysis)
Synthesis docs run in their own DAG inside Phase 5:

```
                    ┌─ PRO-345 (data-model-convergence) ──┐
   All Phase 1 ─────┤                                     ├─→ PRO-340 (prd-inputs)
                    └─ PRO-342 (data-model-divergence) ─→─┤
                                                          │
                    ┌─ PRO-339 (feature-tier-map) ────────┤
   All Phase 2 ─────┤                                     │
                    └─ PRO-336 (ux-pattern-library) ──────┤
                                                          │
   Independent  ───── PRO-334 (pricing-and-positioning) ──┘
                      (already done in Wave 1)
```

**Parallel within Wave 4:**
- `PRO-345` (convergence) and `PRO-339` (feature-tier) and `PRO-336` (ux-patterns) can run in parallel — different inputs.
- `PRO-342` (divergence) waits on `PRO-345` (convergence is the precursor).
- `PRO-340` (prd-inputs) is the merge point — runs last.

**Wave 4 wall-clock = ~3.5 hr** if three analysts run convergence/feature-tier/ux-patterns in parallel; ~5 hr solo.

---

## Visualisation — critical path

```
Wave 0    Wave 1                  Wave 2                          Wave 3            Wave 4
PRO-317 ─→ PRO-324/-329/-327 ─→─ PRO-326 (Site A) ─→ PRO-330 ─→ PRO-344 + PRO-337 ─┐
        ─→ PRO-332/-331            ↘                                                ├─→ PRO-345/-339/-336 ─→ PRO-342 ─→ PRO-340
        ─→ PRO-334 (parallel)     PRO-333 (Site B) ─→ PRO-325 ─→ PRO-328            │
                                   ↘ PRO-335 + PRO-343 (parallel after PRO-333) ───┘
```

**Critical path** (with infinite analysts, only blocked by Site B serial Wave 2):

| Stage | Hours | Cumulative |
|---|---|---|
| Wave 0 | 0.5 | 0.5 |
| Wave 1 (max P1.4) | 3 | 3.5 |
| Wave 2 Lane B (PRO-333 → -325 → -328) | 9.5 | 13 |
| Wave 3 longest stream (PRO-335 = 3 hr after PRO-333) | overlaps Lane B | already in 13 |
| Wave 4 (PRO-345 → -342 → -340 ≈ 1.5 + 1 + 1) | 3.5 | 16.5 |

**Floor: ~16–17 hours of wall-clock with adequate parallelism, vs. PRD's ~42 hr serial estimate.**

Reality check: most teams realistically run with **1–2 analysts**, not 5. The realistic plan:

| Team size | Realistic wall-clock |
|---|---|
| 1 analyst (serial) | ~42 hr (PRD baseline) |
| 2 analysts (split P0/P1 + handle synthesis sequentially) | ~22–25 hr |
| 3 analysts (one per test site + one synthesis lead) | ~16–18 hr |

---

## Concrete recommendations

1. **Start `PRO-317` and `PRO-334` in parallel on day 1.** Pricing intel needs no test sites or analysis docs.
2. **Run all of Wave 1 in parallel.** It's pure ripgrep work — five SSH sessions or five tabs in your editor.
3. **Treat Lane B (Site B / EventON cluster) as the critical path.** Whoever owns Site B should not be juggling other tasks.
4. **For Phase 3 + Phase 4 of the same P0 plugin:** keep them on one analyst back-to-back. Same test fixtures, same mental model — context-switching costs more than the parallelism saves.
5. **Synthesis (Wave 4) is the highest-leverage stage.** Don't farm it out widely; one or two senior analysts who saw all the Phase 1/2 outputs will produce a tighter synthesis than a fragmented team.
6. **The DOD doc `prd-inputs.md` (PRO-340) is a single-author task.** It synthesizes the synthesizers — fragmented authorship will dilute it.

---

## Pitfalls to avoid

- **Don't parallelize Wave 4 across more than two people.** The synthesis quality comes from cross-doc pattern matching that one mind does best.
- **Don't start Wave 3 on a plugin before its Wave 2 is fully done.** Edge cases need the full feature mental model.
- **Don't let two analysts work the same test site.** WP DBs aren't meant for concurrent edits; you'll corrupt observation data.
- **Don't skip the GitHub-issues / Query-Monitor pass in Phase 4.** Anti-patterns are the most under-documented finding type and the most valuable for our own design.
