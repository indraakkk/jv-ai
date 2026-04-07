#!/usr/bin/env bash
# Hook: Context budget enforcement before agent spawning
# PreToolUse for Task tool (agent spawning)

set -euo pipefail

INPUT=$(cat)

MANIFEST="$CLAUDE_PROJECT_DIR/.data/manifest.yaml"

# No manifest — allow
[[ ! -f "$MANIFEST" ]] && exit 0

# Check context usage from manifest
CONTEXT_USAGE=$(grep 'context_usage_percent:' "$MANIFEST" | sed 's/.*context_usage_percent:\s*//' | xargs)

# Default to 0 if not set
[[ -z "$CONTEXT_USAGE" ]] && CONTEXT_USAGE=0

# Remove any non-numeric chars
CONTEXT_USAGE=$(echo "$CONTEXT_USAGE" | tr -dc '0-9')
[[ -z "$CONTEXT_USAGE" ]] && CONTEXT_USAGE=0

if [[ "$CONTEXT_USAGE" -gt 85 ]]; then
  cat >&2 <<EOF
BLOCKED: Context at ${CONTEXT_USAGE}% usage. Must compact before spawning agents.

High context usage risks losing important information. Compact first:
  1. Write handoff notes to .data/manifest.yaml
  2. Summarize key findings
  3. Then spawn the agent
EOF
  exit 2
fi

if [[ "$CONTEXT_USAGE" -gt 75 ]]; then
  echo "WARNING: Context at ${CONTEXT_USAGE}% usage. Consider compacting before spawning agents." >&2
fi

exit 0
