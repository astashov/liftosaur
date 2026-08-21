import { SyntaxNode } from "@lezer/common";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";

// Where an exercise begins, as a question about the *document* rather than about any one feature.
//
// It matters because two things in this app move exercises around — dragging a strip in the grid,
// dragging a line in the editor — and they answered it differently. The editor kept `///` comments
// and spacing blank lines where they were; the grid took everything since the previous exercise
// along for the ride. Same program, same gesture, two results.
//
// The rule here is the editor's, because it is the one that follows the language: a `//` line above
// an exercise is its description — the evaluator attaches it (plannerExerciseEvaluator's
// latestDescriptions), so it belongs to the exercise and travels with it. A `///` comment and a
// blank line that merely spaces a day out are attached to nothing; they belong to the place they
// were written in and stay there.
export interface IPlannerDocumentBlockSpan {
  fullName: string;
  // Start of the movable block: the exercise plus the description lines attached to it.
  from: number;
  // The exercise expression itself, for callers that need to look inside it.
  exerciseFrom: number;
  exerciseTo: number;
}

export function PlannerDocument_blockSpans(text: string): IPlannerDocumentBlockSpan[] {
  const tree = plannerExerciseParser.parse(text);
  const nodes: SyntaxNode[] = [];
  for (let node = tree.topNode.firstChild; node != null; node = node.nextSibling) {
    nodes.push(node);
  }
  const spans: IPlannerDocumentBlockSpan[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    spans.push({
      fullName:
        variations != null
          ? text.slice(variations.from, variations.to).trim()
          : text.slice(node.from, node.to).trim().split("\n")[0],
      from: startOfLine(text, blockStart(nodes, i)),
      exerciseFrom: node.from,
      exerciseTo: node.to,
    });
  }
  return spans;
}

// Walks back over the description lines above an exercise. Blank lines are crossed only when a
// description sits above them — a description group can be separated from its exercise by one, but
// blank lines with nothing above are spacing and stop the walk.
function blockStart(nodes: SyntaxNode[], exerciseIndex: number): number {
  let start = nodes[exerciseIndex].from;
  let i = exerciseIndex - 1;
  while (i >= 0) {
    const previous = nodes[i];
    if (previous.name === PlannerNodeName.LineComment) {
      start = previous.from;
      i -= 1;
    } else if (previous.name === PlannerNodeName.EmptyExpression) {
      let above = i;
      while (above >= 0 && nodes[above].name === PlannerNodeName.EmptyExpression) {
        above -= 1;
      }
      if (above >= 0 && nodes[above].name === PlannerNodeName.LineComment) {
        i = above;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return start;
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
