#!/usr/bin/env bash
# Hook: Block nix build and nix-instantiate commands
# Use nix eval instead (0.1-0.3s vs minutes)

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Empty command — allow
[[ -z "$COMMAND" ]] && exit 0

# Check for nix build (but allow --dry-run)
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)rtk\s+nix\s+build\b|(\s|^)nix\s+build\b'; then
  if ! echo "$COMMAND" | grep -q '\-\-dry-run'; then
    cat >&2 <<'EOF'
BLOCKED: Use nix eval instead (0.1-0.3s vs minutes). See CLAUDE.md guardrails.

  nix build is blocked. Use:
    nix eval (0.1-0.3s) or nix flake check . --no-build

  If you truly need nix build, use --dry-run to check first.
EOF
    exit 2
  fi
fi

# Check for nix-instantiate
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)rtk\s+nix-instantiate\b|(\s|^)nix-instantiate\b'; then
  cat >&2 <<'EOF'
BLOCKED: nix-instantiate is not allowed. Use nix eval instead (0.1-0.3s vs minutes).

  See CLAUDE.md guardrails.
EOF
  exit 2
fi

exit 0
