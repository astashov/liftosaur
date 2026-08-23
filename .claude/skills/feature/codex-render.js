#!/usr/bin/env node
// Render `codex exec --json` JSONL into a live, human-readable markdown transcript.
//
//   codex exec --json ... | node codex-render.js <transcript.md> <thread-file> <title>
//
// Writes the same content to stdout (so the caller sees it live) and appends it to
// the transcript with sync writes, so `tail -f <transcript>` shows codex working in
// real time.
const fs = require("fs");
const readline = require("readline");

const [transcriptPath, threadPath] = process.argv.slice(2);
const seen = new Set();

function append(text) {
  fs.appendFileSync(transcriptPath, text);
}

// a `> …` note right after a prose paragraph would be read as its continuation
let lastWasMessage = false;

function emit(line) {
  const stamp = new Date().toTimeString().slice(0, 8);
  append((lastWasMessage ? "\n" : "") + line + "\n");
  lastWasMessage = false;
  process.stdout.write(`[${stamp}] ${line}\n`);
}

function trim(text, limit = 160) {
  const flat = String(text || "").split(/\s+/).filter(Boolean).join(" ");
  return flat.length <= limit ? flat : flat.slice(0, limit - 1) + "…";
}

function writeMessage(text) {
  let body = text;
  try {
    body = "```json\n" + JSON.stringify(JSON.parse(text), null, 2) + "\n```";
  } catch {
    // plain prose — leave it as is
  }
  append("\n" + body + "\n");
  lastWasMessage = true;
  process.stdout.write("\n" + body + "\n");
}

readline.createInterface({ input: process.stdin }).on("line", (raw) => {
  const line = raw.trim();
  if (!line) {
    return;
  }
  if (!line.startsWith("{")) {
    emit(`> ⚠️ ${trim(line)}`);
    return;
  }

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    emit(`> ⚠️ unparsed: ${trim(line)}`);
    return;
  }

  const etype = event.type || "";

  if (etype === "thread.started") {
    fs.writeFileSync(threadPath, event.thread_id || "");
    emit(`> thread \`${event.thread_id}\``);
    return;
  }
  if (etype === "turn.completed") {
    const u = event.usage || {};
    emit(`> turn done — in ${u.input_tokens} / out ${u.output_tokens} / reasoning ${u.reasoning_output_tokens}`);
    return;
  }
  if (etype === "turn.failed" || etype === "error") {
    emit(`> ❌ ${trim(JSON.stringify(event), 400)}`);
    return;
  }
  if (!etype.startsWith("item.")) {
    return;
  }

  const item = event.item || {};
  const itype = item.type || "";
  const key = `${item.id}:${itype}`;

  if (itype === "agent_message") {
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    writeMessage(item.text || "");
    return;
  }
  if (seen.has(key)) {
    return;
  }
  // commands render on `started` — that is the timely one; skip the `completed` twin
  if (itype === "command_execution") {
    if (etype === "item.started") {
      seen.add(key);
      emit(`> $ ${trim(item.command)}`);
    }
    return;
  }
  if (etype !== "item.completed") {
    return;
  }
  seen.add(key);

  if (itype === "reasoning") {
    const summary = item.text || (item.summary || []).join(" ");
    if (summary) {
      emit(`> 💭 ${trim(summary)}`);
    }
  } else if (itype === "file_change" || itype === "patch_apply") {
    emit(`> ± ${trim((item.changes || []).map((c) => c.path).join(", "))}`);
  } else if (itype === "web_search") {
    emit(`> 🔍 ${trim(item.query)}`);
  } else if (itype !== "todo_list") {
    emit(`> · ${itype}`);
  }
}).on("close", () => append("\n"));
