#!/bin/bash

# Pretty formatter for streaming claude -p output
# Usage: ./scripts/claude-stream.sh "your prompt here"
# Example: ./scripts/claude-stream.sh "/fix-rollbar-error 453425925501"

if [ -z "$1" ]; then
  echo "Usage: $0 \"<prompt>\""
  echo "Example: $0 \"/fix-rollbar-error 453425925501\""
  echo "Example: $0 \"Explain the codebase structure\""
  exit 1
fi

PROMPT="$1"

echo "🚀 Running: claude -p \"$PROMPT\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

claude -p "$PROMPT" --settings .claude/settings.headless.json --output-format stream-json --verbose 2>&1 | \
  jq -r '
    if .type == "assistant" then
      (.message.content[] |
        if .type == "text" then "\n💬 \(.text)\n"
        elif .type == "tool_use" then "🔧 \(.name | split("(")[0]): \(.input.command // .input.file_path // .input.pattern // .input.description // (.input | tostring) | .[0:150])..."
        else empty end)
    elif .type == "user" then
      if .tool_use_result then
        if (.message.content[0].is_error // false) then "   ❌ \(.tool_use_result | tostring | gsub("\n"; " ") | .[0:150])..."
        else "   ✅ \(.tool_use_result | if type == "object" then .stdout // (. | tostring) else tostring end | gsub("\n"; " ") | .[0:150])..."
        end
      else empty end
    elif .type == "system" and .subtype == "init" then
      "📋 Session: \(.session_id)\n"
    else empty end
  '

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Done!"
