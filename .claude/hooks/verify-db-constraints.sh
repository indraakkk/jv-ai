#!/usr/bin/env bash
# Hook: Verify DB schema constraints
# PostToolUse for Edit/Write on schema.ts and migrations

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# Empty path — allow
[[ -z "$FILE_PATH" ]] && exit 0

# Only check schema files and migrations
if [[ ! "$FILE_PATH" =~ schema\.ts$ ]] && [[ ! "$FILE_PATH" =~ migrations/ ]]; then
  exit 0
fi

# File must exist
[[ ! -f "$FILE_PATH" ]] && exit 0

CONTENT=$(cat "$FILE_PATH")

# Check for file.id references missing onDelete: 'restrict'
# Pattern: .references(() => file.id) without onDelete: 'restrict' nearby
VIOLATIONS=""

# Look for references to file.id or seo.id
while IFS= read -r line_num; do
  [[ -z "$line_num" ]] && continue
  # Get the line and a few lines after it to check for onDelete
  CONTEXT=$(sed -n "${line_num},$((line_num + 3))p" "$FILE_PATH")
  if ! echo "$CONTEXT" | grep -q "onDelete.*restrict\|onDelete:.*'restrict'"; then
    LINE_CONTENT=$(sed -n "${line_num}p" "$FILE_PATH")
    VIOLATIONS="${VIOLATIONS}\n  Line $line_num: $LINE_CONTENT"
  fi
done < <(grep -nE '\.references\(\s*\(\)\s*=>\s*(file|seo)\.id' "$FILE_PATH" | cut -d: -f1)

if [[ -n "$VIOLATIONS" ]]; then
  cat >&2 <<EOF
BLOCKED: All file.id and seo.id references must include { onDelete: 'restrict' }

Violations found in $FILE_PATH:
$(echo -e "$VIOLATIONS")

Fix: Add { onDelete: 'restrict' } to each .references() call.
Example: .references(() => file.id, { onDelete: 'restrict' })
EOF
  exit 2
fi

exit 0
