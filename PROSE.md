# PROSE.md

How to write, for every surface: chat replies, `lambda/scripts/archdocs/*.md`, `lambda/scripts/plans/*.md`, graspcode review answers, walkthrough steps, and `lambda/scripts/memory/` entries.

The rules between the markers below are copied verbatim into `CLAUDE.md` and `.claude/skills/feature/SKILL.md` by `scripts/generate-prose-rules.ts`. Edit them here, then run the generator. `scripts/lint-docs.ts` fails when a copy drifts. The archdoc skill moved to the graspcode plugin, which serves every repo and so carries no repo's writing rules; an agent writing an archdoc reads these from `CLAUDE.md`.

Everything outside the markers is rationale and worked examples, read when you need to know why a rule exists.

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

## Why these rules

### Why the line is the unit of meaning

Archdocs used to hard-wrap near 100 characters. Reword four words early in a paragraph and every line after it reflows, so the diff showed six changed lines where one sentence changed. These documents get reviewed by their diff, so the wrapping worked against the review.

One sentence per line kills the reflow, but it reads strangely raw and a paragraph is a real unit of thought worth seeing as one. One paragraph per line keeps both: rendered markdown is unchanged, the editor soft-wraps for reading, and a reworded paragraph is one changed line with the changed words highlighted inside it.

Paragraphs stay short. Over six sentences, split them.

### Why lists instead of tables

Two reasons. Raw markdown is where these documents get read, and a pipe table there is a grid of `|` and `-`. And a table cell edit rewrites a long line, so any change to the widest cell reflows the alignment across every row.

A signature list carries the same information and every cell can hold a link:

```markdown
### [src/models/progress.ts](../../../src/models/progress.ts)

- [`Progress_getActiveSetTimer`](../../../src/models/progress.ts#L1240): `(progress: IHistoryRecord) => IActiveSetTimer | undefined`
  The single read model. Four presenters moved onto it, so the banner spans the flip instead of popping on it.
```

A type too wide for one line puts its fence under the bullet, with the link above it.

### Why cross-references name things

A section number is an identifier the reader cannot resolve while reading. Nobody remembers what `4.6` contained. A bare line number is worse: `:1511` is clickable and still tells you nothing about where you are going.

The test is mechanical. Strip every link from the sentence. If the sentence no longer says what it points at, the link text was doing work it should not have been doing.

When no symbol sits at the target line, name the behaviour instead of the number: `the fall-through`, `the sync whitelist entry`, `the clamp`.

### Why fences carry no links

Markdown links do not render inside a code fence. The old archdoc rule worked around that by writing `// :N` line-number comments inside the fence and linking the file heading instead. That produced 250 unclickable numbers across seven documents.

The fix is to stop making one element do two jobs. A fence shows shape. The list around it owns navigation. Every symbol named inside a fence must appear as linked text elsewhere in the same document, so it is one search-in-page from its link.

### Why the ban list has replacements

A bare ban makes the next draft reach for a synonym that is equally strange. Each banned phrase is listed with what to write instead, and the replacement is always more specific than the phrase it replaces:

- `load-bearing` becomes "four surfaces read this field"
- `cheap` becomes "one grep"
- `moving parts` becomes "three files change"
- `for free` becomes "no extra call"

The negation-contrast tic is structural rather than lexical. `X is not Y, it is Z` builds a strawman so that Z sounds like a discovery. Real writing states Z. Delete the first half.

`in other words` marks a first attempt that failed. Delete the first attempt and keep the second.

### Why some words are budgeted instead of banned

`deliberate` often carries a real fact, that a person chose this rather than it falling out of the implementation. `by construction` sometimes names a genuine proof. `scar tissue` is a required subsection in archdocs. Banning them would push the writing toward worse synonyms, so they get a cap instead.

### Why comments are near-banned

The old rule said "explain WHY not WHAT", which is easy to rationalize: almost any comment can be framed as a why. The four-step ladder is harder to talk past — a better name, an extracted function, a named constant, a restructured branch. Only when all four fail has the code run out of ways to say it itself.

The delete test is the check. Remove the comment and read the code. If a reviewer would ask "why is this here?", the comment carried something. Otherwise it was narration.

## Enforcement

`scripts/lint-docs.ts` checks `lambda/scripts/archdocs/*.md` and `lambda/scripts/plans/*.md`. Hard failures block; warnings report. Word checks skip fenced blocks and inline code spans, so a document that quotes a banned word in backticks passes.

`grasp archdoc lint` owns the other half: dead paths, dead anchors, `// :N` line numbers, and symbols named in a How it runs fence without a link. Those need a git revision and a snapshot, so they live in graspcode rather than here. Both run on every archdoc write, from the hook in `.claude/settings.json`.

`.claude/agents/prose-pass.md` rewrites what a grep cannot judge: filler sentences, restated paragraphs, the negation-contrast tic in forms the pattern misses. It runs as a separate agent because the author is anchored on their own phrasing.

`.claude/agents/comment-pass.md` judges added and modified comments in a branch, and runs as a step in the `feature` skill.

Hooks in `.claude/settings.json` run the lint on every write to the two document directories, so a failure comes back in the same turn as the edit.
