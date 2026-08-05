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
   changed and why** (intent over mechanics — one or two sentences).
4. **Every file, directory, or symbol you mention in the explanation must also
   appear in `refs`** — refs render as clickable "Jump to" links under the step;
   file names in the explanation text are plain text and are NOT clickable.
   Use the mentioned name as the `label` and add `line` when pointing at a
   specific spot. Also add refs for related places worth visiting even if not
   mentioned in the text.
5. Call the **`publish_walkthrough`** tool (aireviewer MCP server) with
   `{ title, steps: [{ file, startLine, endLine, title, explanation, importance?, refs? }] }`.
   All lines are 1-based and paths are workspace-relative.

Prefer 3–8 steps. After publishing, tell the user the tour is ready to start in
VS Code.

## Per-commit mode

When asked to walk through a **range of commits** (e.g. "review the last 5
commits", "walk me through branch X"):

1. List them oldest-first: `git log --reverse --format='%H %s' <range>`.
2. For each commit, read its diff (`git show <sha>`) and write steps as above,
   tagging each step with `commit: <full sha>`. Walk commits oldest→newest;
   within a commit, order steps by importance.
3. **Line numbers must be positions in the file AS OF that commit** — verify
   with `git show <sha>:<path>`, never the working tree. Each step renders
   inside a diff of `<sha>~1 ↔ <sha>` in the editor.
4. Pass `commits: [{ sha, subject }]` (oldest first) alongside `steps`. The
   editor then also shows a "Walkthrough Commits" tree in the Source Control
   sidebar and change marks in the gutter against the base of the range.
