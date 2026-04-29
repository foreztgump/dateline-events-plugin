#!/usr/bin/env bash
# pre-edit-worktree-boundary.sh — Block edits outside the active worktree
# Hook: PreToolUse | Matcher: Write|Edit|MultiEdit
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)
#
# When WORKTREE_PATH is set (by /work, /work-local, /fix flows), this hook
# ensures all file edits stay within the worktree boundary. When WORKTREE_PATH
# is unset, the hook is a no-op.

set -uo pipefail

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

# Check if file path is inside the worktree boundary
# Ensure trailing slash to prevent false positives with sibling directories
# (e.g., /home/user/project-other matching /home/user/project)
BOUNDARY_WITH_SLASH="${RESOLVED_BOUNDARY%/}/"
if [[ "$RESOLVED_PATH" != "$BOUNDARY_WITH_SLASH"* ]] && [[ "$RESOLVED_PATH" != "$RESOLVED_BOUNDARY" ]]; then
  echo "BLOCKED: Edit to '${FILE_PATH}' is outside the worktree boundary (${WORKTREE_PATH}). All edits during /work and /fix flows must stay inside the worktree." >&2
  exit 2
fi

exit 0
