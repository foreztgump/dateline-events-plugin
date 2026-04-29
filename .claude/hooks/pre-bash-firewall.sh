#!/usr/bin/env bash
# pre-bash-firewall.sh — Block destructive bash commands before execution
# Hook: PreToolUse | Matcher: Bash
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)

set -uo pipefail

if ! command -v jq &>/dev/null; then
  echo "WARNING: jq not found, hook skipped" >&2
  exit 0
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Normalize: collapse whitespace, lowercase for case-insensitive matching
NORMALIZED=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ')

# --- Destructive git operations ---
# Block --force and -f but allow safe variants (--force-with-lease, --force-if-includes)
if echo "$NORMALIZED" | grep -qE 'git\s+push\s+.*(-f\b|--force\b)' && \
   ! echo "$NORMALIZED" | grep -qE -- '--force-with-lease|--force-if-includes'; then
  echo "BLOCKED: git push --force is destructive and can overwrite remote history. Use --force-with-lease or a normal push instead." >&2
  exit 2
fi

if echo "$NORMALIZED" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard discards all uncommitted changes permanently. Use git stash or git reset --soft instead." >&2
  exit 2
fi

# --- Catastrophic file deletion ---
# Block rm -rf targeting root, home, or root glob
if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/(\s|$)|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/(\s|$)'; then
  echo "BLOCKED: rm -rf / would destroy the entire filesystem." >&2
  exit 2
fi

if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/\*|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/\*'; then
  echo "BLOCKED: rm -rf /* would destroy the entire filesystem via glob expansion." >&2
  exit 2
fi

if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+~/?\s*$|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+~/?\s*$'; then
  echo "BLOCKED: rm -rf ~ would destroy the entire home directory." >&2
  exit 2
fi

if echo "$NORMALIZED" | grep -qE -- '--no-preserve-root'; then
  echo "BLOCKED: --no-preserve-root disables the safety check against deleting /." >&2
  exit 2
fi

# --- SQL destruction ---
if echo "$NORMALIZED" | grep -qE 'drop\s+(table|database)\s'; then
  echo "BLOCKED: DROP TABLE/DATABASE is destructive and irreversible. Use a migration instead." >&2
  exit 2
fi

# --- Dangerous permissions ---
if echo "$NORMALIZED" | grep -qE 'chmod\s+777\s'; then
  echo "BLOCKED: chmod 777 makes files world-writable. Use specific permissions (e.g., 755, 644)." >&2
  exit 2
fi

# --- Device write (redirect and dd) ---
if echo "$NORMALIZED" | grep -qE '>\s*/dev/(sd|hd|vd|nvme|xvd)'; then
  echo "BLOCKED: Writing directly to block devices can destroy disk data." >&2
  exit 2
fi

if echo "$NORMALIZED" | grep -qE 'dd\s+.*of=/dev/(sd|hd|vd|nvme|xvd)'; then
  echo "BLOCKED: dd to block device can destroy disk data." >&2
  exit 2
fi

exit 0
