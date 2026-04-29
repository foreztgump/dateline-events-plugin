#!/usr/bin/env bash
# pre-edit-secrets.sh — Detect hardcoded secrets in file edits
# Hook: PreToolUse | Matcher: Edit|Create
# Exit 0 = always; emit JSON permissionDecision to block.

set -uo pipefail

emit_deny() {
  local reason="$1"
  printf '%s\n' "{\"hookSpecificOutput\":{\"permissionDecision\":\"deny\",\"permissionDecisionReason\":${reason}}}"
  exit 0
}

# Require Bash 4+ — the secret pattern table below uses an associative array,
# which is unsupported on macOS's default Bash 3.2. Fail closed instead of
# silently skipping enforcement.
if (( BASH_VERSINFO[0] < 4 )); then
  echo "ERROR: Bash 4+ required (you have ${BASH_VERSION}); denying Edit/Create for safety" >&2
  emit_deny '"Bash 4+ is required for the secret-detection hook. Install a newer bash (e.g., brew install bash) and ensure it is first on PATH."'
fi

if ! command -v jq &>/dev/null; then
  # Fail closed — the secret-blocking gate disappearing exactly when the
  # environment is misconfigured is worse than refusing to edit. Install jq.
  echo "ERROR: jq not found; denying Edit/Create for safety" >&2
  emit_deny '"jq is required for the secret-detection hook; edit denied for safety. Install jq and retry."'
fi

INPUT=$(cat)

# Build a list of (file_path, content) pairs to check.
# Factory uses "Create" and "Edit" as matchers; the extractor inspects the
# generic .tool_input.content / .tool_input.new_string / edits[] regardless
# of the tool name, so we don't branch on it here.
declare -a FILE_PATHS=()
declare -a CONTENTS=()

collect_pair() {
  local path="$1" content="$2"
  if [[ -n "$path" || -n "$content" ]]; then
    FILE_PATHS+=("$path")
    CONTENTS+=("$content")
  fi
}

# Parse-guarded jq helper: returns jq output, or calls emit_deny on parse error.
# Relies on jq's exit status (0 ok, 1 ok-but-null, >=2 error).
jq_or_deny() {
  local expr="$1" out
  out=$(echo "$INPUT" | jq -r "$expr" 2>/dev/null)
  local rc=$?
  if (( rc >= 2 )); then
    emit_deny '"Malformed tool_input JSON received by secret-detection hook; edit denied for safety."'
  fi
  printf '%s' "$out"
}

extract_inputs() {
  local fp cn ns edit_count i
  fp=$(jq_or_deny '.tool_input.file_path // empty')
  cn=$(jq_or_deny '.tool_input.content // empty')
  ns=$(jq_or_deny '.tool_input.new_string // empty')
  # Use a zero fallback inside the jq expression so a missing .edits is 0, not an error.
  edit_count=$(jq_or_deny '(.tool_input.edits | length) // 0')
  # Normalize to a non-negative integer; anything else is a parse anomaly.
  if ! [[ "$edit_count" =~ ^[0-9]+$ ]]; then
    emit_deny '"Unable to determine edit count from tool_input; edit denied for safety."'
  fi

  [[ -n "$cn" ]] && collect_pair "$fp" "$cn"
  [[ -n "$ns" ]] && collect_pair "$fp" "$ns"

  for ((i=0; i<edit_count; i++)); do
    local ec
    ec=$(jq_or_deny ".tool_input.edits[$i].new_string // empty")
    [[ -n "$ec" ]] && collect_pair "$fp" "$ec"
  done
}

extract_inputs

if [[ ${#FILE_PATHS[@]} -eq 0 ]]; then
  exit 0
fi

# Secret patterns: prefix → description
declare -A SECRET_PATTERNS=(
  ["sk-ant-"]="Anthropic API key"
  ["sk-proj-"]="OpenAI API key"
  ["AKIA"]="AWS Access Key ID"
  ["ghp_"]="GitHub personal access token"
  ["gho_"]="GitHub OAuth token"
  ["github_pat_"]="GitHub fine-grained PAT"
  ["glpat-"]="GitLab personal access token"
  ["xoxb-"]="Slack bot token"
  ["xoxp-"]="Slack user token"
  ["AIza"]="Google API key"
)

for idx in "${!FILE_PATHS[@]}"; do
  FILE_PATH="${FILE_PATHS[$idx]}"
  CONTENT="${CONTENTS[$idx]}"

  # Skip .env.example files (template values, not real secrets)
  if [[ "$FILE_PATH" == *".env.example"* ]] || [[ "$FILE_PATH" == *".env.sample"* ]] || [[ "$FILE_PATH" == *".env.template"* ]]; then
    continue
  fi

  if [[ -z "$CONTENT" ]]; then
    continue
  fi

  for PATTERN in "${!SECRET_PATTERNS[@]}"; do
    if echo "$CONTENT" | grep -qF "$PATTERN"; then
      DESCRIPTION="${SECRET_PATTERNS[$PATTERN]}"
      emit_deny "$(jq -Rn --arg m "Detected potential ${DESCRIPTION} (pattern: ${PATTERN}...) in ${FILE_PATH}. Use environment variables instead of hardcoding secrets." '$m')"
    fi
  done

  # Check for private key blocks
  if echo "$CONTENT" | grep -qE -- '-----BEGIN[[:space:]]+(RSA|DSA|EC|OPENSSH|PGP)?[[:space:]]*PRIVATE KEY-----'; then
    emit_deny "$(jq -Rn --arg m "Detected private key material in ${FILE_PATH}. Never commit private keys — use a secrets manager or environment variable." '$m')"
  fi
done

exit 0
