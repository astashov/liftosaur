import { SyntaxNode } from "@lezer/common";
import { CollectionUtils } from "../../utils/collection";
import { PlannerNodeName } from "./plannerExerciseStyles";

function getChildren(node: SyntaxNode): SyntaxNode[] {
  const cur = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cur.firstChild()) {
    return result;
  }
  do {
    result.push(cur.node);
  } while (cur.nextSibling());
  return result;
}

export interface IPlannerExerciseEvaluatorTextWeek {
  name: string;
  days: { name: string; exercises: string[] }[];
}

export class PlannerExerciseEvaluatorText {
  private readonly script: string;
  private weeks: IPlannerExerciseEvaluatorTextWeek[] = [];

  constructor(script: string) {
    this.script = script;
  }

  private getValue(node: SyntaxNode): string {
    return this.script.slice(node.from, node.to);
  }

  private evaluateLine(expr: SyntaxNode): void {
    if (expr.type.name === PlannerNodeName.Week) {
      const weekName = this.getValue(expr).replace(/^#+/, "").trim();
      this.weeks.push({ name: weekName, days: [] });
    } else if (expr.type.name === PlannerNodeName.Day) {
      const dayName = this.getValue(expr).replace(/^#+/, "").trim();
      this.weeks[this.weeks.length - 1].days.push({ name: dayName, exercises: [] });
    } else if (
      expr.type.name === PlannerNodeName.EmptyExpression ||
      expr.type.name === PlannerNodeName.TripleLineComment ||
      expr.type.name === PlannerNodeName.LineComment ||
      expr.type.name === PlannerNodeName.ExerciseExpression
    ) {
      const lastWeek = this.weeks[this.weeks.length - 1];
      const lastDay = lastWeek ? lastWeek.days[lastWeek.days.length - 1] : undefined;
      const exercises = lastDay?.exercises;
      if (exercises) {
        exercises.push(this.getValue(expr));
      }
    }
  }

  public evaluate(expr: SyntaxNode): IPlannerExerciseEvaluatorTextWeek[] {
    if (expr.type.name === PlannerNodeName.Program) {
      this.weeks = [];
      for (const child of CollectionUtils.compact(getChildren(expr))) {
        this.evaluateLine(child);
      }
      return this.weeks;
    } else {
      throw new Error(`Unexpected node type ${expr.type.name}`);
    }
  }
}
