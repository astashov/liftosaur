// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { Exercise, equipmentName } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { IEither } from "../../utils/types";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseRepRange,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramProperty,
  IPlannerProgramReuse,
} from "./models/types";
import { IWeight, IProgramState, IDayData, ISettings, IEquipment, equipments } from "../../types";
import * as W from "../../models/weight";
import { IPlannerProgramExerciseWarmupSet } from "./models/types";
import { PlannerNodeName } from "./plannerExerciseStyles";
import { ObjectUtils } from "../../utils/object";
import { Equipment } from "../../models/equipment";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { LiftoscriptSyntaxError } from "../../liftoscriptEvaluator";
import { Weight } from "../../models/weight";
import { MathUtils } from "../../utils/math";
import { PlannerToProgram2 } from "../../models/plannerToProgram2";
import { PlannerProgram } from "./models/plannerProgram";

export interface IPlannerTopLineItem {
  type: "exercise" | "comment" | "description" | "empty";
  value: string;
  fullName?: string;
  repeat?: number[];
  repeatRanges?: string[];
  description?: string;
  sections?: string;
  used?: boolean;
}

export class PlannerSyntaxError extends SyntaxError {
  public readonly line: number;
  public readonly offset: number;
  public readonly from: number;
  public readonly to: number;

  constructor(message: string, line: number, offset: number, from: number, to: number) {
    super(message);
    this.line = line;
    this.offset = offset;
    this.from = from;
    this.to = to;
  }
}

export type IPlannerEvalResult = IEither<IPlannerProgramExercise[], PlannerSyntaxError>;
export type IPlannerEvalFullResult = IEither<IPlannerExerciseEvaluatorWeek[], PlannerSyntaxError>;

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
  throw new PlannerSyntaxError(`Missing required nodes for ${name}, this should never happen`, 0, 0, 0, 1);
}

export interface IPlannerExerciseEvaluatorWeek {
  name: string;
  line: number;
  days: { name: string; line: number; exercises: IPlannerProgramExercise[] }[];
}

type IPlannerExerciseEvaluatorMode = "perday" | "full" | "onset";

export class PlannerExerciseEvaluator {
  private readonly script: string;
  private readonly mode: IPlannerExerciseEvaluatorMode;
  private dayData: IDayData;
  private readonly settings: ISettings;
  private weeks: IPlannerExerciseEvaluatorWeek[] = [];

  private latestDescriptions: string[][] = [];

  constructor(script: string, settings: ISettings, mode: IPlannerExerciseEvaluatorMode, dayData?: IDayData) {
    this.script = script;
    this.settings = settings;
    this.dayData = dayData || { day: 1, week: 1, dayInWeek: 1 };
    this.mode = mode;
  }

  private getValue(node: SyntaxNode): string {
    return this.getValueTrim(node).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  }

  private getValueTrim(node: SyntaxNode): string {
    return this.script.slice(node.from, node.to);
  }

  private error(message: string, node: SyntaxNode): never {
    const [line, offset] = this.getLineAndOffset(node);
    throw new PlannerSyntaxError(`${message} (${line}:${offset})`, line, offset, node.from, node.to);
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
    if (!setParts) {
      return undefined;
    }
    const [numberOfSetsStr, repRangeStr] = setParts.split("x", 2);
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
      isQuickAddSet: numberOfSetsStr.endsWith("+"),
    };
  }

  private getWeight(expr?: SyntaxNode | null): IWeight | undefined {
    if (expr?.type.name === PlannerNodeName.WeightWithPlus || expr?.type.name === PlannerNodeName.Weight) {
      const value = this.getValue(expr).replace("+", "");
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

  public static fnArgsToStateVars(fnArgs: string[], onError?: (message: string) => void): IProgramState {
    const state: IProgramState = {};
    for (const value of fnArgs) {
      const [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
      if (onError && (!fnArgKey || !fnArgValStr)) {
        onError(`Invalid argument ${value}`);
      }
      try {
        const fnArgVal = fnArgValStr.match(/(lb|kg)/)
          ? Weight.parse(fnArgValStr)
          : MathUtils.roundFloat(parseFloat(fnArgValStr), 2);
        state[fnArgKey] = fnArgVal ?? 0;
      } catch (e) {
        if (onError) {
          onError(`Invalid argument ${value}`);
        } else {
          throw e;
        }
      }
    }
    return state;
  }

  private evaluateSet(expr: SyntaxNode): IPlannerProgramExerciseSet {
    if (expr.type.name === PlannerNodeName.ExerciseSet) {
      const setPartNodes = expr.getChildren(PlannerNodeName.SetPart);
      const setParts = setPartNodes.map((setPartNode) => this.getValue(setPartNode)).join("");
      const repRange = this.getRepRange(setParts);
      const rpeNode = expr.getChild(PlannerNodeName.Rpe);
      const timerNode = expr.getChild(PlannerNodeName.Timer);
      const percentageNode = expr.getChild(PlannerNodeName.PercentageWithPlus);
      const weightNode = expr.getChild(PlannerNodeName.WeightWithPlus);
      const labelNode = expr.getChild(PlannerNodeName.SetLabel);
      const askWeight =
        (weightNode != null && this.getValue(weightNode).indexOf("+") !== -1) ||
        (percentageNode != null && this.getValue(percentageNode).indexOf("+") !== -1);
      const logRpe = rpeNode == null ? undefined : this.getValue(rpeNode).indexOf("+") !== -1;
      const rpe = rpeNode == null ? undefined : parseFloat(this.getValue(rpeNode).replace("@", "").replace("+", ""));
      const timer = timerNode == null ? undefined : parseInt(this.getValue(timerNode).replace("s", ""), 10);
      const percentage =
        percentageNode == null ? undefined : parseFloat(this.getValue(percentageNode).replace(/[%\+]/, ""));
      const weight = this.getWeight(weightNode);
      const label = labelNode
        ? getChildren(labelNode)
            .map((n) => this.getValue(n))
            .join(" ")
        : undefined;
      if (labelNode && label && label.length > 8) {
        this.error("Label length should be 8 chars max", labelNode);
      }
      return {
        repRange,
        timer,
        logRpe,
        rpe,
        weight,
        percentage,
        label,
        askWeight,
      };
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  private evaluateUpdate(expr: SyntaxNode, equipment?: IEquipment): IPlannerProgramProperty {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        throw this.error(`Missing value for the property 'update'`, expr);
      }
      const fnNameNode = valueNode.getChild(PlannerNodeName.FunctionName);
      if (fnNameNode == null) {
        assert(PlannerNodeName.FunctionName);
      }
      const fnName = this.getValue(fnNameNode);
      if (["custom"].indexOf(fnName) === -1) {
        this.error(`There's no such update progression exists - '${fnName}'`, fnNameNode);
      }
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      let script: string | undefined;
      let body: string | undefined;
      if (fnName === "custom") {
        const liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript);
        script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        if (fnArgs.length > 0) {
          this.error(`You cannot specify state variables for the update script`, fnNameNode);
        }
        const reuseLiftoscriptNode = valueNode
          .getChild(PlannerNodeName.ReuseLiftoscript)
          ?.getChild(PlannerNodeName.ReuseSection)
          ?.getChild(PlannerNodeName.ExerciseName);
        body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
        if (script) {
          const liftoscriptEvaluator = new ScriptRunner(
            script,
            {},
            Progress.createEmptyScriptBindings(this.dayData, this.settings),
            Progress.createScriptFunctions(this.settings),
            this.settings.units,
            { equipment, unit: this.settings.units },
            "update"
          );
          try {
            liftoscriptEvaluator.parse();
          } catch (e) {
            if (e instanceof LiftoscriptSyntaxError && liftoscriptNode) {
              const [line] = this.getLineAndOffset(liftoscriptNode);
              throw new PlannerSyntaxError(
                e.message,
                line + e.line,
                e.offset,
                liftoscriptNode.from + e.from,
                liftoscriptNode.from + e.to
              );
            } else {
              throw e;
            }
          }
        }
        if (!script && !body) {
          this.error(
            `'custom' update requires either to specify Liftoscript block or specify which one to reuse`,
            valueNode
          );
        }
      }
      return {
        name: "update",
        fnName,
        fnArgs: fnArgs,
        script,
        body,
      };
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateProgress(expr: SyntaxNode, equipment?: IEquipment): IPlannerProgramProperty {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        const none = expr.getChild(PlannerNodeName.None);
        if (none != null) {
          return {
            name: "progress",
            fnName: "none",
            fnArgs: [],
          };
        } else {
          throw this.error(`Missing value for the property 'progress'`, expr);
        }
      }
      const fnNameNode = valueNode.getChild(PlannerNodeName.FunctionName);
      if (fnNameNode == null) {
        assert(PlannerNodeName.FunctionName);
      }
      const fnName = this.getValue(fnNameNode);
      if (["lp", "sum", "dp", "custom", "none"].indexOf(fnName) === -1) {
        this.error(`There's no such progression exists - '${fnName}'`, fnNameNode);
      }
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      let script: string | undefined;
      let body: string | undefined;
      if (fnName === "lp") {
        if (fnArgs.length > 6) {
          this.error(`Linear Progression 'lp' only has 4 arguments max`, valueNode);
        } else if (fnArgs[0] && !fnArgs[0].endsWith("lb") && !fnArgs[0].endsWith("kg") && !fnArgs[0].endsWith("%")) {
          this.error(
            `1st argument of 'lp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            valueNode
          );
        } else if (fnArgs[1] != null && isNaN(parseInt(fnArgs[1], 10))) {
          this.error(`2nd argument of 'lp' should be a number of attempts - i.e. a number`, valueNode);
        } else if (fnArgs[2] != null && isNaN(parseInt(fnArgs[2], 10))) {
          this.error(
            `3rd argument of 'lp' should be a current number of successful attempts up to date - i.e. a number`,
            valueNode
          );
        } else if (
          fnArgs[3] != null &&
          !fnArgs[3].endsWith("lb") &&
          !fnArgs[3].endsWith("kg") &&
          !fnArgs[3].endsWith("%")
        ) {
          this.error(
            `4th argument of 'lp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            valueNode
          );
        } else if (fnArgs[4] != null && isNaN(parseInt(fnArgs[4], 10))) {
          this.error(`5th argument of 'lp' should be a number of failed attempts - i.e. a number`, valueNode);
        } else if (fnArgs[5] != null && isNaN(parseInt(fnArgs[5], 10))) {
          this.error(
            `6th argument of 'lp' should be a current number of failed attempts up to date - i.e. a number`,
            valueNode
          );
        }
      } else if (fnName === "sum") {
        if (fnArgs.length > 2) {
          this.error(`Reps Sum Progression 'sum' only has 2 arguments max`, valueNode);
        } else if (fnArgs[0] == null || isNaN(parseInt(fnArgs[0], 10))) {
          this.error(`1st argument of 'sum' should be a number of reps - i.e. a number`, valueNode);
        } else if (
          fnArgs[1] == null ||
          (!fnArgs[1].endsWith("lb") && !fnArgs[1].endsWith("kg") && !fnArgs[1].endsWith("%"))
        ) {
          this.error(
            `2nd argument of 'sum' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            valueNode
          );
        }
      } else if (fnName === "dp") {
        if (fnArgs.length !== 3) {
          this.error(`Double Progression 'dp' should have 3 arguments`, valueNode);
        } else if (
          fnArgs[0] == null ||
          (!fnArgs[0].endsWith("lb") && !fnArgs[0].endsWith("kg") && !fnArgs[0].endsWith("%"))
        ) {
          this.error(
            `1st argument of 'dp' should be weight (ending with 'lb' or 'kg') or percentage (ending with '%'). For example '10lb' or '30%'.`,
            valueNode
          );
        } else if (fnArgs[1] == null || isNaN(parseInt(fnArgs[1], 10))) {
          this.error(`2nd argument of 'dp' should be min reps in the range - i.e. a number, like 8`, valueNode);
        } else if (fnArgs[2] == null || isNaN(parseInt(fnArgs[2], 10))) {
          this.error(`3rd argument of 'dp' should be max reps in the range - i.e. a number, like 12`, valueNode);
        }
      } else if (fnName === "custom") {
        const liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript);
        script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        const state = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs, (message) => this.error(message, fnNameNode));
        if (script) {
          const liftoscriptEvaluator = new ScriptRunner(
            script,
            state,
            Progress.createEmptyScriptBindings(this.dayData, this.settings),
            Progress.createScriptFunctions(this.settings),
            this.settings.units,
            { equipment, unit: this.settings.units },
            "planner"
          );
          try {
            liftoscriptEvaluator.parse();
          } catch (e) {
            if (e instanceof LiftoscriptSyntaxError && liftoscriptNode) {
              const [line] = this.getLineAndOffset(liftoscriptNode);
              throw new PlannerSyntaxError(
                e.message,
                line + e.line,
                e.offset,
                liftoscriptNode.from + e.from,
                liftoscriptNode.from + e.to
              );
            } else {
              throw e;
            }
          }
        }
        const reuseLiftoscriptNode = valueNode
          .getChild(PlannerNodeName.ReuseLiftoscript)
          ?.getChild(PlannerNodeName.ReuseSection)
          ?.getChild(PlannerNodeName.ExerciseName);
        body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
        if (!script && !body) {
          this.error(
            `'custom' progression requires either to specify Liftoscript block or specify which one to reuse`,
            valueNode
          );
        }
      }
      return {
        name: "progress",
        fnName,
        fnArgs: fnArgs,
        script,
        body,
      };
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateWarmup(expr: SyntaxNode): IPlannerProgramExerciseWarmupSet[] {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const none = expr.getChild(PlannerNodeName.None);
      if (none != null) {
        return [];
      }
      const setsNode = expr.getChild(PlannerNodeName.WarmupExerciseSets);
      if (setsNode != null) {
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

  private evaluateProperty(
    expr: SyntaxNode,
    equipment?: IEquipment
  ):
    | { type: "progress"; data: IPlannerProgramProperty }
    | { type: "update"; data: IPlannerProgramProperty }
    | { type: "warmup"; data: IPlannerProgramExerciseWarmupSet[] }
    | { type: "used"; data: "" } {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const nameNode = expr.getChild(PlannerNodeName.ExercisePropertyName);
      if (nameNode == null) {
        assert(PlannerNodeName.ExercisePropertyName);
      }
      const name = this.getValue(nameNode);
      if (name === "progress") {
        return { type: "progress", data: this.evaluateProgress(expr, equipment) };
      } else if (name === "update") {
        return { type: "update", data: this.evaluateUpdate(expr, equipment) };
      } else if (name === "warmup") {
        return { type: "warmup", data: this.evaluateWarmup(expr) };
      } else if (name === "used") {
        return { type: "used", data: "" };
      } else {
        this.error(`There's no such property exists - '${name}'`, nameNode);
      }
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private getReuseWeekDay(weekDayNode: SyntaxNode | null): { week?: number; day?: number } {
    let week: number | undefined;
    let day: number | undefined;
    if (weekDayNode != null) {
      const result = weekDayNode.getChildren(PlannerNodeName.WeekOrDay).map((n) => {
        const child = getChildren(n)[0];
        if (child.type.name === PlannerNodeName.Int) {
          return parseInt(this.getValue(child), 10);
        } else {
          return undefined;
        }
      });
      if (result.length === 1) {
        day = result[0];
      } else {
        week = result[0];
        day = result[1];
      }
    }
    return { week, day };
  }

  private evaluateReuseNode(expr: SyntaxNode): { type: "reuse"; data: IPlannerProgramReuse } {
    if (expr.type.name === PlannerNodeName.ReuseSectionWithWeekDay) {
      const nameNode = expr.getChild(PlannerNodeName.ReuseSection)?.getChild(PlannerNodeName.ExerciseName);
      if (nameNode == null) {
        assert(PlannerNodeName.ExerciseName);
      }
      const name = this.getValue(nameNode);
      const { week, day } = this.getReuseWeekDay(expr.getChild(PlannerNodeName.WeekDay));
      return { type: "reuse", data: { exercise: name, week, day } };
    } else {
      assert(PlannerNodeName.ReuseSectionWithWeekDay);
    }
  }

  private evaluateSection(
    expr: SyntaxNode,
    equipment?: IEquipment
  ):
    | { type: "sets"; data: IPlannerProgramExerciseSet[]; isCurrent: boolean }
    | { type: "progress"; data: IPlannerProgramProperty }
    | { type: "update"; data: IPlannerProgramProperty }
    | { type: "reuse"; data: IPlannerProgramReuse }
    | { type: "warmup"; data: IPlannerProgramExerciseWarmupSet[] }
    | { type: "used"; data: "" } {
    if (expr.type.name === PlannerNodeName.ExerciseSection) {
      const reuseNode = expr.getChild(PlannerNodeName.ReuseSectionWithWeekDay);
      if (reuseNode != null) {
        return this.evaluateReuseNode(reuseNode);
      }
      const setsNode = expr.getChild(PlannerNodeName.ExerciseSets);
      if (setsNode != null) {
        const sets = setsNode.getChildren(PlannerNodeName.ExerciseSet);
        const isCurrent = setsNode.getChild(PlannerNodeName.CurrentVariation) != null;
        if (sets.length > 0) {
          return { type: "sets", data: sets.map((set) => this.evaluateSet(set)), isCurrent };
        }
      }
      const property = expr.getChild(PlannerNodeName.ExerciseProperty);
      if (property != null) {
        return this.evaluateProperty(property, equipment);
      } else {
        assert(PlannerNodeName.ExerciseProperty);
      }
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
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
      const allowedEquipments = [
        ...equipments,
        ...equipments.map((e) => equipmentName(e, this.settings.equipment)),
        ...ObjectUtils.keys(this.settings.equipment),
        ...ObjectUtils.keys(this.settings.equipment).map((e) => equipmentName(e, this.settings.equipment)),
      ].map((e) => e.toLowerCase().trim());
      if (potentialEquipment != null && allowedEquipments.indexOf(potentialEquipment.toLowerCase()) !== -1) {
        const equipmentKey = Equipment.equipmentKeyByName(potentialEquipment, this.settings.equipment);
        equipment = equipmentKey;
        parts.pop();
      }
    }
    const name = parts.join(",").trim();
    return { name, label: label ? label : undefined, equipment };
  }

  private addDescription(value: string): void {
    value = value.replace(/^\/\//, "").trim();
    if (this.latestDescriptions.length === 0) {
      this.latestDescriptions.push([]);
    }
    this.latestDescriptions[this.latestDescriptions.length - 1].push(value);
  }

  private getRepeat(expr: SyntaxNode): number[] {
    if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      const repeatNode = expr.getChild(PlannerNodeName.Repeat);
      if (repeatNode == null) {
        return [];
      }
      const result: Set<number> = new Set();
      const children = getChildren(repeatNode);
      for (const childNode of children) {
        if (childNode.type.name === PlannerNodeName.Rep) {
          result.add(parseInt(this.getValue(childNode), 10));
        } else {
          const [from, to] = getChildren(childNode).map((n) => parseInt(this.getValue(n), 10));
          for (let i = from; i <= to; i += 1) {
            result.add(i);
          }
        }
      }
      return Array.from(result).sort((a, b) => a - b);
    } else {
      assert(PlannerNodeName.ExerciseExpression);
    }
  }

  private evaluateExercise(expr: SyntaxNode): void {
    if (expr.type.name === PlannerNodeName.EmptyExpression || expr.type.name === PlannerNodeName.TripleLineComment) {
      if (this.latestDescriptions.length > 0) {
        this.latestDescriptions.push([]);
      }
      return;
    } else if (expr.type.name === PlannerNodeName.Week) {
      if (this.mode === "perday") {
        this.error(
          `You cannot specify weeks in the per-day exercise lists. Switch to the full program mode for that.`,
          expr
        );
      }
      const weekName = this.getValueTrim(expr).replace(/^#+/, "").trim();
      const [line] = this.getLineAndOffset(expr);
      this.weeks.push({ name: weekName, line, days: [] });
      this.dayData = { day: this.dayData.day, week: this.weeks.length + 1, dayInWeek: 0 };
    } else if (expr.type.name === PlannerNodeName.Day) {
      if (this.mode === "perday") {
        this.error(
          `You cannot specify days in the per-day exercise lists. Switch to the full program mode for that.`,
          expr
        );
      }
      if (this.weeks.length === 0) {
        this.error(`You need to specify a week before a day`, expr);
      }
      const dayName = this.getValueTrim(expr).replace(/^#+/, "").trim();
      const [line] = this.getLineAndOffset(expr);
      this.weeks[this.weeks.length - 1].days.push({ name: dayName, line, exercises: [] });
      this.dayData = {
        day: this.dayData.day + 1,
        week: this.dayData.week,
        dayInWeek: (this.dayData.dayInWeek || 0) + 1,
      };
    } else if (expr.type.name === PlannerNodeName.LineComment) {
      const value = this.getValueTrim(expr).trim();
      this.addDescription(value);
      return undefined;
    } else if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      if (this.mode === "full" && (this.weeks.length === 0 || this.weeks[this.weeks.length - 1].days.length === 0)) {
        this.error(`You should first define a week and a day before listing exercises.`, expr);
      } else if (this.weeks.length === 0) {
        this.weeks.push({ name: "Week 1", line: 1, days: [{ name: "Day 1", line: 1, exercises: [] }] });
      }
      const nameNode = expr.getChild(PlannerNodeName.ExerciseName);
      if (nameNode == null) {
        assert("ExerciseName");
      }
      // eslint-disable-next-line prefer-const
      let { label, name, equipment } = this.extractNameParts(this.getValue(nameNode));
      const exercise = Exercise.findByName(name, this.settings.exercises);
      if (exercise == null) {
        this.error(`Unknown exercise ${name}`, nameNode);
      }
      equipment = equipment || exercise.defaultEquipment;
      const sectionNodes = expr.getChildren(PlannerNodeName.ExerciseSection);
      const setVariations: IPlannerProgramExerciseSetVariation[] = [];
      const allSets: IPlannerProgramExerciseSet[] = [];
      let allWarmupSets: IPlannerProgramExerciseWarmupSet[] | undefined;
      let reuse: IPlannerProgramReuse | undefined;
      let notused: boolean = false;
      const repeat = this.getRepeat(expr);
      const allProperties: IPlannerProgramProperty[] = [];
      const text = this.getValueTrim(expr).trim();
      for (const sectionNode of sectionNodes) {
        const section = this.evaluateSection(sectionNode, equipment);
        if (section.type === "sets") {
          allSets.push(...section.data);
          if (section.data.some((set) => set.repRange != null)) {
            setVariations.push({ sets: section.data, isCurrent: section.isCurrent });
          }
        } else if (section.type === "warmup") {
          allWarmupSets = allWarmupSets || [];
          allWarmupSets.push(...section.data);
        } else if (section.type === "progress") {
          allProperties.push(section.data);
        } else if (section.type === "update") {
          allProperties.push(section.data);
        } else if (section.type === "reuse") {
          reuse = section.data;
        } else if (section.type === "used") {
          notused = true;
        } else {
          throw new Error(`Unexpected section type`);
        }
      }
      const hasRepRanges = allSets.some((set) => set.repRange);
      if (hasRepRanges && reuse) {
        this.error("If you're reusing sets x reps, you cannot also specify them in this exercise", nameNode);
      }
      if (!hasRepRanges && !reuse) {
        this.error("Exercise must have sets x reps specified in one of sections", nameNode);
      }
      const rpe = allSets.find((set) => set.repRange == null && set.rpe != null)?.rpe;
      const timer = allSets.find((set) => set.repRange == null && set.timer != null)?.timer;
      const percentage = allSets.find((set) => set.repRange == null && set.percentage != null)?.percentage;
      const weight = allSets.find((set) => set.repRange == null && set.weight != null)?.weight;
      const logRpe = allSets.find((set) => set.repRange == null && set.logRpe != null)?.logRpe;
      const askWeight = allSets.find((set) => set.repRange == null && set.askWeight != null)?.askWeight;
      const [line] = this.getLineAndOffset(expr);
      const rawDescriptions: string[] = this.latestDescriptions.map((d) => d.join("\n"));
      const currentDescriptionIndex = rawDescriptions.findIndex((d) => d.startsWith("!"));
      const descriptions = rawDescriptions.map((d, i) => ({
        value: d.replace(/^!/, "").trim(),
        isCurrent: i === currentDescriptionIndex,
      }));
      this.latestDescriptions = [];

      const plannerExercise: IPlannerProgramExercise = {
        label,
        text,
        repeat,
        name,
        equipment,
        line,
        notused: notused,
        sets: allSets,
        setVariations,
        descriptions,
        warmupSets: allWarmupSets,
        properties: allProperties,
        reuse,
        skipProgress: [],
        globals: {
          rpe,
          logRpe,
          askWeight,
          timer,
          percentage,
          weight,
        },
      };
      this.weeks[this.weeks.length - 1].days[this.weeks[this.weeks.length - 1].days.length - 1].exercises.push(
        plannerExercise
      );
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  private evaluateProgram(expr: SyntaxNode): IPlannerExerciseEvaluatorWeek[] {
    if (expr.type.name === PlannerNodeName.Program) {
      this.weeks = [];
      for (const child of CollectionUtils.compact(getChildren(expr))) {
        this.evaluateExercise(child);
      }
      return this.weeks;
    } else {
      this.error(`Unexpected node type ${expr.node.type.name}`, expr);
    }
  }

  public static findOriginalExercisesAtWeekDay(
    settings: ISettings,
    body: string,
    program: IPlannerEvalResult[][],
    atWeek: number,
    atDay?: number
  ): IPlannerProgramExercise[] {
    const originalExercises: IPlannerProgramExercise[] = [];
    const week = program[atWeek - 1];
    if (week != null) {
      for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
        if (atDay == null || atDay === dayIndex + 1) {
          const day = week[dayIndex];
          if (day.success) {
            for (const e of day.data) {
              const key = PlannerToProgram2.plannerExerciseKey(e, settings);
              const bodyKey = PlannerProgram.nameToKey(body, settings);
              if (key === bodyKey) {
                originalExercises.push(e);
              }
            }
          }
        }
      }
    }
    return originalExercises;
  }

  private findOriginalExercise(body: string, program: IPlannerEvalResult[][]): IPlannerProgramExercise | undefined {
    let originalExercise: IPlannerProgramExercise | undefined;
    for (let weekIndex = 0; weekIndex < program.length; weekIndex++) {
      const week = program[weekIndex];
      for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
        const day = week[dayIndex];
        if (day.success) {
          for (const e of day.data) {
            const key = PlannerToProgram2.plannerExerciseKey(e, this.settings);
            const bodyKey = PlannerProgram.nameToKey(body, this.settings);
            if (key === bodyKey) {
              originalExercise = e;
            }
          }
          if (originalExercise) {
            break;
          }
        }
      }
      if (originalExercise) {
        break;
      }
    }
    return originalExercise;
  }

  public postEvaluateCheck(expr: SyntaxNode, program: IPlannerEvalResult[][]): PlannerSyntaxError | undefined {
    if (this.mode === "full") {
      this.dayData = { day: 0, week: 0, dayInWeek: 0 };
    }
    try {
      const cursor = expr.cursor();
      do {
        if (cursor.node.type.name === PlannerNodeName.Week) {
          if (this.mode === "full") {
            this.dayData = { day: this.dayData.day, week: (this.dayData.week ?? 0) + 1, dayInWeek: 0 };
          }
        } else if (cursor.node.type.name === PlannerNodeName.Day) {
          if (this.mode === "full") {
            this.dayData = {
              day: this.dayData.day + 1,
              week: this.dayData.week,
              dayInWeek: (this.dayData.dayInWeek || 0) + 1,
            };
          }
        } else if (cursor.node.type.name === PlannerNodeName.ReuseSectionWithWeekDay) {
          const reuseLiftoscriptNode = cursor.node
            .getChild(PlannerNodeName.ReuseSection)
            ?.getChild(PlannerNodeName.ExerciseName);
          const { week, day } = this.getReuseWeekDay(cursor.node.getChild(PlannerNodeName.WeekDay));
          const body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
          if (body) {
            const originalExercises = PlannerExerciseEvaluator.findOriginalExercisesAtWeekDay(
              this.settings,
              body,
              program,
              week ?? this.dayData.week ?? 1,
              day
            );
            if (originalExercises.length > 1) {
              this.error(
                `There're several exercises matching, please be more specific with [week:day] syntax`,
                cursor.node
              );
            }
            const originalExercise = originalExercises[0];
            if (!originalExercise) {
              this.error(
                `No such exercise ${body} at week: ${week ?? this.dayData.week}${day != null ? `, day: ${day}` : ""}`,
                cursor.node
              );
            }
            if (originalExercise.reuse?.exercise != null) {
              this.error(`Original exercise cannot reuse another exercise's sets x reps`, cursor.node);
            }
            if (originalExercise.setVariations.length > 1) {
              this.error(`Original exercise cannot have mutliple set variations`, cursor.node);
            }
          }
        } else if (cursor.node.type.name === PlannerNodeName.ExerciseProperty) {
          const fnExpressionNode = cursor.node.getChild(PlannerNodeName.FunctionExpression);
          const fnNameNode = fnExpressionNode?.getChild(PlannerNodeName.FunctionName);
          const propertyNameNode = cursor.node.getChild(PlannerNodeName.ExercisePropertyName);
          const propertyName = propertyNameNode ? this.getValue(propertyNameNode) : undefined;
          if (fnExpressionNode && fnNameNode) {
            if (propertyName === "progress" && this.getValue(fnNameNode) === "custom") {
              const reuseLiftoscriptNode = fnExpressionNode
                .getChild(PlannerNodeName.ReuseLiftoscript)
                ?.getChild(PlannerNodeName.ReuseSection)
                ?.getChild(PlannerNodeName.ExerciseName);
              const body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
              if (body) {
                const originalExercise = this.findOriginalExercise(body, program);
                if (!originalExercise) {
                  this.error(`No such exercise ${body}`, cursor.node);
                }
                if (originalExercise.properties.find((p) => p.name === "progress")?.body != null) {
                  this.error(`Original exercise cannot reuse another progress`, cursor.node);
                }
                const originalProgress = originalExercise.properties.find((p) => p.name === "progress");
                if (!originalProgress) {
                  this.error("Original exercise should specify progress", cursor.node);
                }
                if (originalProgress.fnName !== "custom") {
                  this.error("Original exercise should specify custom progress", cursor.node);
                }
                const fnArgs = fnExpressionNode
                  .getChildren(PlannerNodeName.FunctionArgument)
                  .map((argNode) => this.getValue(argNode));
                const originalState = PlannerExerciseEvaluator.fnArgsToStateVars(originalProgress.fnArgs);
                const state = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs);
                for (const key of ObjectUtils.keys(originalState)) {
                  const value = originalState[key];
                  if (state[key] == null) {
                    this.error(`Missing state variable ${key}`, fnExpressionNode);
                  }
                  if (Weight.type(value) !== Weight.type(state[key])) {
                    this.error(`Wrong type of state variable ${key}`, fnExpressionNode);
                  }
                }
              }
            } else if (propertyName === "update" && this.getValue(fnNameNode) === "custom") {
              const reuseLiftoscriptNode = fnExpressionNode
                .getChild(PlannerNodeName.ReuseLiftoscript)
                ?.getChild(PlannerNodeName.ReuseSection)
                ?.getChild(PlannerNodeName.ExerciseName);
              const body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
              if (body) {
                const originalExercise = this.findOriginalExercise(body, program);
                if (!originalExercise) {
                  this.error(`No such exercise ${body}`, cursor.node);
                }
                if (originalExercise.properties.find((p) => p.name === "update")?.body != null) {
                  this.error(`Original exercise cannot reuse another update`, cursor.node);
                }
                const originalUpdate = originalExercise.properties.find((p) => p.name === "update");
                if (!originalUpdate) {
                  this.error("Original exercise should specify update", cursor.node);
                }
              }
            }
          }
        }
      } while (cursor.next());
      return undefined;
    } catch (e) {
      if (e instanceof PlannerSyntaxError) {
        return e;
      } else {
        throw e;
      }
    }
  }

  public evaluate(programNode: SyntaxNode): IPlannerEvalFullResult {
    try {
      this.parse(programNode);
      const program = this.evaluateProgram(programNode);
      return { data: program, success: true };
    } catch (e) {
      if (e instanceof PlannerSyntaxError) {
        return { error: e, success: false };
      } else {
        throw e;
      }
    }
  }

  public topLineMap(programNode: SyntaxNode): IPlannerTopLineItem[] {
    if (programNode.type.name !== PlannerNodeName.Program) {
      this.error(`Unexpected node type ${programNode.type.name} - should be Program`, programNode);
    }
    const children = getChildren(programNode);
    const result: IPlannerTopLineItem[] = [];
    let lastDescriptions: string[] = [];
    for (const child of children) {
      if (child.type.name === PlannerNodeName.ExerciseExpression) {
        const nameNode = child.getChild(PlannerNodeName.ExerciseName)!;
        const fullName = this.getValue(nameNode);
        const { label, name, equipment } = this.extractNameParts(fullName);
        const exercise = Exercise.findByName(name, this.settings.exercises);
        const key = `${label ? `${label}-` : ""}${name}-${
          equipment || exercise?.defaultEquipment || "bodyweight"
        }`.toLowerCase();
        const repeat = this.getRepeat(child);
        const sections = child
          .getChildren(PlannerNodeName.ExerciseSection)
          .map((section) => this.getValueTrim(section).trim())
          .join(" / ");
        result.push({
          type: "exercise",
          fullName,
          value: key,
          repeat,
          description: lastDescriptions.join("\n"),
          sections,
        });
        lastDescriptions = [];
      } else if (child.type.name === PlannerNodeName.LineComment) {
        const description = this.getValueTrim(child).trim();
        lastDescriptions.push(description);
        result.push({ type: "description", value: description });
      } else if (child.type.name === PlannerNodeName.TripleLineComment) {
        result.push({ type: "comment", value: this.getValueTrim(child).trim() });
      } else if (child.type.name === PlannerNodeName.EmptyExpression) {
        result.push({ type: "empty", value: "" });
      } else {
        this.error(
          `Unexpected node type ${child.type.name}, should be only exercise, comment, description or empty line`,
          child
        );
      }
    }
    return result;
  }
}
