#!/usr/bin/env bash
# SessionStart hook for harness-stack.
# Injects the using-harness-stack meta-skill as additional context so
# every session begins with the lifecycle map and golden rules.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
SKILL_FILE="${PLUGIN_ROOT}/skills/using-harness-stack/SKILL.md"

if [ ! -f "$SKILL_FILE" ]; then
  exit 0
fi

CONTENT=$(cat "$SKILL_FILE")
WRAPPED=$(printf '<EXTREMELY_IMPORTANT>\nharness-stack loaded. Use the lifecycle map to pick the right hs-* skill.\n\n%s\n</EXTREMELY_IMPORTANT>' "$CONTENT")

if command -v jq >/dev/null 2>&1; then
  jq -n --arg ctx "$WRAPPED" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
else
  ESCAPED=$(printf '%s' "$WRAPPED" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
    | awk 'BEGIN{ORS="\\n"} {print}')
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$ESCAPED"
fi
