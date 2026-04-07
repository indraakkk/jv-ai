#!/usr/bin/env bash
# Hook: Guard session end — ensure handoff notes for active tasks
# Stop hook

set -euo pipefail

INPUT=$(cat)

MANIFEST="$CLAUDE_PROJECT_DIR/.data/manifest.yaml"

# No manifest — allow
[[ ! -f "$MANIFEST" ]] && exit 0

# Check if there's an active task (non-null description)
TASK_DESC=$(grep -A1 'current_task:' "$MANIFEST" | grep 'description:' | sed 's/.*description:\s*//' | sed 's/^null$//')

# No active task — allow
[[ -z "$TASK_DESC" ]] && exit 0

# Check for incomplete phases
INCOMPLETE=$(grep -E 'status:\s*(pending|in_progress)' "$MANIFEST" | head -1 || true)

if [[ -n "$INCOMPLETE" ]]; then
  # Check if handoff notes exist
  HANDOFF=$(grep 'handoff_notes:' "$MANIFEST" | sed 's/.*handoff_notes:\s*//' | sed 's/^null$//')

  if [[ -z "$HANDOFF" ]]; then
    cat >&2 <<EOF
BLOCKED: Active task has incomplete phases. Write handoff notes in .data/manifest.yaml before ending.

Active task: $TASK_DESC
Incomplete phases found. Update session_context.handoff_notes with:
  - What was accomplished
  - What remains
  - Any blockers or context needed
EOF
    exit 2
  fi
fi

exit 0
