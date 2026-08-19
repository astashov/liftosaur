import { SyntaxNode } from "@lezer/common";
import { IPlannerProgram } from "../../../types";
import { ObjectUtils_clone } from "../../../utils/object";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";

function children(node: SyntaxNode): SyntaxNode[] {
  const cursor = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cursor.firstChild()) {
    return result;
  }
  do {
    result.push(cursor.node);
  } while (cursor.nextSibling());
  return result;
}

// The forced order shares the repeat's bracket (`Squat[3,1-4]` is order 3 repeating weeks 1-4), so
// rewriting the range has to carry any order along with it.
function orderOf(repeatNode: SyntaxNode, text: string): number | undefined {
  for (const child of children(repeatNode)) {
    if (child.type.name === PlannerNodeName.Rep) {
      return parseInt(text.slice(child.from, child.to), 10);
    }
  }
  return undefined;
}

interface IExerciseLine {
  variationsEnd: number;
  repeatNode?: SyntaxNode;
}

function findExerciseLine(text: string, fullName: string): IExerciseLine | undefined {
  const tree = plannerExerciseParser.parse(text);
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    if (variations == null || text.slice(variations.from, variations.to).trim() !== fullName) {
      continue;
    }
    return {
      variationsEnd: variations.to,
      repeatNode: node.getChild(PlannerNodeName.Repeat) ?? undefined,
    };
  }
  return undefined;
}

// Changes how many weeks an exercise repeats for, by rewriting the `[from-to]` token on the line
// that declares it and nothing else. The later weeks hold no text for a repeated exercise — the
// evaluator synthesizes them from the range — so this is the whole edit: no other line moves, and a
// week that has its own definition inside the new range stays put and reads as an override.
//
// `toWeek` equal to `fromWeek` drops the repeat entirely, leaving the exercise in its own week.
export function ProgramGridTransforms_setRepeatRange(
  planner: IPlannerProgram,
  dayData: { week: number; dayInWeek: number },
  fullName: string,
  toWeek: number
): IPlannerProgram {
  const result = ObjectUtils_clone(planner);
  const day = result.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
  if (day == null) {
    return planner;
  }
  const text = day.exerciseText;
  const line = findExerciseLine(text, fullName);
  if (line == null) {
    return planner;
  }
  const order = line.repeatNode != null ? orderOf(line.repeatNode, text) : undefined;
  const parts: string[] = [];
  if (order != null && order !== 0) {
    parts.push(`${order}`);
  }
  if (toWeek > dayData.week) {
    parts.push(`${dayData.week}-${toWeek}`);
  }
  const token = parts.length > 0 ? `[${parts.join(",")}]` : "";
  const from = line.repeatNode?.from ?? line.variationsEnd;
  const to = line.repeatNode?.to ?? line.variationsEnd;
  day.exerciseText = `${text.slice(0, from)}${token}${text.slice(to)}`;
  return result;
}
