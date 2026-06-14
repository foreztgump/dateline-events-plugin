# Wrap-Up: PRO-885 + PRO-887 — npm publish + release automation (v0.3.0)

## Checklist
- [x] Quality review clean (quality-review-droid; P1/P2 resolved)
- [x] AgentShield clean (Grade A, 0 findings)
- [x] OpenSpec tasks marked
- [x] Docs updated (CONTRIBUTING.md release runbook; CHANGELOGs via changeset)
- [x] Committed and pushed
- [x] PR open: https://github.com/foreztgump/dateline-events-plugin/pull/45
- [x] Linear updated
- [x] agentmemory saved
- [ ] Repo made public (gated — irreversible)
- [ ] 0.3.0 published locally (gated — irreversible)
- [ ] npm view ×6 verified
- [ ] Trusted publishing configured (provenance from 0.3.1)
- [ ] PR merged
- [ ] OpenSpec archived
- [ ] Branch deleted: feature/pro-885-npm-publish-release
- [ ] Worktree removed

## PR Review Triage
**Reviewer:** PR-Agent local (model: openai/glm-5.1, low risk)
**Review path:** .factory-state/pr-agent-review-45.md
**Comments Posted:** 1 (top-level review guide)

- [Actionable] (PR-Agent) CONTRIBUTING.md:42-43 — Release example used `git tag v0.3.0`, contradicting the "0.3.1 and later" scope + first-publish warning — Fixed in 3e63d8a (changed example to v0.3.1 with explicit never-v0.3.0 note).
- [Resolved] (quality-review-droid) release.yml — job-wide NPM_CONFIG_PROVENANCE would fail first publish — Fixed: scoped to publish step.
- [Resolved] (quality-review-droid) CONTRIBUTING.md — missing first-publish exception — Fixed: added ⚠️ callout.
- [Resolved] (quality-review-droid) 6× package.json — missing publishConfig.access — Fixed: added to all six.

No security concerns identified (PR-Agent + AgentShield).

## Key facts for the irreversible steps (do NOT lose)
- Scope: `@dateline/*` kept; npm org `dateline` created (owner: networkreef). NO rename.
- Provenance needs PUBLIC repo + trusted publishing; cannot apply to a first-ever publish.
- Sequence: secret-scan → make repo public → `pnpm -r build` → `pnpm -r publish --access public` (local, 0.3.0, NO provenance) → verify `npm view @dateline/<pkg>` ×6 → configure trusted publishing per-package on npmjs.com → provenance auto from 0.3.1.
- npm is append-only after 72h — no unpublish. Publishing 0.3.0 is permanent.

## Follow-Up Items
- M1 remaining: PRO-884 (Cloudflare Paid deploy validation), PRO-886 (quickstart docs flip — depends on 885 published).
- Trusted-publishing config is a manual npmjs.com web step per package (6×).
