---
name: explain-changes
description: Generate an importance-ordered guided walkthrough of your changes this session and publish it to the reviewer's editor via the aireviewer publish_walkthrough tool. Use when the user asks you to explain, walk through, or give a tour of your changes.
---

# Explain changes

Produce a guided tour of the code you changed this session so the reviewer can
step through it in their editor.

1. Determine what you changed this session — run `git diff` (and recall files you
   created/edited). Read the surrounding code so explanations are accurate.
2. Decide an **importance order**: entry points and the most consequential edits
   first, *not* alphabetical. Group related edits into coherent steps.
3. For each step write a short `title` and a markdown `explanation` of **what
   changed and why** (intent over mechanics — one or two sentences). Add `refs`
   linking related symbols/files the reviewer should jump to.
4. Call the **`publish_walkthrough`** tool (aireviewer MCP server) with
   `{ title, steps: [{ file, startLine, endLine, title, explanation, importance?, refs? }] }`.
   All lines are 1-based and paths are workspace-relative.

Prefer 3–8 steps. After publishing, tell the user the tour is ready to start in
VS Code.
