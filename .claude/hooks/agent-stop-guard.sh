#!/usr/bin/env bash
# Hook: Guard agent completion — ensure verification was run
# SubagentStop hook

set -euo pipefail

INPUT=$(cat)

# Extract agent output/transcript
AGENT_OUTPUT=$(echo "$INPUT" | jq -r '.output // .transcript // .result // empty')

# If no output available, allow (can't verify)
[[ -z "$AGENT_OUTPUT" ]] && exit 0

# Check if agent ran verification commands
HAS_TSC=$(echo "$AGENT_OUTPUT" | grep -c 'tsc --noEmit\|tsc.*--noEmit' || true)
HAS_NIX_EVAL=$(echo "$AGENT_OUTPUT" | grep -c 'nix eval\|nix flake check' || true)
HAS_BUN_TEST=$(echo "$AGENT_OUTPUT" | grep -c 'bun test' || true)

# At least one verification should have been run
if [[ "$HAS_TSC" -eq 0 ]] && [[ "$HAS_NIX_EVAL" -eq 0 ]] && [[ "$HAS_BUN_TEST" -eq 0 ]]; then
  cat >&2 <<'EOF'
BLOCKED: Agent must run verification before completing.

Run one of:
  rtk bunx tsc --noEmit       (TypeScript type checking)
  nix eval or nix flake check . --no-build  (Nix validation)
  rtk bun test                 (behavioral tests)

Agents should verify their work before completing.
EOF
  exit 2
fi

exit 0
