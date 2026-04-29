#!/usr/bin/env bash
# pre-edit-worktree-boundary.sh — Block edits outside the active worktree
# Hook: PreToolUse | Matcher: Edit|Create
# Exit 0 = always; emit JSON permissionDecision to block.
#
# When WORKTREE_PATH is set (by /work, /work-local, /fix flows), this hook
# ensures all file edits stay within the worktree boundary. When WORKTREE_PATH
# is unset, the hook is a no-op. WORKTREE_PATH is workflow-scoped, not
# Claude-Code-specific, so it is intentionally preserved across lanes.

set -uo pipefail

emit_deny() {
  local reason="$1"
  printf '%s\n' "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":${reason}}}"
  exit 0
}

# No boundary set — allow everything
if [[ -z "${WORKTREE_PATH:-}" ]]; then
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "WARNING: jq not found, hook skipped" >&2
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path for reliable comparison
RESOLVED_PATH=$(realpath -m "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
RESOLVED_BOUNDARY=$(realpath -m "$WORKTREE_PATH" 2>/dev/null || echo "$WORKTREE_PATH")

# Ensure trailing slash to prevent false positives with sibling directories
# (e.g., /home/user/project-other matching /home/user/project)
BOUNDARY_WITH_SLASH="${RESOLVED_BOUNDARY%/}/"
if [[ "$RESOLVED_PATH" != "$BOUNDARY_WITH_SLASH"* ]] && [[ "$RESOLVED_PATH" != "$RESOLVED_BOUNDARY" ]]; then
  emit_deny "$(jq -Rn --arg m "Edit to '${FILE_PATH}' is outside the worktree boundary (${WORKTREE_PATH}). All edits during /work and /fix flows must stay inside the worktree." '$m')"
fi

exit 0
