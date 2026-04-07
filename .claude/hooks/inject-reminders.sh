#!/usr/bin/env bash
# Hook: Inject context reminders on user prompt (UserPromptSubmit)
# Always exits 0 — informational only, never blocks

set -euo pipefail

INPUT=$(cat)

MANIFEST="$CLAUDE_PROJECT_DIR/.data/manifest.yaml"

if [[ -f "$MANIFEST" ]]; then
  # Extract current task description
  TASK_DESC=$(grep 'description:' "$MANIFEST" | head -1 | sed 's/.*description:\s*//' | sed 's/^"//;s/"$//' | sed 's/^null$//')

  if [[ -n "$TASK_DESC" ]]; then
    # Extract task type and domains
    TASK_TYPE=$(grep 'type:' "$MANIFEST" | head -1 | sed 's/.*type:\s*//' | sed 's/#.*//' | xargs)
    CURRENT_PHASE=$(grep 'current_phase:' "$MANIFEST" | sed 's/.*current_phase:\s*//' | xargs)
    COMPLETED=$(grep 'completed_phases:' "$MANIFEST" | sed 's/.*completed_phases:\s*//' | xargs)

    # Build reminder
    echo "Active task: $TASK_DESC"
    [[ -n "$TASK_TYPE" && "$TASK_TYPE" != "null" ]] && echo "Type: $TASK_TYPE | Phase: ${CURRENT_PHASE:-unknown} | Done: ${COMPLETED:-none}"

    # Remind about post-implementation verification
    if [[ -n "$CURRENT_PHASE" ]]; then
      PHASE_NUM=$(echo "$CURRENT_PHASE" | tr -dc '0-9')
      if [[ -n "$PHASE_NUM" && "$PHASE_NUM" -eq 8 ]]; then
        echo "REMINDER: After implementation, continue to verification phases 9-16."
      fi
    fi
  fi
fi

# Gateway protocol reminder
echo "Route domain work via gateway-ts/nix/cross skill when available."

exit 0
