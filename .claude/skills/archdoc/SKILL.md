---
name: archdoc
description: Generate or refresh an architecture walkthrough doc (lambda/scripts/archdocs/*.md) for a subsystem or feature branch — top-down text walkthrough with verified clickable file:line links, mechanically extracted public API, invariants, and a debugging map. Use when asked to map/document/explain the architecture of a subsystem, feature, or branch, or to refresh an existing archdoc after changes.
---

# archdoc — architecture walkthrough docs

Produce a markdown doc the user reviews **instead of reading the implementation**: data structures, interfaces, fn signatures, and how data flows through them — entry point down to details. The user reviews *diffs of this doc* to track architecture changes, and asks questions about it inline via aireviewer; answers get folded back into the text.

The template under "Write" below is the specification. Follow it rather than copying an existing doc: most of them predate these rules and still carry `// :N` comments, pipe tables and numbered cross-references. If you want a worked example, take the newest doc in the archdocs directory that passes `scripts/lint-docs.ts` with zero errors — a doc that fails is by definition not one to imitate.

## Ground rules

- **Location**: `lambda/scripts/archdocs/<subsystem>.md`. Never `docs/` (served publicly via webpack `/docs/*`). Never a claude.ai artifact — the deliverable is the repo file. Don't commit; the user commits.
- **Text-first**: plain language ("we load X, pass these props; under the hood it calls Y to get Z"), verbatim signatures in code spans inside the Public API list, simple ASCII sketches only. **No mermaid, no SVG, no flow diagrams** — the user explicitly doesn't want them.
- **Every reference is a link whose text names the thing.** `[Progress_checkSetTimer](…)`, never `` [`:1511`](…) ``. When no symbol sits at the line, name the behaviour: `[the fall-through](…)`.
- **Write links as plain relative paths while drafting** — `[Progress_checkSetTimer](../../../src/models/progress.ts#L1511)`, repo root is `../../..` from `lambda/scripts/archdocs/`. `scripts/archdoc-relink.ts` converts them at the end. Never hand-write a `vscode://` URL.
- **Link a range when the thing is a block, a single line when it is a place.** `#L1220-L1232` selects those lines on arrival, so the reader sees the whole union, switch, or guard rather than its first line and a guess about where it ends. Use a range for a type or interface body, a `switch`/`if` chain the sentence is about, a multi-line guard, or a hunk you are describing as one move. Use a single line for a function you are naming (its declaration is the anchor), a call site, or a constant. Both forms survive `archdoc-relink.ts`, and the lint checks the end line against the file at `head`. Do not range a whole function body — that is what the diff route already shows.
- **Links do not render inside a code fence, so fences carry no links and no line numbers.** Never write `// :N`. A fence shows shape; the list around it owns navigation. Every symbol named inside a fence must appear as linked text elsewhere in the same doc — `scripts/lint-docs.ts` enforces this for `How it runs` blocks.
- **Implementation details of individual fn bodies are NOT the content.** What matters: types, signatures, who-calls-whom, where decisions/state live, what must stay true.

## The one non-negotiable: verify every anchor

Explore agents report stale or wrong line numbers routinely (observed: an agent described a 730-line shape of a file that was actually 322 lines after refactors; another time the branch gained a method *between* two verification passes in the same session). Therefore:

1. Never link a line number that came from an agent report or from memory.
2. Before writing the doc, grep-verify every anchor you will link: `grep -n "<distinctive signature text>" <file>`. Batch many patterns per call with `|`.
3. Read small key files (< ~400 lines) directly instead of trusting summaries of them.
4. A link that lands on the wrong line is the doc's staleness alarm — that only works if links were correct at generation time.

## Extract the public API mechanically — never by hand

For the Public API section, run this over the feature's files (works for TS; adapt the closing heuristics for Swift/Kotlin):

```sh
awk '
FNR==1 { mode=""; inblock=0; print "\n==== " FILENAME }
/^export / && !inblock { inblock=1; mode = ($0 ~ /^export (interface|type) /) ? "iface" : "fn" }
inblock { print FNR": "$0 }
inblock && mode=="iface" && /^export type .*;[ ]*$/ { inblock=0 }
inblock && mode=="iface" && /^}/ { inblock=0 }
inblock && mode=="fn" && /[{;][ ]*$/ { inblock=0 }
' <files...>
```

Zsh gotcha: never `echo ===FOO===` as a separator in compound commands (`=cmd` expansion breaks it); use `printf '\n--- %s\n' ...` or separate calls.

## Process

**1. Scope.** For a branch: `git diff --stat $(git merge-base master HEAD)..HEAD` + `git log --oneline` for the commit narrative. For a subsystem: identify its file surface first.

**2. Explore top-down.** Spawn Explore agent(s) — parallel when there are distinct layers (e.g. TS chain vs native components). Prompt them to follow the chain entry point → down, returning **verbatim types/signatures + file:line + 2–4 sentences of narrative per hop**, and to say what *actually* exists when a hypothesis is wrong. Commit messages are good hop hints.

**3. Verify** (see above): grep every anchor, read the small key files, run the API extraction.

**4. Write** in this structure:

Sections are named and referred to by name, never by number. No pipe tables anywhere.

```
# <Title> (branch `<name>` — if branch-scoped)
*base `<merge-base sha>` · head `<sha>` · <date>*

**The feature in one paragraph.** What it is, from the user's point of view, then the
one-sentence architectural shape.

ASCII layer stack (entry point at top, leaves at bottom, one annotation per layer).
This one fence stays as art — it shows overall shape and nothing in it needs clicking.

The rule that organizes everything: **<the design's one organizing principle, bolded>**

## Public API
Per file, stack order, as a LIST — never a fenced signature block, because a fence
kills the links. One bullet per symbol: linked name, a COLON (not an em-dash — a long
API list would eat the whole doc's dash budget), the signature in a code span, then an
indented line saying what it owns.

  ### [src/models/progress.ts](../../../src/models/progress.ts)

  - [`Progress_getActiveSetTimer`](../../../src/models/progress.ts#L1240): `(progress) => IActiveSetTimer | undefined`
    The single read model. Four presenters moved onto it.
  - [`IActiveSetTimer`](../../../src/models/progress.ts#L1220-L1232): the union every presenter reads
    A type body is a block, so it gets a range and arrives selected.

A type too wide for one line puts a fence UNDER its bullet, with the link above it.
End with "Host integration points": pre-existing fns/props the feature hooks into.
This section is the canonical home of every signature; narrative points here.

## How it runs
One block per user-visible scenario, not per file: "tap play", "countdown expires",
"wake from a 10-minute sleep". Plain indentation inside a fence — no bullets, no
box-drawing, no line numbers, no arrows unless they carry an outcome.

Call tree for who-calls-whom; pseudocode (`on(event)` / `if` / `else`) for a function
whose branches are the point. Every symbol you name here must be linked in the
Public API section — the lint checks it.

## <Named sections>. The cascade
One section per hop, entry point first: what this layer owns, what it hands down
(the seam/props/contract verbatim if small), what it calls below and why. Deep links
on every claim. Prose carries the "why" only — never restate an edge of a call tree.

## Things that must stay true
Numbered invariants a diff must be judged against — each with its enforcing location
linked and one sentence on what breaks if violated. Tie known past bugs ("scar
tissue") to the invariant they violated.

## Where to look when something breaks
Symptom → starting file/fn, as a list. Bold the symptom, link the destination.
```

**5. Lint, then prose-pass.** Run
`TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/lint-docs.ts <path>` and fix every error.
Then spawn the `prose-pass` agent on the file. Both must come back clean before you report.

**6. Relink.** Run `TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/archdoc-relink.ts <path>` to see the
split, then again with `--write`. It rewrites every relative link into one of two routes the
aireviewer extension handles, choosing by whether the target changed between the stamped commits:

- **inside a function `base..head` touched** → `archdoc/diff`, opening a two-pane diff at that line.
  Both sides are real files in sparse worktrees under `.archdoc-snapshots/`, so go-to-definition
  works inside the diff. This is what you want for anything the feature introduced.
- **untouched** → `archdoc/open`, the plain file at `head`. Host integration points and pre-existing
  invariants read better as files than as a diff of a file that did not change.

It decides with `git diff -W`, so a function's declaration counts as changed when its body changed,
while a genuinely pre-existing function in the same file does not. Directory links stay relative,
and a `#L1220-L1232` range is carried through as `line=1220-1232`.

This is why the header stamp needs both shas, and why anchors keep working in an old doc: `head`
pins every link to the commit the doc describes, so links never rot as the code moves. Re-run it
after any refresh that changes the stamp.

**7. Report** to the user: path, plus anything surprising the mapping surfaced (drift, asymmetries, weak spots) — that's review signal, not filler.

## Refresh mode (doc already exists)

1. Grep-verify the doc's existing anchors against the working tree; list which moved/broke.
2. Re-run the API extraction; diff against the Public API section — new/removed/changed exports drive which narrative sections need updating.
3. Update the header stamp's `base`/`head`, then re-run `scripts/archdoc-relink.ts --write` so every link points at the new commits.
4. Fold in any clarifications the user asked for since (aireviewer questions = places the doc failed to explain; the answer belongs in the text).
5. Keep edits minimal — the user reviews the doc's diff; noise there defeats the purpose.
6. Update the header stamp (commit + date).

<!-- prose:start -->

## Prose rules

Generated from `PROSE.md`. Do not edit here — edit `PROSE.md` and run `npx ts-node scripts/generate-prose-rules.ts`.

**The line is the unit of meaning.** No hard wrap. One paragraph per line, one list item per line, blank lines between paragraphs. Never pack two checkboxes or two bullets onto one line.

**Lists, not tables.** No pipe tables. They read as a wall of `|` in the editor and a one-word edit rewrites the whole line in the diff. The only exception is data with two real axes, as a fixed-width aligned block inside a fence, at most one per document.

**Cross-references name the thing, never a number.** Strip every link from a sentence and it must still say what it points at. Never `§4`, never `section 3.2`, never a link whose text is `:1511`, never `see above`. Link the symbol name, or name the behaviour: `the fall-through`, `the 250ms tick`.

**No line numbers in prose or in fences.** No `// :N` comments. A fence shows shape; the links live in the surrounding list.

**Every sentence names a symbol, a file, a number, or a consequence.** A sentence naming none of those is filler. "The nonce keeps it stable" is short and useless. "The nonce survives the flip, so promoting the countdown does not re-present the banner" carries the fact.

**An estimate is a number and the condition it depends on.** "Roughly a day", "a small change", `cheap` — none of those can be planned around. "Twenty minutes if the codegen is current, half a day if the pod install has to be redone" can. Effort is a number, so the sentence rule above already covers it: an estimate without one is filler.

**Restate position in multi-step work.** One line at the top of a report saying where we are, every turn: "phase 5 of 8 done". The reader should never reconstruct progress from prose, and a checkbox list in a file they are not looking at does not do this job.

**A reply or a plan ends with one next action, doable in under two minutes.** Not a question. "Reload VSCode, then click `IActiveSetTimer`" beats "want me to keep going?", which hands the reader the work of deciding what happens next. An archdoc has no next action and ends with its debugging map instead.

### Banned outright

Fake idioms, say the mechanism instead: `load-bearing`, `smoking gun`, `north star`, `lodestar`, `footgun`, `sharp edge`, `moving parts`, `the whole point`, `the entire point`.

Economics metaphors for code, say the actual cost or benefit with a number: `cheap`, `expensive`, `for free`, `buys us`, `pays for itself`, `earns its keep`, `costs us`.

The negation-contrast tic, state the second half and delete the first: `X is not Y, it is Z`, `not just X but Y`, `isn't about X, it's about Y`, `less a X than a Y`.

Emphasis adverbs that measure nothing, delete or replace with a number: `actually`, `genuinely`, `precisely`, `crucially`, `critically`, `importantly`, `fundamentally`, `essentially`, `simply`, `merely`, `truly`, `dramatically`, `significantly`, `massively`, `wildly`.

Meta-narration, say the thing instead of announcing it: `here's the thing`, `the key insight`, `worth noting`, `note that`, `to be clear`, `that said`, `in other words`, `which is to say`, `at its core`, `the real question is`.

Marketing words: `robust`, `seamless`, `elegant`, `surgical`, `comprehensive`, `leverage`, `principled`, `nuanced`, `delve`.

**The catch-all:** a metaphor is banned unless it is a term of art in this codebase. Describe the mechanism.

### Budgeted, not banned

Per document: `deliberate` three times, `by construction` twice, `first-class` once, one em-dash per eight lines. `scar tissue` is unlimited, it is a section name in archdocs. `rather than` is ordinary English and is not restricted.

### Comments in code

Default: zero comments. A comment is an admission that the code failed to explain itself.

Before writing one, try in this order: a better name, extracting a named function, a named constant instead of a literal, restructuring so the branch is obvious. A comment is allowed only when all four fail.

A comment may only carry information that is not in the code and cannot be put there: a decision and the alternative it rejected, an external bug or limitation with a link or version, a constraint from outside this file (an old client still syncing, an App Store release cycle, a server contract), or a measured number and how it was measured.

Never: restating the line, section banners like `// ---- helpers ----`, an opener from Check / Get / Set / Create / Update / Handle / Loop / Initialize / First / Then / Now we, hedges such as "this might" or "not sure but", JSDoc on a function whose name and signature already say it, or a TODO that was not asked for.

Length: one line, three is the hard cap. Longer belongs in an archdoc, with the comment pointing at it.

The test: delete the comment and read the code. If a reviewer would ask "why is this here?", it goes back. Otherwise it stays deleted.

<!-- prose:end -->
