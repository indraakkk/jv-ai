#!/usr/bin/env bash
# Hook: Enforce rtk prefix on all Bash commands
# rtk passes through unchanged if no filter exists, so it's always safe.
#
# Handles compound commands: each segment in a ; && || chain is checked independently.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Empty command — allow
[[ -z "$COMMAND" ]] && exit 0

# Check if a single command segment is allowed
check_segment() {
  local seg="$1"

  # Trim leading/trailing whitespace
  seg="${seg#"${seg%%[![:space:]]*}"}"
  seg="${seg%"${seg##*[![:space:]]}"}"

  # Empty segment — allow
  [[ -z "$seg" ]] && return 0

  # Starts with rtk — allow
  [[ "$seg" =~ ^rtk[[:space:]] || "$seg" == "rtk" ]] && return 0

  # Extract first word
  local first_word="${seg%% *}"

  # Shell builtins and diagnostic commands — allow
  case "$first_word" in
    cd|export|source|.|set|unset|true|false|test|\[|eval|exec|trap|return|exit|shift|wait|read|declare|local|readonly|typeset|let|pushd|popd|dirs|shopt|ulimit|umask|hash|type|builtin|command|enable|help|times|alias|unalias|bind|complete|compgen|compopt|fc|history|jobs|bg|fg|disown|kill|suspend|coproc|select|if|then|else|elif|fi|case|for|do|while|until|break|continue|function|mkdir|chmod|cp|mv|rm|touch|cat|wc|tee|printf|echo|which|sleep|date|uname|whoami|id|basename|dirname|realpath|readlink|stat|file|env|head|tail|less|more|diff|sort|cut|tr|xargs|sed|awk|ls|find|grep|rg|jq|yq|curl|wget|ssh|scp|rsync|tar|zip|unzip|gzip|gunzip|ln|pwd|nl|seq|yes|column|fmt|fold|paste|comm|join|tput|stty|clear|reset)
      return 0 ;;
  esac

  # Variable assignment (FOO=bar cmd) — allow
  [[ "$seg" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] && return 0

  # Not allowed
  return 1
}

# Split command on compound operators (; && ||) and check each segment.
# Pipes are NOT split — only the first command in a pipe needs rtk
# (since rtk wraps the entire pipeline).
#
# Before splitting, neutralise quoted strings and heredocs so that
# operators inside them are not treated as separators.
sanitize_command() {
  local cmd="$1"
  # Remove heredoc bodies: <<'TAG' ... TAG  and  <<TAG ... TAG
  cmd=$(printf '%s' "$cmd" | perl -0777 -pe "s/<<-?'?(\w+)'?.*?\n\\1//gs")
  # Remove double-quoted strings (handling escaped quotes)
  cmd=$(printf '%s' "$cmd" | perl -pe 's/"([^"\\]|\\.)*"/"_"/g')
  # Remove single-quoted strings
  cmd=$(printf '%s' "$cmd" | perl -pe "s/'[^']*'/'_'/g")
  # Remove $(...) subshells (non-greedy, single level)
  cmd=$(printf '%s' "$cmd" | perl -pe 's/\$\([^)]*\)/$(_)/g')
  printf '%s' "$cmd"
}

SANITIZED=$(sanitize_command "$COMMAND")
FAILED_SEG=""
while IFS= read -r segment; do
  if ! check_segment "$segment"; then
    FAILED_SEG="$segment"
    break
  fi
done < <(printf '%s' "$SANITIZED" | sed 's/\s*&&\s*/\n/g; s/\s*||\s*/\n/g; s/;\s*/\n/g')

# All segments passed
[[ -z "$FAILED_SEG" ]] && exit 0

# Block with feedback
TRIMMED_SEG="${FAILED_SEG#"${FAILED_SEG%%[![:space:]]*}"}"
cat >&2 <<EOF
BLOCKED: Command must be prefixed with 'rtk'.

  Failing segment: $TRIMMED_SEG
  Fix: rtk $TRIMMED_SEG

rtk compresses output for 60-90% token savings. It passes through unchanged if no filter exists.
Even in chains: rtk git add && rtk git commit
EOF
exit 2
