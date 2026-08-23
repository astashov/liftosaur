---
name: feature
description: Build a feature end to end — decide worktree vs here, design the architecture and debate it with codex, get the user's approval on a one-pass-readable plan, state the API/state contract, implement with visible diffs, then run two codex reviews (bugs + architecture) and document the result. Use when asked to build/implement/add a feature or do a refactor that involves design decisions.
argument-hint: "what to build, e.g. 'in a worktree: per-day exercise reordering'"
---

# feature — the end-to-end feature loop

Nine phases. Four of them are **gates**: stop, present, wait for the user. The rest is work.

| # | Phase | Ends with |
|---|---|---|
| 0 | Intake — worktree? scale? | a decision |
| 1 | Explore + draft architecture | 1–2 candidate designs |
| 2 | Codex architecture consult | agreement, or a framed disagreement |
| 3 | **Present the plan** | 🚦 user approval |
| 4 | **Implementation contract** | 🚦 user approval |
| 5 | Implement | diffs |
| 6 | Verify | lint/tsc/tests/screenshots green |
| 7 | Two codex reviews | structured findings |
| 8 | **Triage findings** | 🚦 user arbitration, then fixes |
| 9 | Document + walkthrough | archdoc, optional tour, optional kb |

Everything durable lands in two files, both named off the feature slug:

- `lambda/scripts/plans/YYYYMMDD-<slug>.md` — the plan, with phase checkboxes. Written at phase 3 and updated as you go, so a compacted or crashed session can resume from disk.
- `lambda/scripts/plans/YYYYMMDD-<slug>.codex.md` — the full Claude↔Codex conversation, appended live.

---

## Phase 0 — Intake

**Worktree or here?** If the invocation says ("in a worktree", "right here"), obey it silently. Otherwise ask — one question, two options. Worktree → invoke the `worktree` skill to create it, then continue there.

**Scale check.** This loop is a tax on small changes. If the feature touches roughly one file, adds no public API, no new state, and no cross-platform surface — say so, skip to phase 5, and just implement it. Announce the skip; don't silently drop the ceremony.

**Slug.** Kebab-case, from the feature name. Used for both file names.

## Phase 1 — Explore, then draft

Read the real code before designing. Spawn Explore agents when the surface is broad or spans layers (TS chain vs native components vs lambda), and have them return **verbatim signatures + file:line**, not prose summaries.

Then draft **one recommended design plus at most one serious alternative**. For each: what changes, what new state exists, what the data flow is, what it costs. No exhaustive surveys.

## Phase 2 — Codex architecture consult

Codex is read-only. It analyzes; we implement. It gets the repo, so hand it **paths and a problem**, never pasted file bodies.

Round 1 prompt shape — write it to a file, then send it (see *Talking to codex* below):

```
# Architecture review

## What we're building
[2-4 sentences, user-visible outcome]

## Where it lives
[the file surface: paths + one line each on what they do]

## My proposed design
[the design: new modules, signatures, state, data flow]

## Alternative I rejected
[and why]

## Your job
Attack this design. Specifically:
1. Where does it break as the feature grows?
2. Is the state in the right place, and is any of it redundant?
3. Is there a materially simpler shape that gets the same result?
4. What does it collide with elsewhere in this codebase?

Ground every claim in code you actually read — give file:line. If you agree with
a part, say so in one line and move on; spend your words on what's wrong.
```

**Rounds are capped at 2.** Round 2 (`--resume`, so codex keeps its context) is only for real disagreement — send your counter-argument, not a summary. After round 2, if you still disagree: **stop and escalate to the user**, framed as

> Codex says **X**, because *Y*. I say **Z**, because *W*. The real tradeoff is *[the thing that actually differs]*. My recommendation: *[pick one]*.

Never loop until you agree, and never adopt codex's view just because it pushed back twice. **Verify its claims against the code first** — codex cites lines that don't exist often enough that this matters.

## Phase 3 — Present the plan 🚦

The plan must be **readable in one pass, without opening the editor**. Hard rules:

- **Every symbol, function, or file you mention comes with its code inlined**, right there, 5–20 lines. Writing "like we do in `app.tsx:234`" or "using the helper in `program.ts:324`" *without the snippet* is banned — that's the failure mode this rule exists to kill.
- **Open with one plain paragraph** on what the user sees or can do once this ships. Before any code.
- **Explain like the reader is smart but new here.** Define repo jargon on first use ("a *lens* is how we do immutable updates: `lb<IState>().p('x').record(v)` builds a path and returns a new state"). Short sentences. No stacked abstractions.
- **ASCII sketches only** if they help. No mermaid, no diagrams-for-decoration.
- End with **"What we're not doing"** and **the open questions that need your call**, each with a recommendation.

Save it to `lambda/scripts/plans/YYYYMMDD-<slug>.md` with the phase checkboxes, then ask for approval. Do not start editing before you get it.

## Phase 4 — Implementation contract 🚦

Before the first edit, show — as code, not prose:

1. **Public API**: exact signatures of every new or changed exported function, and the file each one lives in. Follow the repo convention (`ModuleName_functionName`).
2. **Interfaces and data structures**: new/changed `interface`/`type` declarations, verbatim.
3. **All new state**, one line each, with where it lives and why it must live there:
   - `useState`/`useRef` — which component, what invalidates it
   - `IState` — the lens path
   - `IStorage` — **flag this loudly**: persisted state needs a storage-version and sync/watch story (see the checklist below)
4. **Tests**: which existing test files grow, or which new one appears — decided now, not after.

This gate is short. The user says "yes" or corrects a signature.

## Phase 5 — Implement

**Use Edit and Write only.** No `sed`, no `python`, no heredoc rewrites of existing files. The user reviews your diffs as you go; a scripted edit is invisible to them and silently no-ops when the pattern doesn't match.

Work in the order of the contract: types first, then the core module, then the call sites, then UI. Keep each edit small enough to read.

## Phase 6 — Verify

- `npm run lint` and TypeScript on what you touched
- the relevant tests (`npm run onetest` for one file)
- **UI features get driven, not assumed** — use the `test-app` skill on the simulator or the playwright MCP on web, and screenshot the result

Report failures with their output. Never claim green without running it.

## Phase 7 — Two codex reviews

Run both against the branch diff, in parallel, each in its own transcript section. Give codex the diff scope (`git diff $(git merge-base master HEAD)..HEAD --stat` plus the paths), not file dumps. Both use `--schema schemas/review.schema.json`.

**Review A — bugs and edge cases:**

```
Adversarial bug review. Assume this change is broken until the code proves otherwise.
Scope: [paths / diff range]

Hunt for:
- edge cases the change forgot: empty, zero, one, missing, stale, concurrent
- behavior it changes *elsewhere* — existing callers, other screens, other platforms
- state that can go out of sync, or persist in a shape older builds can't read
- error and loading paths, not just the happy path

Only material findings, each defensible from code you read: what breaks, why this
path is vulnerable, what the impact is, what change fixes it.
```

**Review B — architecture:**

```
Architecture review of the same change.
Scope: [paths / diff range]

Judge, with reasons:
- is the public API right — names, shapes, who is allowed to call what?
- is every new piece of state justified, and in the right place? What could be derived instead?
- could this be materially simpler or clearer? Show the simpler shape concretely.
- does it fit how the rest of this codebase already does things, or invent a parallel way?

Not style or naming nitpicks. Architecture only.
```

## Phase 8 — Triage 🚦

For each finding: **open the code and check it** before believing it. Then sort into

- **Confirmed** — real, here's the fix
- **Rejected** — with the concrete reason it doesn't apply
- **Your call** — genuine tradeoffs, presented with a recommendation

Drop findings under 0.3 confidence. Present the three buckets, get the user's decisions, then fix the confirmed ones (Edit only), and re-verify.

## Phase 9 — Document

- Run the `archdoc` skill for the durable subsystem doc (or refresh the existing one).
- Offer the `explain-changes` walkthrough for an in-editor tour of the diff.
- If something non-obvious surfaced — a landmine, a root cause, a decision with real reasoning behind it — offer `kb`.
- **Don't commit.** The user commits.

---

## Liftosaur blast radius — check before coding

Mechanical checks, every time; each one is a bug class that has actually bitten this repo:

- **`.native.tsx` twin?** `ls <file>.native.tsx` — a platform variant means the change must land in both, or deliberately in one.
- **Web build still fine?** RN-only APIs and `react-navigation` imports break it.
- **Imported by lambda SSR?** SSR chokes on react-navigation's ESM — invert with callback props.
- **Touching `IStorage`?** Then: storage version, migration for existing users, and the watch/sync filtering path. Persisted-shape changes are the most expensive mistakes here.
- **Touching sync/merge?** `reducerWrapper` and `defaultOnActions` must agree on merge detection.
- **New UI in a modal?** Check the formSheet/transparentModal rules — `flex-1` collapses inside formSheet.
- **Android specifics** — sticky headers eat taps, controlled `TextInput` + transform duplicates characters, dynamic `className` drops styles.

## Talking to codex

`.claude/skills/feature/codex-chat.sh` runs one turn and renders the stream live into the transcript.

```bash
.claude/skills/feature/codex-chat.sh \
  --transcript lambda/scripts/plans/20260819-my-feature.codex.md \
  --title "Architecture · round 1" \
  --prompt-file /tmp/.../prompt.md \
  [--resume] [--schema .claude/skills/feature/schemas/review.schema.json] \
  [--effort high] [--model gpt-5.4] [--timeout 900]
```

- Always `run_in_background: true` — a real consult takes 2–5 minutes. Poll the output file every 20–30s.
- `--resume` continues the same codex thread (id kept in the `.thread` sibling), so round 2 remembers round 1.
- Codex's final answer is written to the `.last.md` sibling — read that, don't re-parse the stream.
- Two reviews in phase 7 run as two separate backgrounded calls; give them **different transcripts** (`...codex-review-bugs.md`, `...codex-review-arch.md`) so their threads don't cross.

**Give the user the watch command in chat, in the same message that launches the consult** — the script prints it too, but that stdout goes to the tool result, which the user never sees. It must be a copy-pasteable line on its own, with the **absolute** path, posted *before* you start polling — not after codex finishes, when it's useless:

> Codex is thinking (~3 min). Watch it live:
> ```
> tail -f /Users/anton/projects/liftosaur/lambda/scripts/plans/20260819-my-feature.codex.md
> ```
> Or open that file in VS Code — it updates as the stream arrives. In this session, `! tail -n 40 <that path>` drops the latest into the chat.

Repeat it for every consult, including each of the two phase-7 reviews — they write to different transcripts, so it's a different command each time.

The transcript is a plain markdown log: your prompt verbatim in a fence, then codex's shell commands (`> $ …`), reasoning (`> 💭 …`) and replies as they arrive. It gets committed with the plan — it's the record of *why* the architecture is what it is.

## Resuming

The plan file's checkboxes are the state. On "continue the feature" / after a compaction: read the newest `lambda/scripts/plans/YYYYMMDD-<slug>.md`, find the first unchecked phase, re-orient with `git diff`, and pick up there. Tick each box as you complete it.

## Plan file template

```markdown
# <Feature> — plan
*<date> · branch `<name>` · worktree: <yes/no>*

- [ ] 0 intake  - [ ] 1 draft  - [ ] 2 codex arch  - [ ] 3 approved
- [ ] 4 contract  - [ ] 5 implement  - [ ] 6 verify  - [ ] 7 reviews
- [ ] 8 triage  - [ ] 9 documented

## What the user gets
## How it works
## The contract (API · types · state)
## What we're not doing
## Open questions
## Codex
Transcript: `./<slug>.codex.md`. Agreed: … · Disagreed: … (resolution: …)
```
