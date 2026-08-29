import { SyntaxNode, Tree } from "@lezer/common";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";

// What belongs to an exercise, as a question about the *document* rather than about any one
// feature. Everything below is derived from one walk, so dragging a line, dragging a grid strip
// and showing a description in the editor cannot answer it differently — which they used to.
//
// The rule is the language's, taken from plannerExerciseEvaluator's `latestDescriptions`: the
// `//` lines above an exercise are its descriptions, so they belong to it and travel with it.
// A blank line with no `//` above it is spacing — it belongs to the place it was written and
// stays there. A `///` ends one description run and begins the next, but it does *not* detach
// what is above it; the exercise still gets both runs, so a `///` sitting between two of them is
// inside the block and travels with it. That last case barely exists in practice and does not
// survive a save — regenerating a day hoists `///` above the descriptions (see planner.test.ts,
// "properly compacts multiple empty lines in-between descriptions") — which is why it isn't
// worth a second rule to keep such a comment pinned in place.
export interface IPlannerDocumentBlockSpan {
  fullName: string;
  // Start of the movable block: the exercise plus the description lines attached to it.
  from: number;
  // End of the block's text. The grammar's ExerciseExpression swallows the line break that ends
  // it (`linebreakOrEof`), which the last exercise of a day doesn't have — so a caller slicing
  // or replacing `[from, to)` gets the block itself either way, without taking the next line's
  // place along with it.
  to: number;
  // The exercise expression itself, for callers that need to look inside it.
  exerciseFrom: number;
  exerciseTo: number;
  // 1-based line the exercise starts on, which is how an evaluated IPlannerProgramExercise
  // identifies where it came from (`line`) — so a caller holding one can find its span here.
  line: number;
}

// `tree` lets a caller that already parsed this text — an editor holding an incrementally
// reparsed tree — reuse it instead of paying for a second parse per keystroke.
export function PlannerDocument_blockSpans(text: string, tree?: Tree): IPlannerDocumentBlockSpan[] {
  const spans: IPlannerDocumentBlockSpan[] = [];
  // Counted forward alongside the spans rather than per span, so a day doesn't rescan its own
  // prefix once for every exercise in it.
  let counted = 0;
  let line = 1;
  for (const { exercise, runs } of attachedRuns(topLevelNodes(text, tree))) {
    for (let at = counted; at < exercise.from; at += 1) {
      if (text[at] === "\n") {
        line += 1;
      }
    }
    counted = exercise.from;
    const variations = exercise.getChild(PlannerNodeName.ExerciseVariations);
    // Every `//` line the evaluator attached, not only the ones it would count as descriptions:
    // an empty `//` is the marker that stops one being inherited, and leaving it behind when its
    // exercise moves would silently turn the inheritance back on.
    const first = runs.find((run) => run.length > 0);
    spans.push({
      fullName:
        variations != null
          ? text.slice(variations.from, variations.to).trim()
          : text.slice(exercise.from, exercise.to).trim().split("\n")[0],
      from: startOfLine(text, first != null ? first[0].from : exercise.from),
      to: endOfExercise(text, exercise),
      exerciseFrom: exercise.from,
      exerciseTo: exercise.to,
      line,
    });
  }
  return spans;
}

// The one walk: each exercise with the `//` runs the evaluator hands it, shaped exactly like
// `latestDescriptions` — empty runs included, since a blank line between two descriptions pushes
// one and their count is what decides whether the empty ones are dropped.
function attachedRuns(nodes: SyntaxNode[]): { exercise: SyntaxNode; runs: SyntaxNode[][] }[] {
  const attached: { exercise: SyntaxNode; runs: SyntaxNode[][] }[] = [];
  let runs: SyntaxNode[][] = [];
  for (const node of nodes) {
    if (node.name === PlannerNodeName.LineComment) {
      if (runs.length === 0) {
        runs.push([]);
      }
      runs[runs.length - 1].push(node);
    } else if (node.name === PlannerNodeName.EmptyExpression || node.name === PlannerNodeName.TripleLineComment) {
      if (runs.length > 0) {
        runs.push([]);
      }
    } else if (node.name === PlannerNodeName.ExerciseExpression) {
      attached.push({ exercise: node, runs });
      runs = [];
    }
  }
  // Runs left over at the end are attached to nothing: the evaluator drops whatever is still
  // pending when the text runs out, so they are comments rather than descriptions.
  return attached;
}

// The same attachment, read as descriptions rather than as a block: which runs the workout
// actually shows, which one is current, and what each one occupies on the page.
export interface IPlannerDocumentDescription {
  // The run as written: its first `//` through the end of its last line.
  from: number;
  to: number;
  // What removing it has to take: its whole lines, indentation included, plus the blank line
  // separating it from the run it sits next to — but never the blank line under an exercise,
  // which spaces the day out rather than belonging to this run.
  removeFrom: number;
  removeTo: number;
  // Where a `!` goes to make this run current: past the `//` and the whitespace after it.
  markerAt: number;
  // The `!` it already carries, with the whitespace after it, so making another run current can
  // take the whole prefix away.
  marker?: { from: number; to: number };
  isCurrent: boolean;
}

// Every exercise's descriptions, in the order the evaluator reads them. Exercises with none are
// left out, and so are the runs that say nothing — those are markers, not descriptions.
export function PlannerDocument_descriptions(text: string, tree?: Tree): IPlannerDocumentDescription[][] {
  const groups: IPlannerDocumentDescription[][] = [];
  for (const { runs } of attachedRuns(topLevelNodes(text, tree))) {
    const described = describeRuns(text, runs);
    if (described.length > 0) {
      groups.push(described);
    }
  }
  return groups;
}

// The run covering `index`, and where it sits among the descriptions of its own exercise — what
// every editing surface actually asks.
export function PlannerDocument_descriptionAt(
  text: string,
  index: number,
  tree?: Tree
): { siblings: IPlannerDocumentDescription[]; index: number } | undefined {
  for (const siblings of PlannerDocument_descriptions(text, tree)) {
    const found = siblings.findIndex((d) => index >= d.from && index <= d.to);
    if (found !== -1) {
      return { siblings, index: found };
    }
  }
  return undefined;
}

// A description line as the evaluator reads it: trimmed, with its `//` dropped.
function lineValue(text: string, node: SyntaxNode): string {
  return text.slice(node.from, node.to).trim().replace(/^\/\//, "");
}

function markerOf(text: string, run: SyntaxNode[]): { from: number; to: number } | undefined {
  const at = markerPosition(text, run[0]);
  if (text[at] !== "!") {
    return undefined;
  }
  let to = at + 1;
  while (to < text.length && (text[to] === " " || text[to] === "\t")) {
    to += 1;
  }
  return { from: at, to };
}

// The grammar's LineComment starts at the `//`, so the content begins two characters in — past
// whatever whitespace follows, tabs included: the evaluator's `/^\s*!/` accepts any of it.
function markerPosition(text: string, node: SyntaxNode): number {
  let at = node.from + 2;
  while (at < text.length && (text[at] === " " || text[at] === "\t")) {
    at += 1;
  }
  return at;
}

// Mirrors plannerExerciseEvaluator: the marker is read off the runs as written, then the ones
// that say nothing are dropped — but only when there is more than one, and the drop happens
// after the marker is stripped. So a run that is nothing but a marker takes the currency away
// with it, and nothing is left current.
function describeRuns(text: string, runs: SyntaxNode[][]): IPlannerDocumentDescription[] {
  const markers = runs.map((run) => (run.length > 0 ? markerOf(text, run) : undefined));
  const markedIndex = markers.findIndex((marker) => marker != null);
  const values = runs.map((run, i) => {
    const joined = run.map((node) => lineValue(text, node)).join("\n");
    return markers[i] != null ? joined.replace(/^\s*!/, "") : joined;
  });
  const kept = runs.map((_, i) => i).filter((i) => runs[i].length > 0 && (runs.length === 1 || values[i] !== ""));
  const currentIndex = kept.indexOf(markedIndex);
  return kept.map((rawIndex, i) => {
    const run = runs[rawIndex];
    const last = run[run.length - 1];
    const lineStart = startOfLine(text, run[0].from);
    // LineComment swallows the line break that ends it, except at the end of the text.
    const lineEnd = last.to;
    const after = blankLinesAfter(text, lineEnd);
    const before = blankLinesBefore(text, lineStart);
    const hasRunAbove = rawIndex > 0 && runs[rawIndex - 1].length > 0;
    const takesAfter = after > lineEnd;
    return {
      from: run[0].from,
      to: endOfLine(text, last),
      removeFrom: takesAfter || !hasRunAbove ? lineStart : before,
      removeTo: takesAfter ? after : lineEnd,
      markerAt: markerPosition(text, run[0]),
      marker: markers[rawIndex],
      isCurrent: i === (currentIndex === -1 ? 0 : currentIndex),
    };
  });
}

function endOfLine(text: string, node: SyntaxNode): number {
  let end = node.to;
  while (end > node.from && (text[end - 1] === "\n" || text[end - 1] === "\r")) {
    end -= 1;
  }
  return end;
}

// Forward over whole blank lines only. A line that merely starts with spaces is the next
// exercise's own indentation and stays with it.
function blankLinesAfter(text: string, at: number): number {
  let cursor = at;
  for (;;) {
    let end = cursor;
    while (end < text.length && text[end] !== "\n") {
      if (text[end] !== " " && text[end] !== "\t" && text[end] !== "\r") {
        return cursor;
      }
      end += 1;
    }
    if (end >= text.length) {
      return cursor;
    }
    cursor = end + 1;
  }
}

// Backward over whole blank lines, stopping just after the line break that ends the last line
// with something on it — that break belongs to that line.
function blankLinesBefore(text: string, at: number): number {
  let cursor = at;
  while (cursor > 0 && text[cursor - 1] === "\n") {
    let start = cursor - 1;
    while (start > 0 && text[start - 1] !== "\n") {
      if (text[start - 1] !== " " && text[start - 1] !== "\t" && text[start - 1] !== "\r") {
        return cursor;
      }
      start -= 1;
    }
    cursor = start;
  }
  return cursor;
}

function topLevelNodes(text: string, tree?: Tree): SyntaxNode[] {
  const parsed = tree ?? plannerExerciseParser.parse(text);
  const nodes: SyntaxNode[] = [];
  for (let node = parsed.topNode.firstChild; node != null; node = node.nextSibling) {
    nodes.push(node);
  }
  return nodes;
}

function endOfExercise(text: string, exercise: SyntaxNode): number {
  let end = exercise.to;
  while (end > exercise.from && (text[end - 1] === "\n" || text[end - 1] === "\r")) {
    end -= 1;
  }
  return end;
}

function startOfLine(text: string, index: number): number {
  let start = index;
  while (start > 0 && text[start - 1] !== "\n") {
    const ch = text[start - 1];
    if (ch !== " " && ch !== "\t") {
      return index;
    }
    start -= 1;
  }
  return start;
}
