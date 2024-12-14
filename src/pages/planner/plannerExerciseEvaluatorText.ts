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
  description?: string;
  days: IPlannerExerciseEvaluatorTextDay[];
}

export interface IPlannerExerciseEvaluatorTextDay {
  name: string;
  description?: string;
  exercises: string[];
}

type IPlannerNonExerciseFullTextLine =
  | { type: "comment"; line: string }
  | { type: "triplelinecomment"; line: string }
  | { type: "empty"; line: string };

function fullTextLineToWeekdayDescription(line: IPlannerNonExerciseFullTextLine): string {
  switch (line.type) {
    case "comment":
      return line.line.replace(/^\s*\/\/\s*/, "").trim();
    case "triplelinecomment":
      return line.line.replace(/^\s*\/\/\/\s*/, "").trim();
    case "empty":
      return "";
  }
}

export class PlannerExerciseEvaluatorText {
  private readonly script: string;
  private weeks: IPlannerExerciseEvaluatorTextWeek[] = [];
  private ongoingLines: IPlannerNonExerciseFullTextLine[] = [];

  constructor(script: string) {
    this.script = script;
  }

  private getValue(node: SyntaxNode): string {
    return this.script.slice(node.from, node.to);
  }

  private getWeekDayOngoingLines(): {
    linesToPreviousExercise: IPlannerNonExerciseFullTextLine[];
    nextLines: IPlannerNonExerciseFullTextLine[];
  } {
    const ongoingLines = [...this.ongoingLines];
    let anyCommentStarted = false;
    let commentStarted = false;
    const linesToPreviousExercise: IPlannerNonExerciseFullTextLine[] = [];
    const nextLines: IPlannerNonExerciseFullTextLine[] = [];
    for (let i = 0; i < ongoingLines.length; i++) {
      const line = ongoingLines[i];
      if (!anyCommentStarted && line?.type === "empty") {
        continue;
      }
      if (line?.type === "comment" || line?.type === "triplelinecomment") {
        anyCommentStarted = true;
      }
      if (line?.type === "comment") {
        commentStarted = true;
      }
      if (anyCommentStarted && !commentStarted) {
        linesToPreviousExercise.push(line);
      }
      if (commentStarted && line?.type === "comment") {
        nextLines.push(line);
      }
    }
    for (let i = nextLines.length - 1; i >= 0; i--) {
      const line = nextLines[i];
      if (line.type === "empty") {
        nextLines.pop();
      } else {
        break;
      }
    }
    for (let i = linesToPreviousExercise.length - 1; i >= 0; i--) {
      const line = linesToPreviousExercise[i];
      if (line.type === "empty") {
        linesToPreviousExercise.pop();
      } else {
        break;
      }
    }
    return { linesToPreviousExercise, nextLines };
  }

  private getWeekDayDescriptionAndFillLastDay(): string | undefined {
    const { linesToPreviousExercise, nextLines } = this.getWeekDayOngoingLines();
    if (linesToPreviousExercise.length > 0) {
      const lastDay = this.getLastDay();
      if (lastDay) {
        lastDay.exercises.push(...linesToPreviousExercise.map((line) => line.line));
      }
    }
    const description =
      nextLines.length > 0 ? nextLines.map(fullTextLineToWeekdayDescription).join("\n").trim() : undefined;
    return description;
  }

  private getLastDay(): IPlannerExerciseEvaluatorTextDay | undefined {
    const lastWeek = this.weeks[this.weeks.length - 1];
    return lastWeek?.days[lastWeek.days.length - 1];
  }

  private evaluateLine(expr: SyntaxNode): void {
    if (expr.type.name === PlannerNodeName.Week) {
      const weekName = this.getValue(expr).replace(/^#+/, "").trim();
      const description = this.getWeekDayDescriptionAndFillLastDay();
      this.weeks.push({ name: weekName, description, days: [] });
      this.ongoingLines = [];
    } else if (expr.type.name === PlannerNodeName.Day) {
      const dayName = this.getValue(expr).replace(/^#+/, "").trim();
      const description = this.getWeekDayDescriptionAndFillLastDay();
      this.weeks[this.weeks.length - 1].days.push({ name: dayName, exercises: [], description });
      this.ongoingLines = [];
    } else if (expr.type.name === PlannerNodeName.EmptyExpression) {
      this.ongoingLines.push({ type: "empty", line: this.getValue(expr) });
    } else if (expr.type.name === PlannerNodeName.LineComment) {
      this.ongoingLines.push({ type: "comment", line: this.getValue(expr) });
    } else if (expr.type.name === PlannerNodeName.TripleLineComment) {
      this.ongoingLines.push({ type: "triplelinecomment", line: this.getValue(expr) });
    } else if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      const lastWeek = this.weeks[this.weeks.length - 1];
      const lastDay = lastWeek ? lastWeek.days[lastWeek.days.length - 1] : undefined;
      const exercises = lastDay?.exercises;
      if (exercises) {
        for (const line of this.ongoingLines) {
          exercises.push(line.line);
        }
        exercises.push(this.getValue(expr));
        this.ongoingLines = [];
      }
    }
  }

  public evaluate(expr: SyntaxNode): IPlannerExerciseEvaluatorTextWeek[] {
    if (expr.type.name === PlannerNodeName.Program) {
      this.ongoingLines = [];
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
