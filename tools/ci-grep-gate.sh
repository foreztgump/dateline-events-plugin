#!/usr/bin/env bash
set -euo pipefail

GATE_PATTERN='emdash\.config\.ts|EMDASH_PLUGIN_MANIFEST|atomicIncrement|atomicDecrement|createCorePlugin'

GATED_SCOPES=(
  "packages/*/src"
  "packages/*/emdash-plugin.jsonc"
  "docs"
  "README.md"
  "examples/reference-site/src"
  "examples/reference-site/wrangler.jsonc"
)

EXCLUDED_GLOBS=(
  "research/**"
  "openspec/**"
  "MIGRATION.md"
  "CHANGELOG*"
  "PRD*"
  "VERIFIED-PLATFORM-0.18.md"
  "**/dist/**"
  "**/node_modules/**"
)

repo_root="${CI_GREP_GATE_ROOT:-}"
if [[ -z "$repo_root" ]]; then
  repo_root="$(git rev-parse --show-toplevel)"
fi

cd "$repo_root"

existing_scopes=()
for scope in "${GATED_SCOPES[@]}"; do
  if [[ -e "$scope" ]]; then
    existing_scopes+=("$scope")
    continue
  fi

  while IFS= read -r match; do
    existing_scopes+=("$match")
  done < <(compgen -G "$scope" || true)
done

if ((${#existing_scopes[@]} == 0)); then
  echo "No grep-gate scopes exist under $repo_root"
  exit 0
fi

rg_args=(-n --color=never "$GATE_PATTERN")
for excluded_glob in "${EXCLUDED_GLOBS[@]}"; do
  rg_args+=(--glob "!$excluded_glob")
done

set +e
rg "${rg_args[@]}" "${existing_scopes[@]}"
status=$?
set -e

case "$status" in
  0)
    echo "::error::EmDash 0.18 grep gate found banned pre-modernization terms."
    exit 1
    ;;
  1)
    echo "EmDash 0.18 grep gate passed."
    exit 0
    ;;
  *)
    echo "::error::ripgrep failed while running EmDash 0.18 grep gate."
    exit "$status"
    ;;
esac
