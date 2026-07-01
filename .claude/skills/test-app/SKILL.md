---
name: test-app
description: Manually test/QA the Liftosaur app on the iOS simulator — drive the real UI, inspect live app state, and set up test data. Use when asked to test, QA, stress-test, verify a change works, reproduce a bug, or hunt for bugs in the running app.
argument-hint: "what to test, e.g. 'the workout screen rest timers'"
---

# Test the app on the simulator

Drive the running app on the iOS simulator, and for anything non-trivial **verify against the
live app state**, not just the screen. Many bugs are UI/data desyncs the screenshot won't show.

Three tools do the work:
- **`ios-simulator` MCP** — drive the UI (the app is bare RN, so `testID`s are queryable).
- **`scripts/dump-rn-state.js`** — read the live Redux state (`globalThis.state`).
- **`liftosaur-local` MCP** — set up the environment (programs, exercises, history, settings)
  on the same account the simulator is signed into.

Focus: $ARGUMENTS

## The core loop

1. **Set up** the scenario via `liftosaur-local` MCP (or by driving the UI).
2. **Act** in the UI via `ios-simulator` MCP — target by `testID`, never pixel-guess.
3. **Verify** with `dump-rn-state.js`: does the live state match what the screen shows and what
   you intended? A mismatch between control ↔ state ↔ intent is a bug.
4. **Reset** between cases (in-app undo/discard, or re-seed via MCP) so each test starts clean.

## Tools

### ios-simulator MCP (drive the UI)
- `get_booted_sim_id` once (bundle id `com.liftosaur.www`).
- `ui_find_element(["<testID>"])` → tap the returned **frame center**. `testID`s surface as
  `AXUniqueId`. Prefer semantic targeting over coordinates.
- `ui_view` — cheap screenshot for a visual/state check.
- `ui_describe_all` — full a11y tree; use sparingly, it can exceed the token limit. If it's
  dumped to a file, pull the ids out:
  `python3 -c "import re;print('\n'.join(dict.fromkeys(re.findall(r'\"AXUniqueId\":\"([^\"]+)\"',open('FILE').read()))))"`
- `ui_type` after tapping a field; `ui_swipe` to scroll; `launch_app(..., terminate_running:true)`
  to relaunch. See main `CLAUDE.md` for idb setup.

### dump-rn-state.js (read live state)
```bash
node scripts/dump-rn-state.js storage.currentProgramId        # dotted path
node scripts/dump-rn-state.js --eval "Object.keys(globalThis.state)"   # arbitrary expr
node scripts/dump-rn-state.js --eval "globalThis.state.storage.settings.units"
```
Hermes' `JSON.stringify` drops `undefined`/functions, so you get clean IState. Useful roots:
`storage` (programs, settings, history, stats), `progress` (in-progress workout),
`editProgramStates` / `editProgramExerciseStates` (edit buffers). Needs Metro connected — a
"Fast Refresh disconnected" banner means it dropped; relaunch the app.

### liftosaur-local MCP (set up the environment)
Same account as the sim. Read the DSL guide first — it is not guessable:
`get_liftoscript_reference`, then `get_liftoscript_examples`.
- Programs: `create_program` / `update_program` (validate with `run_playground` BEFORE saving),
  `list_programs`, `get_program`, `delete_program`.
- Also: custom exercises/equipment/gyms, `create_history_record`, measurements, `set_exercise_data`.

After creating/updating data via MCP, the device won't see it until it syncs — relaunch with
`launch_app(bundle_id, terminate_running:true)` to force a full sync, then switch to it in-app
(Me → Program) if needed.

## Understand the target first

Before driving the UI, know the `testID`s and the handlers behind the feature. Fastest path:
spawn an **Explore agent** to grep `testID=` in the relevant components and report each control,
its handler, and how it serializes/writes state (with `file:line`). Note handler **asymmetries**
(one path preserves a field, a sibling resets it) — those are prime bug candidates.

Native code lives in `src/components/**` (`.tsx` using RN primitives; check for `.native.tsx`
variants). State shapes are in `src/types.ts` and `src/models/state.ts`.

## Gotchas (learned the hard way)

- **Coordinates:** `ui_find_element` frames are in full-scroll coords; taps use screen points.
  The tab bar sits at ~y≥762 and overlaps list rows — scroll the target above it before tapping,
  or you'll hit a footer tab.
- **Inputs commit on blur** — after `ui_type` into a numeric/text field, dismiss the keypad
  (its keyboard-icon) before dumping state, or the change won't be in state yet.
- **CodeMirror / inlined-HTML WebViews** (e.g. the Liftoscript full-text editor) are ONE opaque
  a11y node — you can't tap inside. Set that content via the MCP instead.
- **Reload to sync** MCP-made data: `launch_app(..., terminate_running:true)`.
- **Verify the DATA, not just the screen** — the screen can look right while state is wrong.
- Leave the account as you found it (or tell the user what you changed): switch the active
  program back, delete throwaway programs/history, and confirm nothing unintended was saved.

## Reporting

When bug-hunting, write findings to `lambda/scripts/bugs/<area>-<date>.md`. Per bug: severity,
numbered repro steps, a **before/after state dump** proving it, any UI-vs-state mismatch, and the
`file:line` root cause. Reproduce from a clean state before reporting, and list what you verified
working too.

## Example: program-editor QA

A worked scenario — reuse/repeat mechanics on the Edit Program screens — including a ready-made
fixture program and the exact bugs it surfaced, is in
`lambda/scripts/bugs/program-editor-bugs-2026-07-01.md`. Use it as a model for structuring a run.
