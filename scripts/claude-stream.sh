#!/bin/bash

# Pretty formatter for streaming claude -p output
# Usage: ./scripts/claude-stream.sh "your prompt here" [-l logfile]
# Example: ./scripts/claude-stream.sh "/fix-rollbar-error 453425925501"
# Example: ./scripts/claude-stream.sh "/fix-rollbar-error 453425925501" -l output.log

PROMPT=""
LOG_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -l|--log)
      LOG_FILE="$2"
      shift 2
      ;;
    *)
      PROMPT="$1"
      shift
      ;;
  esac
done

if [ -z "$PROMPT" ]; then
  echo "Usage: $0 \"<prompt>\" [-l logfile]"
  echo "Example: $0 \"/fix-rollbar-error 453425925501\""
  echo "Example: $0 \"/fix-rollbar-error 453425925501\" -l output.log"
  exit 1
fi

output() {
  if [ -n "$LOG_FILE" ]; then
    tee -a "$LOG_FILE"
  else
    cat
  fi
}

echo "🚀 Running: claude -p \"$PROMPT\"" | output
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | output
echo "" | output

claude -p "$PROMPT" --settings .claude/settings.headless.json --output-format stream-json --verbose 2>&1 | \
  jq --unbuffered -r '
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
  ' | output

echo "" | output
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | output
echo "✨ Done!" | output
