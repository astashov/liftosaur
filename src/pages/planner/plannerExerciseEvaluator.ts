// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { Exercise } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { IEither } from "../../utils/types";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseRepRange,
  IPlannerProgramExerciseSet,
  IPlannerProgramProperty,
} from "./models/types";
import { IAllCustomExercises, IWeight, equipments } from "../../types";
import * as W from "../../models/weight";

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
  LineComment = "LineComment",
  Program = "Program",
  ExerciseExpression = "ExerciseExpression",
  ExerciseLabel = "ExerciseLabel",
  Word = "Word",
  ExerciseName = "ExerciseName",
  SectionSeparator = "SectionSeparator",
  ExerciseSection = "ExerciseSection",
  ExerciseSets = "ExerciseSets",
  ExerciseSet = "ExerciseSet",
  Rpe = "Rpe",
  Timer = "Timer",
  SetPart = "SetPart",
  Weight = "Weight",
  Percentage = "Percentage",
  ExerciseProperty = "ExerciseProperty",
  ExercisePropertyName = "ExercisePropertyName",
  FunctionExpression = "FunctionExpression",
  FunctionName = "FunctionName",
  Alphanumeric = "Alphanumeric",
  FunctionArgument = "FunctionArgument",
  EmptyExpression = "EmptyExpression",
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
  private readonly customExercises: IAllCustomExercises;

  constructor(script: string, customExercises: IAllCustomExercises) {
    this.script = script;
    this.customExercises = customExercises;
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
    let isAmrap = false;
    if (maxrepStr.endsWith("+")) {
      isAmrap = true;
      maxrepStr.replace(/\+/g, "");
    }
    return {
      numberOfSets: parseInt(numberOfSetsStr, 10),
      minrep: parseInt(minrepStr, 10),
      maxrep: parseInt(maxrepStr, 10),
      isAmrap: isAmrap,
    };
  }

  private getWeight(expr?: SyntaxNode | null): IWeight | undefined {
    if (expr?.type.name === NodeName.Weight) {
      const value = this.getValue(expr);
      const unit = value.indexOf("kg") !== -1 ? "kg" : "lb";
      return W.Weight.build(parseFloat(value), unit);
    } else {
      return undefined;
    }
  }

  private evaluateSet(expr: SyntaxNode): IPlannerProgramExerciseSet {
    if (expr.type.name === NodeName.ExerciseSet) {
      const setPartNodes = expr.getChildren(NodeName.SetPart);
      const setParts = setPartNodes.map((setPartNode) => this.getValue(setPartNode)).join("");
      const repRange = this.getRepRange(setParts);
      const rpeNode = expr.getChild(NodeName.Rpe);
      const timerNode = expr.getChild(NodeName.Timer);
      const percentageNode = expr.getChild(NodeName.Percentage);
      const weightNode = expr.getChild(NodeName.Weight);
      const rpe = rpeNode == null ? undefined : parseInt(this.getValue(rpeNode).replace("@", ""), 10);
      const timer = timerNode == null ? undefined : parseInt(this.getValue(timerNode).replace("s", ""), 10);
      const percentage =
        percentageNode == null ? undefined : parseInt(this.getValue(percentageNode).replace("%", ""), 10);
      const weight = this.getWeight(weightNode);
      return {
        repRange,
        timer,
        rpe,
        weight,
        percentage,
      };
    } else {
      assert(NodeName.ExerciseSection);
    }
  }

  private evaluateProperty(expr: SyntaxNode): IPlannerProgramProperty {
    if (expr.type.name === NodeName.ExerciseProperty) {
      const nameNode = expr.getChild(NodeName.ExercisePropertyName);
      if (nameNode == null) {
        assert(NodeName.ExercisePropertyName);
      }
      const name = this.getValue(nameNode);
      if (["progress"].indexOf(name) === -1) {
        throw new PlannerSyntaxError(`There's no such property exists - '${name}'`, 0, 0);
      }
      const valueNode = expr.getChild(NodeName.FunctionExpression);
      if (valueNode == null) {
        throw new PlannerSyntaxError(`Missing value for the property '${name}'`, 0, 0);
      }
      const fnNameNode = valueNode.getChild(NodeName.FunctionName);
      if (fnNameNode == null) {
        assert(NodeName.FunctionName);
      }
      const fnName = this.getValue(fnNameNode);
      if (["lp", "sum", "dp"].indexOf(fnName) === -1) {
        throw new PlannerSyntaxError(`There's no such progression exists - '${fnName}'`, 0, 0);
      }
      const fnArgs = valueNode.getChildren(NodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      if (fnName === "lp") {
        if (fnArgs.length > 4) {
          throw new PlannerSyntaxError(`Linear Progression 'lp' only has 4 arguments max`, 0, 0);
        } else if (fnArgs[0] && !fnArgs[0].endsWith("lb") && !fnArgs[0].endsWith("kg") && !fnArgs[0].endsWith("%")) {
          throw new PlannerSyntaxError(
            `1st argument of 'lp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            0,
            0
          );
        } else if (fnArgs[1] != null && isNaN(parseInt(fnArgs[1], 10))) {
          throw new PlannerSyntaxError(`2nd argument of 'lp' should be a number of attempts - i.e. a number`, 0, 0);
        } else if (
          fnArgs[2] != null &&
          !fnArgs[2].endsWith("lb") &&
          !fnArgs[2].endsWith("kg") &&
          !fnArgs[2].endsWith("%")
        ) {
          throw new PlannerSyntaxError(
            `3rd argument of 'lp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            0,
            0
          );
        } else if (fnArgs[3] != null && isNaN(parseInt(fnArgs[3], 10))) {
          throw new PlannerSyntaxError(`4th argument of 'lp' should be a number of attempts - i.e. a number`, 0, 0);
        }
      } else if (fnName === "sum") {
        if (fnArgs.length > 2) {
          throw new PlannerSyntaxError(`Reps Sum Progression 'sum' only has 2 arguments max`, 0, 0);
        } else if (fnArgs[0] == null || isNaN(parseInt(fnArgs[0], 10))) {
          throw new PlannerSyntaxError(`1st argument of 'sum' should be a number of reps - i.e. a number`, 0, 0);
        } else if (
          fnArgs[1] == null ||
          (!fnArgs[1].endsWith("lb") && !fnArgs[1].endsWith("kg") && !fnArgs[1].endsWith("%"))
        ) {
          throw new PlannerSyntaxError(
            `2nd argument of 'sum' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            0,
            0
          );
        }
      } else if (fnName === "dp") {
        if (fnArgs.length > 2) {
          throw new PlannerSyntaxError(`Double Progression 'dp' only has 2 arguments max`, 0, 0);
        } else if (fnArgs[0] == null || isNaN(parseInt(fnArgs[0], 10))) {
          throw new PlannerSyntaxError(`1st argument of 'dp' should be a range of reps - i.e. a number`, 0, 0);
        } else if (
          fnArgs[1] == null ||
          (!fnArgs[1].endsWith("lb") && !fnArgs[1].endsWith("kg") && !fnArgs[1].endsWith("%"))
        ) {
          throw new PlannerSyntaxError(
            `2nd argument of 'dp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            0,
            0
          );
        }
      }
      return {
        name,
        fnName,
        fnArgs: fnArgs,
      };
    } else {
      assert(NodeName.ExerciseProperty);
    }
  }

  private evaluateSection(expr: SyntaxNode): IPlannerProgramExerciseSet[] | IPlannerProgramProperty {
    if (expr.type.name === NodeName.ExerciseSection) {
      const setsNode = expr.getChild(NodeName.ExerciseSets);
      if (setsNode != null) {
        const sets = setsNode.getChildren(NodeName.ExerciseSet);
        if (sets.length > 0) {
          return sets.map((set) => this.evaluateSet(set));
        }
      }
      const property = expr.getChild(NodeName.ExerciseProperty);
      if (property != null) {
        return this.evaluateProperty(property);
      } else {
        assert(NodeName.ExerciseProperty);
      }
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
      const labelNode = expr.getChild(NodeName.ExerciseLabel);
      const label = labelNode == null ? undefined : this.getValue(labelNode);
      let name = this.getValue(nameNode);
      const parts = name.split(",").map((part) => part.trim());
      let equipment: string | undefined = undefined;
      if (parts.length > 1) {
        const potentialEquipment = parts.pop();
        if (potentialEquipment != null && (equipments as readonly string[]).indexOf(potentialEquipment) !== -1) {
          equipment = potentialEquipment;
        }
      }
      name = parts.join(", ");
      const exercise = Exercise.findByName(name, this.customExercises);
      equipment = equipment || exercise?.defaultEquipment;
      if (exercise == null) {
        this.error(`Unknown exercise ${name}`, nameNode);
      }
      const sectionNodes = expr.getChildren(NodeName.ExerciseSection);
      let hadRepRange = false;
      const allSets: IPlannerProgramExerciseSet[] = [];
      const allProperties: IPlannerProgramProperty[] = [];
      let isReusing = false;
      for (const sectionNode of sectionNodes) {
        const section = this.evaluateSection(sectionNode);
        if (Array.isArray(section)) {
          const sectionHasRepRange = section.some((set) => set.repRange != null);
          if (sectionHasRepRange) {
            if (hadRepRange) {
              throw new PlannerSyntaxError(`Exercise should only have rep range in one section`, 0, 0);
            }
            hadRepRange = true;
          }
          allSets.push(...section);
        } else {
          if (section.name === "reuse") {
            isReusing = true;
          }
          allProperties.push(section);
        }
      }
      if (isReusing && (allSets.length > 0 || allProperties.length > 1)) {
        throw new PlannerSyntaxError(
          `Exercises that reuse logic should not specify any sets or properties except 'reuse'`,
          0,
          0
        );
      }
      const sets = allSets.filter((set) => set.repRange != null);
      const rpe = allSets.find((set) => set.repRange == null && set.rpe != null)?.rpe;
      const timer = allSets.find((set) => set.repRange == null && set.timer != null)?.timer;
      const percentage = allSets.find((set) => set.repRange == null && set.percentage != null)?.percentage;
      const weight = allSets.find((set) => set.repRange == null && set.weight != null)?.weight;
      const [line] = this.getLineAndOffset(expr);
      for (const set of sets) {
        set.rpe = set.rpe ?? rpe;
        set.timer = set.timer ?? timer;
        set.percentage = set.percentage ?? percentage;
        set.weight = set.weight ?? weight;
      }
      return {
        label,
        name,
        equipment,
        line,
        sets,
        properties: allProperties,
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
