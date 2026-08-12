---
name: archdoc
description: Generate or refresh an architecture walkthrough doc (lambda/scripts/archdocs/*.md) for a subsystem or feature branch — top-down text walkthrough with verified clickable file:line links, mechanically extracted public API, invariants, and a debugging map. Use when asked to map/document/explain the architecture of a subsystem, feature, or branch, or to refresh an existing archdoc after changes.
---

# archdoc — architecture walkthrough docs

Produce a markdown doc the user reviews **instead of reading the implementation**: data structures, interfaces, fn signatures, and how data flows through them — entry point down to details. The user reviews *diffs of this doc* to track architecture changes, and asks questions about it inline via aireviewer; answers get folded back into the text.

Canonical example: `lambda/scripts/archdocs/liftoeditor.md`. Match its structure and tone.

## Ground rules

- **Location**: `lambda/scripts/archdocs/<subsystem>.md`. Never `docs/` (served publicly via webpack `/docs/*`). Never a claude.ai artifact — the deliverable is the repo file. Don't commit; the user commits.
- **Text-first**: plain language ("we load X, pass these props; under the hood it calls Y to get Z"), verbatim signatures in code blocks, simple ASCII sketches only. **No mermaid, no SVG, no flow diagrams** — the user explicitly doesn't want them.
- **Every file:line is a clickable relative link**: `[thunks.ts:1263](../../../src/ducks/thunks.ts#L1263)` (VSCode preview + Ctrl+click and GitHub both jump to the line). Relative from `lambda/scripts/archdocs/`, so repo root is `../../..`. Links don't work inside code blocks — there, use `// :N` line-number comments and link the section/file heading instead.
- **Implementation details of individual fn bodies are NOT the content.** What matters: types, signatures, who-calls-whom, where decisions/state live, what must stay true.

## The one non-negotiable: verify every anchor

Explore agents report stale or wrong line numbers routinely (observed: an agent described a 730-line shape of a file that was actually 322 lines after refactors; another time the branch gained a method *between* two verification passes in the same session). Therefore:

1. Never link a line number that came from an agent report or from memory.
2. Before writing the doc, grep-verify every anchor you will link: `grep -n "<distinctive signature text>" <file>`. Batch many patterns per call with `|`.
3. Read small key files (< ~400 lines) directly instead of trusting summaries of them.
4. A link that lands on the wrong line is the doc's staleness alarm — that only works if links were correct at generation time.

## Extract the public API mechanically — never by hand

For §0, run this over the feature's files (works for TS; adapt the closing heuristics for Swift/Kotlin):

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

```
# <Title> (branch `<name>` — if branch-scoped)
*Generated from working tree @ `<commit>` (note if uncommitted changes present), <date>.
 Every file:line is a link … if one lands on the wrong line, the doc is stale — regenerate.*

**The feature in one paragraph.** What it is, from the user's point of view, then the
one-sentence architectural shape.

ASCII layer stack (entry point at top, leaves at bottom, one annotation per layer).

The rule that organizes everything: **<the design's one organizing principle, bolded>**

## 0. Public API by file
Per file, stack order: exported fn signatures + interfaces in compact code blocks,
`// :N` line comments, file-linked headings. Abbreviate only with a "full body in §N"
pointer. End with a "Host integration points" block: pre-existing fns/props the feature
hooks into. §0 is the canonical home of each signature — narrative sections point here
instead of repeating bodies.

## 1..N. The cascade
One section per hop, entry point first: what this layer owns, what it hands down
(the seam/props/contract verbatim if small), what it calls below and why. Deep links
on every claim. Include the "why" behind non-obvious choices (commit messages often
carry it). ASCII sketch of screen layout / node topology where words get clumsy.

## N+1. Things that must stay true
Numbered invariants a diff must be judged against — each with its enforcing location
linked and one sentence on what breaks if violated. Tie known past bugs ("scar
tissue") to the invariant they violated.

## N+2. Where to look when something breaks
Symptom → starting file/fn table, linked.
```

**5. Report** to the user: path, plus anything surprising the mapping surfaced (drift, asymmetries, weak spots) — that's review signal, not filler.

## Refresh mode (doc already exists)

1. Grep-verify the doc's existing anchors against the working tree; list which moved/broke.
2. Re-run the API extraction; diff against §0 — new/removed/changed exports drive which narrative sections need updating.
3. Update stale links even in sections whose prose didn't change.
4. Fold in any clarifications the user asked for since (aireviewer questions = places the doc failed to explain; the answer belongs in the text).
5. Keep edits minimal — the user reviews the doc's diff; noise there defeats the purpose.
6. Update the header stamp (commit + date).
