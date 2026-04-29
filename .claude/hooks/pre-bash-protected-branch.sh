#!/usr/bin/env bash
# pre-bash-protected-branch.sh — Block direct pushes to protected branches
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

# Check for git push anywhere in the command (handles compound commands with && or ;)
if ! echo "$COMMAND" | grep -qE 'git\s+push\b'; then
  exit 0
fi

PROTECTED_BRANCHES="^(main|master|develop|release/.*)$"

# Extract the git push portion from potentially compound commands
# Split on && || ; and check each sub-command
GIT_PUSH_CMD=$(echo "$COMMAND" | grep -oE 'git\s+push\s+[^;&|]+' | head -1)

if [[ -z "$GIT_PUSH_CMD" ]]; then
  exit 0
fi

# Extract target branch from git push variants:
#   git push origin main
#   git push origin HEAD:main
#   git push -u origin main
# Strip flags (-u, --set-upstream, --force, etc.) and find the branch argument
PUSH_ARGS=$(echo "$GIT_PUSH_CMD" | sed -E 's/^\s*git\s+push\s+//' | sed -E 's/\s*-[a-zA-Z]+\s*//g' | sed -E 's/\s*--[a-z-]+(=\S+)?\s*//g')

# After stripping flags, remaining format is: [remote] [refspec]
# refspec can be "branch" or "HEAD:branch" or "local:remote"
TARGET_BRANCH=""

# Check for HEAD:branch or local:remote format
if echo "$PUSH_ARGS" | grep -qE ':\S+'; then
  TARGET_BRANCH=$(echo "$PUSH_ARGS" | grep -oE ':\S+' | head -1 | sed 's/^://')
else
  # Second argument after remote name is the branch
  TARGET_BRANCH=$(echo "$PUSH_ARGS" | awk '{print $2}')
fi

# If we couldn't determine the branch, allow (don't block ambiguous commands)
if [[ -z "$TARGET_BRANCH" ]]; then
  exit 0
fi

if echo "$TARGET_BRANCH" | grep -qE "$PROTECTED_BRANCHES"; then
  echo "BLOCKED: Direct push to protected branch '${TARGET_BRANCH}' is not allowed. Push to a feature/* or fix/* branch and create a PR instead." >&2
  exit 2
fi

exit 0
