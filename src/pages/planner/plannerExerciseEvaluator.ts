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
import { IPlannerProgramExerciseWarmupSet } from "./models/types";

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
export enum PlannerNodeName {
  Program = "Program",
  LineComment = "LineComment",
  Week = "Week",
  Day = "Day",
  ExerciseExpression = "ExerciseExpression",
  ExerciseName = "ExerciseName",
  NonSeparator = "NonSeparator",
  SectionSeparator = "SectionSeparator",
  ExerciseSection = "ExerciseSection",
  ReuseSection = "ReuseSection",
  ExerciseProperty = "ExerciseProperty",
  ExercisePropertyName = "ExercisePropertyName",
  Keyword = "Keyword",
  FunctionExpression = "FunctionExpression",
  FunctionName = "FunctionName",
  FunctionArgument = "FunctionArgument",
  Rep = "Rep",
  Int = "Int",
  Weight = "Weight",
  Number = "Number",
  Float = "Float",
  Percentage = "Percentage",
  Rpe = "Rpe",
  RepRange = "RepRange",
  WarmupExerciseSets = "WarmupExerciseSets",
  WarmupExerciseSet = "WarmupExerciseSet",
  WarmupSetPart = "WarmupSetPart",
  Set = "Set",
  None = "None",
  ExerciseSets = "ExerciseSets",
  ExerciseSet = "ExerciseSet",
  Timer = "Timer",
  SetPart = "SetPart",
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

  private getWarmupReps(setParts: string): { numberOfSets: number; reps: number } {
    let [numberOfSetsStr, repsStr] = setParts.split("x", 2);
    if (!numberOfSetsStr) {
      return { numberOfSets: 1, reps: 1 };
    }
    if (!repsStr) {
      repsStr = numberOfSetsStr;
      numberOfSetsStr = "1";
    }
    return {
      reps: parseInt(repsStr, 10),
      numberOfSets: parseInt(numberOfSetsStr, 10),
    };
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
    if (expr?.type.name === PlannerNodeName.Weight) {
      const value = this.getValue(expr);
      const unit = value.indexOf("kg") !== -1 ? "kg" : "lb";
      return W.Weight.build(parseFloat(value), unit);
    } else {
      return undefined;
    }
  }

  private evaluateWarmupSet(expr: SyntaxNode): IPlannerProgramExerciseWarmupSet {
    if (expr.type.name === PlannerNodeName.WarmupExerciseSet) {
      const setPartNodes = expr.getChildren(PlannerNodeName.WarmupSetPart);
      const setParts = setPartNodes.map((setPartNode) => this.getValue(setPartNode)).join("");
      const { numberOfSets, reps } = this.getWarmupReps(setParts);
      const percentageNode = expr.getChild(PlannerNodeName.Percentage);
      const weightNode = expr.getChild(PlannerNodeName.Weight);
      const percentage =
        percentageNode == null ? undefined : parseFloat(this.getValue(percentageNode).replace("%", ""));
      const weight = this.getWeight(weightNode);
      if (percentage) {
        return {
          type: "warmup",
          reps,
          numberOfSets,
          percentage,
        };
      } else {
        return {
          type: "warmup",
          reps,
          numberOfSets,
          weight: weight!,
        };
      }
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  private evaluateSet(expr: SyntaxNode): IPlannerProgramExerciseSet {
    if (expr.type.name === PlannerNodeName.ExerciseSet) {
      const setPartNodes = expr.getChildren(PlannerNodeName.SetPart);
      const setParts = setPartNodes.map((setPartNode) => this.getValue(setPartNode)).join("");
      const repRange = this.getRepRange(setParts);
      const rpeNode = expr.getChild(PlannerNodeName.Rpe);
      const timerNode = expr.getChild(PlannerNodeName.Timer);
      const percentageNode = expr.getChild(PlannerNodeName.Percentage);
      const weightNode = expr.getChild(PlannerNodeName.Weight);
      const rpe = rpeNode == null ? undefined : parseFloat(this.getValue(rpeNode).replace("@", ""));
      const timer = timerNode == null ? undefined : parseInt(this.getValue(timerNode).replace("s", ""), 10);
      const percentage =
        percentageNode == null ? undefined : parseFloat(this.getValue(percentageNode).replace("%", ""));
      const weight = this.getWeight(weightNode);
      return {
        repRange,
        timer,
        rpe,
        weight,
        percentage,
      };
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  private evaluateProgress(expr: SyntaxNode): IPlannerProgramProperty {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        throw new PlannerSyntaxError(`Missing value for the property '${name}'`, 0, 0);
      }
      const fnNameNode = valueNode.getChild(PlannerNodeName.FunctionName);
      if (fnNameNode == null) {
        assert(PlannerNodeName.FunctionName);
      }
      const fnName = this.getValue(fnNameNode);
      if (["lp", "sum", "dp"].indexOf(fnName) === -1) {
        throw new PlannerSyntaxError(`There's no such progression exists - '${fnName}'`, 0, 0);
      }
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
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
        name: "progress",
        fnName,
        fnArgs: fnArgs,
      };
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateWarmup(expr: SyntaxNode): IPlannerProgramExerciseWarmupSet[] {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const setsNode = expr.getChild(PlannerNodeName.WarmupExerciseSets);
      if (setsNode != null) {
        const none = setsNode.getChild(PlannerNodeName.None);
        if (none != null) {
          return [];
        }
        const sets = setsNode.getChildren(PlannerNodeName.WarmupExerciseSet);
        if (sets.length > 0) {
          return sets.map((set) => this.evaluateWarmupSet(set));
        }
      }
      return [];
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateProperty(expr: SyntaxNode): IPlannerProgramProperty | IPlannerProgramExerciseWarmupSet[] {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const nameNode = expr.getChild(PlannerNodeName.ExercisePropertyName);
      if (nameNode == null) {
        assert(PlannerNodeName.ExercisePropertyName);
      }
      const name = this.getValue(nameNode);
      if (name === "progress") {
        return this.evaluateProgress(expr);
      } else if (name === "warmup") {
        return this.evaluateWarmup(expr);
      } else {
        throw new PlannerSyntaxError(`There's no such property exists - '${name}'`, 0, 0);
      }
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateSection(
    expr: SyntaxNode
  ): IPlannerProgramExerciseSet[] | IPlannerProgramProperty | IPlannerProgramExerciseWarmupSet[] {
    if (expr.type.name === PlannerNodeName.ExerciseSection) {
      const setsNode = expr.getChild(PlannerNodeName.ExerciseSets);
      if (setsNode != null) {
        const sets = setsNode.getChildren(PlannerNodeName.ExerciseSet);
        if (sets.length > 0) {
          return sets.map((set) => this.evaluateSet(set));
        }
      }
      const property = expr.getChild(PlannerNodeName.ExerciseProperty);
      if (property != null) {
        return this.evaluateProperty(property);
      } else {
        assert(PlannerNodeName.ExerciseProperty);
      }
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  private isWarmupSets(
    sets: IPlannerProgramExerciseSet[] | IPlannerProgramExerciseWarmupSet[]
  ): sets is IPlannerProgramExerciseWarmupSet[] {
    return sets.length > 0 && "type" in sets[0] && sets[0].type === "warmup";
  }

  private extractNameParts(str: string): { name: string; label?: string; equipment?: string } {
    let [label, ...nameEquipmentItems] = str.split(":");
    if (nameEquipmentItems.length === 0) {
      nameEquipmentItems = [label];
      label = "";
    } else {
      label = label.trim();
    }
    const nameEquipment = nameEquipmentItems.join(":");
    let equipment: string | undefined;
    const parts = nameEquipment.split(",");
    if (parts.length > 1) {
      const potentialEquipment = parts[parts.length - 1]?.trim();
      if (potentialEquipment != null && (equipments as readonly string[]).indexOf(potentialEquipment) !== -1) {
        equipment = potentialEquipment;
        parts.pop();
      }
    }
    const name = parts.join(",");
    return { name, label: label ? label : undefined, equipment };
  }

  private evaluateExercise(expr: SyntaxNode): IPlannerProgramExercise | undefined {
    if (expr.type.name === PlannerNodeName.EmptyExpression || expr.type.name === PlannerNodeName.LineComment) {
      return undefined;
    } else if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      const nameNode = expr.getChild(PlannerNodeName.ExerciseName);
      if (nameNode == null) {
        assert("ExerciseName");
      }
      // eslint-disable-next-line prefer-const
      let { label, name, equipment } = this.extractNameParts(this.getValue(nameNode));
      const exercise = Exercise.findByName(name, this.customExercises);
      if (exercise == null) {
        this.error(`Unknown exercise ${name}`, nameNode);
      }
      equipment = equipment || exercise.defaultEquipment;
      const sectionNodes = expr.getChildren(PlannerNodeName.ExerciseSection);
      let hadRepRange = false;
      const allSets: IPlannerProgramExerciseSet[] = [];
      let allWarmupSets: IPlannerProgramExerciseWarmupSet[] | undefined;
      const allProperties: IPlannerProgramProperty[] = [];
      let isReusing = false;
      for (const sectionNode of sectionNodes) {
        const section = this.evaluateSection(sectionNode);
        if (Array.isArray(section)) {
          if (this.isWarmupSets(section)) {
            allWarmupSets = allWarmupSets || [];
            allWarmupSets.push(...section);
          } else {
            const sectionHasRepRange = section.some((set) => set.repRange != null);
            if (sectionHasRepRange) {
              if (hadRepRange) {
                throw new PlannerSyntaxError(`Exercise should only have rep range in one section`, 0, 0);
              }
              hadRepRange = true;
            }
            allSets.push(...section);
          }
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
        warmupSets: allWarmupSets,
        properties: allProperties,
      };
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  private evaluateProgram(expr: SyntaxNode): IPlannerProgramExercise[] {
    if (expr.type.name === PlannerNodeName.Program) {
      return CollectionUtils.compact(getChildren(expr).map((child) => this.evaluateExercise(child)));
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  public evaluate(programNode: SyntaxNode): IPlannerEvalResult {
    try {
      this.parse(programNode);
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
