// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { Exercise } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { IEither } from "../../utils/types";
import { IPlannerProgramExercise, IPlannerProgramExerciseRepRange, IPlannerProgramExerciseSet } from "./models/types";

export class PlannerSyntaxError extends SyntaxError {
  public readonly line: number;
  public readonly offset: number;

  constructor(message: string, line: number, offset: number) {
    super(message);
    this.line = line;
    this.offset = offset;
  }
}

export type IPlannerEvalResult = IEither<IPlannerProgramExercise[], PlannerSyntaxError>;

// eslint-disable-next-line no-shadow
enum NodeName {
  Program = "Program",
  EmptyExpression = "EmptyExpression",
  LineComment = "LineComment",
  ExerciseExpression = "ExerciseExpression",
  ExerciseName = "ExerciseName",
  Word = "Word",
  ExerciseSection = "ExerciseSection",
  ExerciseSet = "ExerciseSet",
  SetPart = "SetPart",
  Rpe = "Rpe",
  Timer = "Timer",
}

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

function assert(name: string): never {
  throw new PlannerSyntaxError(`Missing required nodes for ${name}, this should never happen`, 0, 0);
}

export class PlannerExerciseEvaluator {
  private readonly script: string;

  constructor(script: string) {
    this.script = script;
  }

  private getValue(node: SyntaxNode): string {
    return this.script.slice(node.from, node.to).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  }

  private error(message: string, node: SyntaxNode): never {
    const [line, offset] = this.getLineAndOffset(node);
    throw new PlannerSyntaxError(`${message} (${line}:${offset})`, line, offset);
  }

  private getLineAndOffset(node: SyntaxNode): [number, number] {
    const linesLengths = this.script.split("\n").map((l) => l.length + 1);
    let offset = 0;
    for (let i = 0; i < linesLengths.length; i++) {
      const lineLength = linesLengths[i];
      if (node.from >= offset && node.from < offset + lineLength) {
        return [i + 1, node.from - offset];
      }
      offset += lineLength;
    }
    return [linesLengths.length, linesLengths[linesLengths.length - 1]];
  }

  public parse(expr: SyntaxNode): void {
    const cursor = expr.cursor();
    do {
      if (cursor.node.type.isError) {
        this.error("Syntax error", cursor.node);
      }
    } while (cursor.next());
  }

  private getRepRange(setParts: string): IPlannerProgramExerciseRepRange | undefined {
    let [numberOfSetsStr, repRangeStr] = setParts.split("x", 2);
    if (!numberOfSetsStr) {
      return undefined;
    }
    if (!repRangeStr) {
      repRangeStr = numberOfSetsStr;
      numberOfSetsStr = "1";
    }
    // eslint-disable-next-line prefer-const
    let [minrepStr, maxrepStr] = repRangeStr.split("-", 2);
    if (!maxrepStr) {
      maxrepStr = minrepStr;
    }
    return {
      numberOfSets: parseInt(numberOfSetsStr, 10),
      minrep: parseInt(minrepStr, 10),
      maxrep: parseInt(maxrepStr, 10),
    };
  }

  private evaluateSet(expr: SyntaxNode): IPlannerProgramExerciseSet {
    if (expr.type.name === NodeName.ExerciseSet) {
      const setPartNodes = expr.getChildren(NodeName.SetPart);
      const setParts = setPartNodes.map((setPartNode) => this.getValue(setPartNode)).join("");
      const repRange = this.getRepRange(setParts);
      const rpeNode = expr.getChild(NodeName.Rpe);
      const timerNode = expr.getChild(NodeName.Timer);
      const rpe = rpeNode == null ? undefined : parseInt(this.getValue(rpeNode).replace("@", ""), 10);
      const timer = timerNode == null ? undefined : parseInt(this.getValue(timerNode).replace("s", ""), 10);
      return {
        repRange,
        timer,
        rpe,
      };
    } else {
      assert(NodeName.ExerciseSection);
    }
  }

  private evaluateSection(expr: SyntaxNode): IPlannerProgramExerciseSet[] {
    if (expr.type.name === NodeName.ExerciseSection) {
      const sets = expr.getChildren(NodeName.ExerciseSet);
      return sets.map((set) => this.evaluateSet(set));
    } else {
      assert(NodeName.ExerciseSection);
    }
  }

  private evaluateExercise(expr: SyntaxNode): IPlannerProgramExercise | undefined {
    if (expr.type.name === NodeName.EmptyExpression || expr.type.name === NodeName.LineComment) {
      return undefined;
    } else if (expr.type.name === NodeName.ExerciseExpression) {
      const nameNode = expr.getChild(NodeName.ExerciseName);
      if (nameNode == null) {
        assert("ExerciseName");
      }
      const name = this.getValue(nameNode);
      const exerciseId = Exercise.findIdByName(name);
      if (exerciseId == null) {
        this.error(`Unknown exercise ${name}`, nameNode);
      }
      const sectionNodes = expr.getChildren(NodeName.ExerciseSection);
      let hadRepRange = false;
      const allSets = sectionNodes.reduce<IPlannerProgramExerciseSet[]>((acc, sectionNode) => {
        const section = this.evaluateSection(sectionNode);
        const sectionHasRepRange = section.some((set) => set.repRange != null);
        if (sectionHasRepRange) {
          if (hadRepRange) {
            throw new PlannerSyntaxError(`Exercise should only have rep range in one section`, 0, 0);
          }
          hadRepRange = true;
        }
        return [...acc, ...section];
      }, []);
      const sets = allSets.filter((set) => set.repRange != null);
      const rpe = allSets.find((set) => set.repRange == null && set.rpe != null)?.rpe;
      const timer = allSets.find((set) => set.repRange == null && set.timer != null)?.timer;
      console.log(expr.type.name, this.getLineAndOffset(expr));
      const [line] = this.getLineAndOffset(expr);
      return {
        name,
        line,
        sets,
        globals: {
          rpe,
          timer,
        },
      };
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  private evaluateProgram(expr: SyntaxNode): IPlannerProgramExercise[] {
    if (expr.type.name === NodeName.Program) {
      return CollectionUtils.compact(getChildren(expr).map((child) => this.evaluateExercise(child)));
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  public evaluate(programNode: SyntaxNode): IPlannerEvalResult {
    try {
      return { data: this.evaluateProgram(programNode), success: true };
    } catch (e) {
      if (e instanceof PlannerSyntaxError) {
        return { error: e, success: false };
      } else {
        throw e;
      }
    }
  }
}
