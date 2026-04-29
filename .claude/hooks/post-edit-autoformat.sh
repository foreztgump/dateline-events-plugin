#!/usr/bin/env bash
# post-edit-autoformat.sh — Run detected formatter after file edits
# Hook: PostToolUse | Matcher: Write|Edit|MultiEdit
# PostToolUse hooks cannot block — this is advisory only.
# Output goes to stderr for verbose mode visibility.

set -uo pipefail

if ! command -v jq &>/dev/null; then
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Extract file path from tool input
FILE_PATH=""
if [[ "$TOOL_NAME" == "Write" ]] || [[ "$TOOL_NAME" == "Edit" ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
elif [[ "$TOOL_NAME" == "MultiEdit" ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
fi

if [[ -z "$FILE_PATH" ]] || [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

FILE_DIR=$(dirname "$FILE_PATH")
FILE_EXT="${FILE_PATH##*.}"

# --- Formatter detection and execution ---
# Check project root (walk up from file directory to find config)

detect_and_format() {
  local dir="$FILE_DIR"

  while [[ "$dir" != "/" ]]; do
    # Biome
    if [[ -f "$dir/biome.json" ]] || [[ -f "$dir/biome.jsonc" ]]; then
      if command -v npx &>/dev/null; then
        npx --yes biome format --write "$FILE_PATH" 2>/dev/null && return 0
      fi
    fi

    # Prettier
    if ls "$dir"/.prettierrc* 1>/dev/null 2>&1 || \
       ([ -f "$dir/package.json" ] && grep -q '"prettier"' "$dir/package.json" 2>/dev/null); then
      if command -v npx &>/dev/null; then
        npx --yes prettier --write "$FILE_PATH" 2>/dev/null && return 0
      fi
    fi

    # Rust (rustfmt)
    if [[ "$FILE_EXT" == "rs" ]]; then
      if command -v rustfmt &>/dev/null; then
        rustfmt "$FILE_PATH" 2>/dev/null && return 0
      fi
    fi

    # Python (ruff)
    if [[ "$FILE_EXT" == "py" ]]; then
      if [[ -f "$dir/pyproject.toml" ]] && grep -q 'ruff' "$dir/pyproject.toml" 2>/dev/null; then
        if command -v ruff &>/dev/null; then
          ruff format "$FILE_PATH" 2>/dev/null && return 0
        fi
      fi
    fi

    # C/C++ (clang-format)
    if [[ "$FILE_EXT" =~ ^(c|cpp|cc|cxx|h|hpp|hxx)$ ]]; then
      if [[ -f "$dir/.clang-format" ]]; then
        if command -v clang-format &>/dev/null; then
          clang-format -i "$FILE_PATH" 2>/dev/null && return 0
        fi
      fi
    fi

    # Go (gofmt)
    if [[ "$FILE_EXT" == "go" ]]; then
      if command -v gofmt &>/dev/null; then
        gofmt -w "$FILE_PATH" 2>/dev/null && return 0
      fi
    fi

    # C# (dotnet format)
    if [[ "$FILE_EXT" == "cs" ]]; then
      if [[ -f "$dir/.editorconfig" ]] && command -v dotnet &>/dev/null; then
        dotnet format whitespace --include "$FILE_PATH" 2>/dev/null && return 0
      fi
    fi

    dir=$(dirname "$dir")
  done

  return 1
}

detect_and_format || true
exit 0
