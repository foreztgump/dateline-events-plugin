#!/usr/bin/env bash
# pre-edit-secrets.sh — Detect hardcoded secrets in file edits
# Hook: PreToolUse | Matcher: Write|Edit|MultiEdit
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude)

set -uo pipefail

if ! command -v jq >/dev/null; then
  echo "WARNING: jq not found, hook skipped" >&2
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Build a list of (file_path, content) pairs to check
declare -a FILE_PATHS=()
declare -a CONTENTS=()

if [[ "$TOOL_NAME" == "Write" ]]; then
  FILE_PATHS+=("$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)")
  CONTENTS+=("$(echo "$INPUT" | jq -r '.tool_input.content // empty' 2>/dev/null)")
elif [[ "$TOOL_NAME" == "Edit" ]]; then
  FILE_PATHS+=("$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)")
  CONTENTS+=("$(echo "$INPUT" | jq -r '.tool_input.new_string // empty' 2>/dev/null)")
elif [[ "$TOOL_NAME" == "MultiEdit" ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
  EDIT_COUNT=$(echo "$INPUT" | jq '.tool_input.edits | length // 0' 2>/dev/null) || EDIT_COUNT=0
  for ((i=0; i<EDIT_COUNT; i++)); do
    FILE_PATHS+=("$FILE_PATH")
    CONTENTS+=("$(echo "$INPUT" | jq -r ".tool_input.edits[$i].new_string // empty" 2>/dev/null)")
  done
else
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
      echo "BLOCKED: Detected potential ${DESCRIPTION} (pattern: ${PATTERN}...) in ${FILE_PATH}. Use environment variables instead of hardcoding secrets." >&2
      exit 2
    fi
  done

  # Check for private key blocks
  if echo "$CONTENT" | grep -qE -- '-----BEGIN[[:space:]]+(RSA|DSA|EC|OPENSSH|PGP)?[[:space:]]*PRIVATE KEY-----'; then
    echo "BLOCKED: Detected private key material in ${FILE_PATH}. Never commit private keys — use a secrets manager or environment variable." >&2
    exit 2
  fi
done

exit 0
