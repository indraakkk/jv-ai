#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source project configuration
CONFIG_FILE="$SCRIPT_DIR/project.config.sh"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: project.config.sh not found. Copy project.config.sh.example and edit it."
  exit 1
fi

# shellcheck source=project.config.sh
source "$CONFIG_FILE"

# Validate required variables
REQUIRED_VARS=(
  PROJECT_NAME
  WORKSPACE_SCOPE
  RUNTIME
  TEST_COMMAND
  TYPECHECK_COMMAND
  NIX_EVAL_COMMAND
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: The following required variables are not set in project.config.sh:"
  for var in "${MISSING[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo "=== Claude Orchestration Template Setup ==="
echo ""
echo "Configuration:"
echo "  PROJECT_NAME:       $PROJECT_NAME"
echo "  WORKSPACE_SCOPE:    $WORKSPACE_SCOPE"
echo "  RUNTIME:            $RUNTIME"
echo "  TEST_COMMAND:       $TEST_COMMAND"
echo "  TYPECHECK_COMMAND:  $TYPECHECK_COMMAND"
echo "  NIX_EVAL_COMMAND:   $NIX_EVAL_COMMAND"
echo ""

# Replacement pairs: placeholder -> value
declare -a PLACEHOLDERS=(
  "{{SCOPE}}|$WORKSPACE_SCOPE"
  "{{PROJECT}}|$PROJECT_NAME"
  "{{RUNTIME}}|$RUNTIME"
  "{{TEST_COMMAND}}|$TEST_COMMAND"
  "{{TYPECHECK_COMMAND}}|$TYPECHECK_COMMAND"
  "{{NIX_EVAL_COMMAND}}|$NIX_EVAL_COMMAND"
)

# Directories and files to process
TARGET_DIRS=(
  "$SCRIPT_DIR/.claude"
  "$SCRIPT_DIR/.serena"
)
TARGET_FILES=(
  "$SCRIPT_DIR/CLAUDE.md.template"
)

# Perform replacements using find + sed (macOS compatible)
replace_in_file() {
  local file="$1"
  for pair in "${PLACEHOLDERS[@]}"; do
    local placeholder="${pair%%|*}"
    local value="${pair#*|}"
    # Escape special sed characters in value
    local escaped_value
    escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
    local escaped_placeholder
    escaped_placeholder=$(printf '%s\n' "$placeholder" | sed 's/[{}]/\\&/g')
    sed -i '' "s/${escaped_placeholder}/${escaped_value}/g" "$file"
  done
}

FILE_COUNT=0

# Process directories
for dir in "${TARGET_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    while IFS= read -r -d '' file; do
      replace_in_file "$file"
      FILE_COUNT=$((FILE_COUNT + 1))
    done < <(find "$dir" -type f -print0)
  fi
done

# Process individual files
for file in "${TARGET_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    replace_in_file "$file"
    FILE_COUNT=$((FILE_COUNT + 1))
  fi
done

# Rename CLAUDE.md.template to CLAUDE.md
if [[ -f "$SCRIPT_DIR/CLAUDE.md.template" ]]; then
  mv "$SCRIPT_DIR/CLAUDE.md.template" "$SCRIPT_DIR/CLAUDE.md"
  echo "Renamed CLAUDE.md.template -> CLAUDE.md"
else
  echo "WARNING: CLAUDE.md.template not found, skipping rename"
fi

# Make hook scripts executable
if [[ -d "$SCRIPT_DIR/.claude/hooks" ]]; then
  find "$SCRIPT_DIR/.claude/hooks" -name "*.sh" -exec chmod +x {} \;
  echo "Made all .claude/hooks/*.sh scripts executable"
fi

# Create .data/ directory if it doesn't exist
if [[ ! -d "$SCRIPT_DIR/.data" ]]; then
  mkdir -p "$SCRIPT_DIR/.data"
  touch "$SCRIPT_DIR/.data/.gitkeep"
  echo "Created .data/ directory"
else
  echo ".data/ directory already exists"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Processed $FILE_COUNT files with placeholder replacements."
echo ""
echo "IMPORTANT: Please review the following files for any remaining"
echo "project-specific customization needed:"
echo ""
echo "  1. CLAUDE.md"
echo "     - Architecture section: update directory layout to match your project"
echo "     - Commands section: update dev/build/deploy commands"
echo "     - Database/Drizzle rules: remove if not using Drizzle ORM"
echo ""
echo "  2. .claude/settings.json"
echo "     - permissions.allow: add/remove Bash permissions for your tools"
echo "     - WebFetch domains: add documentation sites relevant to your stack"
echo "     - hooks: review and disable any hooks not applicable to your project"
echo ""
echo "  3. .serena/project.yml"
echo "     - Update source roots and project description"
echo ""
echo "  4. mcp.json"
echo "     - Update MCP server paths for your environment"
echo ""
