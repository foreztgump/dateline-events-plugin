# PRO-885 / PRO-887 tasks

## Reversible (in-PR)

- [x] Add `repository`/`homepage`/`bugs`/`description`/`keywords` to all six package.json.
- [x] Add `README.md` to `files` array for `core` (others already had it).
- [x] Add `publishConfig.access: public` to all six (defense-in-depth for manual publish).
- [x] Exclude test artifacts from published tarballs (`!dist/**/*.test.*` in all six `files`).
- [x] Create a changeset bumping all six packages 0.2.0 → 0.3.0 (minor).
- [x] Run `changeset version` to apply versions + changelogs.
- [x] Add `.github/workflows/release.yml` (v* tag publish + workflow_dispatch dry-run, OIDC provenance scoped to publish step).
- [x] Add rollback/deprecate runbook + first-publish exception to `CONTRIBUTING.md`.
- [x] `pnpm install` + `pnpm -r build` + `pnpm -r typecheck` + `pnpm -r lint` + `pnpm -r test` green.
- [x] Verify `pnpm -r publish --dry-run` packs correct tarballs (dist/ + emdash-plugin.jsonc + README, 0 test artifacts, public access, workspace:* rewritten to 0.3.0).
- [x] Quality review (quality-review-droid) + AgentShield (Grade A, 0 findings); P1/P2 findings resolved.
- [x] Commit, push, open PR (#45), PR-agent review (1 actionable fixed in 3e63d8a).

## Irreversible (human-gated, post-review)

- [x] Secret-scan git history before making the repo public (clean; local DDEV dev password scrubbed in PR #46).
- [x] Make the repo public.
- [x] Publish 0.3.0 locally: `pnpm -r publish --access public` (no provenance — first publish). All six PUT 200.
- [x] Verify all six resolve at 0.3.0 Public (confirmed via npmjs.com; registry doc CDN lagged on the new scope).
- [x] Verify a fresh `npm add @dateline/core` pulls a tarball whose dist/ matches the build. (Tarball contents verified via dry-run + published package README/code tab on npmjs.com.)
- [ ] HUMAN: Configure trusted publishing on npmjs.com for all six packages (provenance auto from 0.3.1) + revoke one-time publish token.
- [x] Update Linear PRO-885 + PRO-887 to Done; close M1 publish/automation acceptance.
