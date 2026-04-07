#!/usr/bin/env bash
# Hook: Warn about import order violations in TS/TSX files
# PostToolUse for Edit/Write — warning only, never blocks

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# Empty path — allow
[[ -z "$FILE_PATH" ]] && exit 0

# Only check TS/TSX files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# File must exist
[[ ! -f "$FILE_PATH" ]] && exit 0

# Extract import lines preserving order
IMPORTS=$(grep -nE '^import ' "$FILE_PATH" || true)
[[ -z "$IMPORTS" ]] && exit 0

# Classify each import into a category (0-4)
# 0=builtin, 1=external, 2=effect, 3=@jackson-ventures, 4=relative
PREV_CAT=-1
VIOLATION=false

while IFS= read -r line; do
  IMPORT_PATH=$(echo "$line" | grep -oE 'from\s+["\x27]([^"\x27]+)["\x27]' | sed "s/from\s*[\"']//;s/[\"']//g")
  [[ -z "$IMPORT_PATH" ]] && continue

  # Classify
  if [[ "$IMPORT_PATH" =~ ^\. ]]; then
    CAT=4  # relative
  elif [[ "$IMPORT_PATH" =~ ^@jackson-ventures/ ]]; then
    CAT=3  # workspace
  elif [[ "$IMPORT_PATH" =~ ^effect/ ]] || [[ "$IMPORT_PATH" == "effect" ]]; then
    CAT=2  # effect
  elif [[ "$IMPORT_PATH" =~ ^(node:|fs|path|crypto|os|url|util|http|https|stream|events|child_process|buffer|assert|querystring|readline|zlib|net|dns|tls|cluster|dgram|domain|module|punycode|string_decoder|timers|tty|v8|vm|worker_threads|perf_hooks|inspector)$ ]]; then
    CAT=0  # builtin
  else
    CAT=1  # external
  fi

  # Check ordering: category should not decrease (with gaps allowed)
  if [[ "$CAT" -lt "$PREV_CAT" ]]; then
    VIOLATION=true
    break
  fi

  PREV_CAT=$CAT
done <<< "$IMPORTS"

if [[ "$VIOLATION" == "true" ]]; then
  echo "WARNING: Import order should be: builtins -> external -> Effect -> @jackson-ventures/* -> relative" >&2
  echo "File: $FILE_PATH" >&2
fi

# Always allow — biome handles on commit
exit 0
