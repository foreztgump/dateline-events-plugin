#!/usr/bin/env bash
# pre-execute-firewall.sh — Block destructive shell commands before execution
# Hook: PreToolUse | Matcher: Execute
# Exit 0 = always; emit JSON permissionDecision to block.

set -uo pipefail

emit_deny() {
  local reason="$1"
  printf '%s\n' "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":${reason}}}"
  exit 0
}

# jq is required for parsing; fail closed if absent — destructive-command protection
# is security-relevant, so bypassing it silently is worse than refusing to run.
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq not found; denying Execute for safety" >&2
  emit_deny '"jq is required for pre-execute firewall checks; command denied for safety. Install jq and retry."'
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Normalize: collapse whitespace, lowercase for case-insensitive matching
NORMALIZED=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ')

check_destructive_git() {
  # Block --force and -f but allow safe variants (--force-with-lease, --force-if-includes)
  if echo "$NORMALIZED" | grep -qE 'git\s+push\s+.*(-f\b|--force\b)' && \
     ! echo "$NORMALIZED" | grep -qE -- '--force-with-lease|--force-if-includes'; then
    emit_deny "$(jq -Rn --arg m 'git push --force is destructive and can overwrite remote history. Use --force-with-lease or a normal push instead.' '$m')"
  fi

  if echo "$NORMALIZED" | grep -qE 'git\s+reset\s+--hard'; then
    emit_deny "$(jq -Rn --arg m 'git reset --hard discards all uncommitted changes permanently. Use git stash or git reset --soft instead.' '$m')"
  fi
}

check_file_deletion() {
  # Block rm -rf targeting root, home, or root glob
  if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/(\s|$)|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/(\s|$)'; then
    emit_deny "$(jq -Rn --arg m 'rm -rf / would destroy the entire filesystem.' '$m')"
  fi

  if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+/\*|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+/\*'; then
    emit_deny "$(jq -Rn --arg m 'rm -rf /* would destroy the entire filesystem via glob expansion.' '$m')"
  fi

  if echo "$NORMALIZED" | grep -qE 'rm\s+-[a-z]*r[a-z]*f[a-z]*\s+~/?\s*$|rm\s+-[a-z]*f[a-z]*r[a-z]*\s+~/?\s*$'; then
    emit_deny "$(jq -Rn --arg m 'rm -rf ~ would destroy the entire home directory.' '$m')"
  fi

  if echo "$NORMALIZED" | grep -qE -- '--no-preserve-root'; then
    emit_deny "$(jq -Rn --arg m '--no-preserve-root disables the safety check against deleting /.' '$m')"
  fi
}

check_sql_destruction() {
  if echo "$NORMALIZED" | grep -qE 'drop\s+(table|database)\s'; then
    emit_deny "$(jq -Rn --arg m 'DROP TABLE/DATABASE is destructive and irreversible. Use a migration instead.' '$m')"
  fi
}

check_dangerous_perms() {
  if echo "$NORMALIZED" | grep -qE 'chmod\s+777\s'; then
    emit_deny "$(jq -Rn --arg m 'chmod 777 makes files world-writable. Use specific permissions (e.g., 755, 644).' '$m')"
  fi
}

check_device_writes() {
  if echo "$NORMALIZED" | grep -qE '>\s*/dev/(sd|hd|vd|nvme|xvd)'; then
    emit_deny "$(jq -Rn --arg m 'Writing directly to block devices can destroy disk data.' '$m')"
  fi

  if echo "$NORMALIZED" | grep -qE 'dd\s+.*of=/dev/(sd|hd|vd|nvme|xvd)'; then
    emit_deny "$(jq -Rn --arg m 'dd to block device can destroy disk data.' '$m')"
  fi
}

check_destructive_git
check_file_deletion
check_sql_destruction
check_dangerous_perms
check_device_writes

exit 0
