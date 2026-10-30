#!/usr/bin/env node
// Usage: codex-rollout-answer.js <rollout.jsonl> <tag>
// Prints {"thread","message"} for the first task_complete after the prompt that carries
// <tag>, or nothing while that turn is still running.
const fs = require("fs");

const [file, tag] = process.argv.slice(2);
const lines = fs.readFileSync(file, "utf8").split("\n");
let thread = "";
let tagged = false;
for (const line of lines) {
  if (!line) {
    continue;
  }
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (event.type === "session_meta" && !thread) {
    thread = event.payload.id;
  }
  if (!tagged) {
    tagged = line.includes(tag);
    continue;
  }
  if (event.type === "event_msg" && event.payload.type === "task_complete") {
    process.stdout.write(JSON.stringify({ thread, message: event.payload.last_agent_message || "" }));
    break;
  }
}
