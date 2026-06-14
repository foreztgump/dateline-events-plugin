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
- [ ] Commit, push, open PR, PR-agent review.

## Irreversible (human-gated, post-review)

- [ ] Secret-scan git history before making the repo public.
- [ ] Make the repo public.
- [ ] Publish 0.3.0 locally: `pnpm -r publish --access public` (no provenance — first publish).
- [ ] Verify `npm view @dateline/<pkg>` resolves for all six (no E404).
- [ ] Verify a fresh `npm add @dateline/core` pulls a tarball whose dist/ matches the build.
- [ ] Configure trusted publishing on npmjs.com for all six packages (provenance auto from 0.3.1).
- [ ] Update Linear PRO-885 + PRO-887 to Done; close M1 publish/automation acceptance.
