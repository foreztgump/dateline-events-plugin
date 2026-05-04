# Git Workflow Rules

## Branches

- Feature branches: `feature/lin-XXX-short-description`
- Bug fixes: `fix/lin-XXX-short-description`
- Never commit directly to `main` / `master` / `develop` / `release` (pre-execute-protected-branch.sh hook enforces)
- One concern per branch — don't bundle unrelated changes

## Commits

- Conventional commits: `type(scope): description [LIN-XXX]`
- Types: feat | fix | docs | chore | refactor | test | perf | style | build | ci
- Subject ≤72 chars, imperative mood ("add X" not "added X")
- Body explains WHY, not WHAT (the diff shows what)

## PRs

- Title mirrors the canonical commit subject
- Body includes: summary (3-5 bullets), test plan (checklist), risk callouts
- Auto-detect base branch via `gh repo view --json defaultBranchRef.name`
- Squash-merge default; rebase only when preserving feature-branch history matters
- Delete remote branch on merge

## Worktrees (per /work)

- Worktree path: `<repo>/../<repo>-<change-name>`
- All implementation happens inside the worktree
- Pre-implementation commit captured as `$PRE_IMPL_COMMIT` for diff base
- Worktree state at `<worktree>/.factory-state/` is project-gitignored

## Pre-merge gate

- pre-execute-merge-gate.sh hook is fail-closed and validates:
  - WRAP_UP.md `## PR Review Triage` section non-empty
  - `.factory-state/merge-approved` marker exists with matching pr_number
  - Auto-approve markers re-validate audit fields against live state (defense-in-depth)
  - PR base = repo default branch
  - Reviewer status checks terminal per risk tier
- Auto-mode and non-Claude models cannot bypass this hook
