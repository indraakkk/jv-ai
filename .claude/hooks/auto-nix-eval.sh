#!/usr/bin/env bash
# Hook: Auto-run nix flake check after Nix file changes
# PostToolUse for Edit/Write on nix .nix files

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# Empty path — allow
[[ -z "$FILE_PATH" ]] && exit 0

# Only check relevant Nix files
if [[ ! "$FILE_PATH" =~ ^.*/nix/.*\.nix$ ]]; then
  exit 0
fi

# Run nix flake check to validate
echo "Running nix flake check to validate Nix changes..." >&2
CHECK_OUTPUT=$(nix flake check . --no-build 2>&1) || {
  cat >&2 <<EOF
BLOCKED: nix flake check failed after editing $FILE_PATH

Output:
$CHECK_OUTPUT

Fix the Nix expression before continuing.
EOF
  exit 2
}

echo "nix flake check passed" >&2
exit 0
