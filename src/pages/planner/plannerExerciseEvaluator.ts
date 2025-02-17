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
  IPlannerProgramProgress,
  IPlannerProgramReuse,
  IPlannerProgramState,
  IPlannerProgramUpdate,
} from "./models/types";
import { IWeight, IDayData, ISettings, IExerciseType, IUnit } from "../../types";
import * as W from "../../models/weight";
import { IPlannerProgramExerciseWarmupSet } from "./models/types";
import { PlannerNodeName } from "./plannerExerciseStyles";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { LiftoscriptSyntaxError } from "../../liftoscriptEvaluator";
import { Weight } from "../../models/weight";
import { MathUtils } from "../../utils/math";
import { PlannerKey } from "./plannerKey";
import { ObjectUtils } from "../../utils/object";

export interface IPlannerTopLineItem {
  type: "exercise" | "comment" | "description" | "empty";
  value: string;
  order?: number;
  fullName?: string;
  repeat?: number[];
  repeatRanges?: string[];
  descriptions?: string[];
  sections?: string;
  sectionsToReuse?: string;
  used?: boolean;
}

export type IPlannerSyntaxPointer = { line: number; offset: number; from: number; to: number };

export class PlannerSyntaxError extends SyntaxError {
  public readonly line: number;
  public readonly offset: number;
  public readonly from: number;
  public readonly to: number;

  public static fromPoint(
    fullName: string | undefined,
    message: string,
    point: IPlannerSyntaxPointer
  ): PlannerSyntaxError {
    return new PlannerSyntaxError(
      `${fullName ? `${fullName}: ` : ""}${message} (${point.line}:${point.offset})`,
      point.line,
      point.offset,
      point.from,
      point.to
    );
  }

  constructor(message: string, line: number, offset: number, from: number, to: number) {
    super(message);
    this.line = line;
    this.offset = offset;
    this.from = from;
    this.to = to;
  }

  public toString(): string {
    return this.message;
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

  public static applyChangesToScript(script: string, ranges: [number, number, string][]): string {
    let offset = 0;
    while (ranges.length > 0) {
      const [from, to, replacement] = ranges.shift()!;
      script = script.slice(0, from + offset) + replacement + script.slice(to + offset);
      offset += replacement.length - (to - from);
    }
    return script;
  }

  public static isEqualProgress(a: IPlannerProgramProgress, b: IPlannerProgramProgress): boolean {
    return ObjectUtils.isEqual(a, b);
  }

  public static isEqualUpdate(a: IPlannerProgramUpdate, b: IPlannerProgramUpdate): boolean {
    return ObjectUtils.isEqual(a, b);
  }

  private getPoint(node: SyntaxNode): IPlannerSyntaxPointer {
    const [line, offset] = this.getLineAndOffset(node);
    return { line, offset, from: node.from, to: node.to };
  }

  private error(message: string, node: SyntaxNode): never {
    const point = this.getPoint(node);
    throw PlannerSyntaxError.fromPoint(undefined, message, point);
  }

  public static getLineAndOffset(script: string, node: SyntaxNode): [number, number] {
    const linesLengths = script.split("\n").map((l) => l.length + 1);
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

  private getLineAndOffset(node: SyntaxNode): [number, number] {
    return PlannerExerciseEvaluator.getLineAndOffset(this.script, node);
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
      const weight = this.getWeight(weightNode) ?? (percentage != null ? Weight.buildPct(percentage) : undefined);
      return {
        type: "warmup",
        reps,
        numberOfSets,
        weight,
      };
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  public static fnArgsToStateVars(fnArgs: string[], onError?: (message: string) => void): IPlannerProgramState {
    const state: IPlannerProgramState = [];
    for (const value of fnArgs) {
      // eslint-disable-next-line prefer-const
      let [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
      if (onError && (!fnArgKey || !fnArgValStr)) {
        onError(`Invalid argument ${value}`);
      }
      if (fnArgKey.endsWith("+")) {
        fnArgKey = fnArgKey.replace("+", "");
      }
      try {
        const fnArgVal = fnArgValStr.match(/(lb|kg)/)
          ? Weight.parse(fnArgValStr)
          : MathUtils.roundFloat(parseFloat(fnArgValStr), 2);
        state.push([fnArgKey, fnArgVal ?? 0]);
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
        weight: weight ?? (percentage != null ? Weight.buildPct(percentage) : undefined),
        label,
        askWeight,
      };
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  private evaluateId(expr: SyntaxNode): number[] {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        throw this.error(`Missing value for the property 'id'`, expr);
      }
      const fnNameNode = valueNode.getChild(PlannerNodeName.FunctionName);
      if (fnNameNode == null) {
        assert(PlannerNodeName.FunctionName);
      }
      const fnName = this.getValue(fnNameNode);
      if (["tags"].indexOf(fnName) === -1) {
        this.error(`There's no such id type - '${fnName}'`, fnNameNode);
      }
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      if (fnName === "tags") {
        if (fnArgs.length === 0) {
          this.error(`You should provide the list of numbers in "tags"`, fnNameNode);
        }
      }
      return fnArgs.map((arg) => parseInt(arg, 10)).filter((t) => !isNaN(t));
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateUpdate(expr: SyntaxNode, exerciseType?: IExerciseType): IPlannerProgramUpdate {
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
      let reuse: IPlannerProgramReuse | undefined;
      let liftoscriptNode: SyntaxNode | undefined;
      let stateKeys: string[] = [];
      if (fnName === "custom") {
        liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript) || undefined;
        script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        if (fnArgs.length > 0) {
          this.error(`State variables for the update script are taken from "progress" block`, fnNameNode);
        }
        const reuseSectionWithWeekDayNode = valueNode
          .getChild(PlannerNodeName.ReuseLiftoscript)
          ?.getChild(PlannerNodeName.ReuseSectionWithWeekDay);
        reuse = reuseSectionWithWeekDayNode ? this.evaluateReuseNode(reuseSectionWithWeekDayNode)?.data : undefined;
        if (script) {
          const liftoscriptEvaluator = new ScriptRunner(
            script,
            {},
            {},
            Progress.createEmptyScriptBindings(this.dayData, this.settings),
            Progress.createScriptFunctions(this.settings),
            this.settings.units,
            { exerciseType, unit: this.settings.units, prints: [] },
            "update"
          );
          stateKeys = [...liftoscriptEvaluator.getStateVariableKeys()];
        }
        if (!script && !reuse) {
          this.error(
            `'custom' update requires either to specify Liftoscript block or specify which one to reuse`,
            valueNode
          );
        }
      }
      return {
        type: "custom",
        stateKeys,
        script,
        liftoscriptNode,
        reuse,
      };
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateProgress(expr: SyntaxNode, exerciseType?: IExerciseType): IPlannerProgramProgress {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        const none = expr.getChild(PlannerNodeName.None);
        if (none != null) {
          return { type: "none" };
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
      let progress: IPlannerProgramProgress;
      if (fnName === "lp") {
        if (fnArgs.length > 6) {
          this.error(`Linear Progression 'lp' only has 6 arguments max`, valueNode);
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
        const increment = fnArgs[0] ? Weight.parse(fnArgs[0]) : Weight.build(0, this.settings.units);
        const decrement = fnArgs[3] ? Weight.parse(fnArgs[3]) : Weight.build(0, this.settings.units);
        progress = {
          type: "lp",
          increment: increment ?? Weight.build(0, this.settings.units),
          successes: fnArgs[2] ? parseInt(fnArgs[2], 10) : 1,
          successCounter: fnArgs[3] ? parseInt(fnArgs[3], 10) : 0,
          decrement: decrement ?? Weight.build(0, this.settings.units),
          failures: fnArgs[5] ? parseInt(fnArgs[5], 10) : 0,
          failureCounter: fnArgs[6] ? parseInt(fnArgs[6], 10) : 0,
        };
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
        const increment = fnArgs[1] ? Weight.parse(fnArgs[1]) : Weight.build(0, this.settings.units);
        progress = {
          type: "sum",
          increment: increment ?? Weight.build(0, this.settings.units),
          reps: fnArgs[0] ? parseInt(fnArgs[0], 10) : 0,
        };
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
        const increment = fnArgs[0] ? Weight.parse(fnArgs[0]) : Weight.build(0, this.settings.units);
        progress = {
          type: "dp",
          increment: increment ?? Weight.build(0, this.settings.units),
          minReps: fnArgs[1] ? parseInt(fnArgs[1], 10) : 0,
          maxReps: fnArgs[2] ? parseInt(fnArgs[2], 10) : 0,
        };
      } else if (fnName === "custom") {
        const liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript);
        script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        const state = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs, (message) => this.error(message, fnNameNode));
        if (script) {
          const liftoscriptEvaluator = new ScriptRunner(
            script,
            ObjectUtils.fromPairs(state),
            {},
            Progress.createEmptyScriptBindings(this.dayData, this.settings),
            Progress.createScriptFunctions(this.settings),
            this.settings.units,
            { exerciseType, unit: this.settings.units, prints: [] },
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
        const reuseSectionWithWeekDayNode = valueNode
          .getChild(PlannerNodeName.ReuseLiftoscript)
          ?.getChild(PlannerNodeName.ReuseSectionWithWeekDay);
        const reuse = reuseSectionWithWeekDayNode
          ? this.evaluateReuseNode(reuseSectionWithWeekDayNode)?.data
          : undefined;
        if (!script && !reuse) {
          this.error(
            `'custom' progression requires either to specify Liftoscript block or specify which one to reuse`,
            valueNode
          );
        }
        return {
          type: "custom",
          state,
          script,
          reuse,
        };
      } else if (fnName === "none") {
        progress = { type: "none" };
      } else {
        throw new SyntaxError(`Unknown progression type: ${fnName}`);
      }
      return progress;
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
    exerciseType?: IExerciseType
  ):
    | { type: "progress"; data: IPlannerProgramProgress }
    | { type: "update"; data: IPlannerProgramUpdate }
    | { type: "warmup"; data: IPlannerProgramExerciseWarmupSet[] }
    | { type: "id"; data: number[] }
    | { type: "used"; data: "" } {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const nameNode = expr.getChild(PlannerNodeName.ExercisePropertyName);
      if (nameNode == null) {
        assert(PlannerNodeName.ExercisePropertyName);
      }
      const name = this.getValue(nameNode);
      if (name === "progress") {
        return { type: "progress", data: this.evaluateProgress(expr, exerciseType) };
      } else if (name === "update") {
        return { type: "update", data: this.evaluateUpdate(expr, exerciseType) };
      } else if (name === "warmup") {
        return { type: "warmup", data: this.evaluateWarmup(expr) };
      } else if (name === "id") {
        return { type: "id", data: this.evaluateId(expr) };
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
      return { type: "reuse", data: { fullName: name, week, day } };
    } else {
      assert(PlannerNodeName.ReuseSectionWithWeekDay);
    }
  }

  private evaluateSection(
    expr: SyntaxNode,
    exerciseType?: IExerciseType
  ):
    | { type: "sets"; data: IPlannerProgramExerciseSet[]; isCurrent: boolean }
    | { type: "progress"; data: IPlannerProgramProgress }
    | { type: "update"; data: IPlannerProgramUpdate }
    | { type: "id"; data: number[] }
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
        return this.evaluateProperty(property, exerciseType);
      } else {
        assert(PlannerNodeName.ExerciseProperty);
      }
    } else {
      assert(PlannerNodeName.ExerciseSection);
    }
  }

  public static extractNameParts(
    str: string,
    settings: ISettings
  ): { name: string; label?: string; equipment?: string } {
    let [label, ...nameEquipmentItems] = str.split(":");
    if (nameEquipmentItems.length === 0) {
      nameEquipmentItems = [label];
      label = "";
    } else {
      label = label.trim();
    }
    const nameEquipment = nameEquipmentItems.join(":").trim();
    const matchingExercise = Exercise.findByNameAndEquipment(nameEquipment, settings.exercises);
    if (matchingExercise) {
      return { name: matchingExercise.name, label: label ? label : undefined, equipment: matchingExercise.equipment };
    }
    return { name: nameEquipment, label: label ? label : undefined };
  }

  private addDescription(value: string): void {
    value = value.replace(/^\/\//, "").trim();
    if (this.latestDescriptions.length === 0) {
      this.latestDescriptions.push([]);
    }
    this.latestDescriptions[this.latestDescriptions.length - 1].push(value);
  }

  private getOrder(expr: SyntaxNode): number {
    if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      const repeatNode = expr.getChild(PlannerNodeName.Repeat);
      if (repeatNode == null) {
        return 0;
      }
      const children = getChildren(repeatNode);
      for (const childNode of children) {
        if (childNode.type.name === PlannerNodeName.Rep) {
          return parseInt(this.getValue(childNode), 10);
        }
      }
      return 0;
    } else {
      assert(PlannerNodeName.ExerciseExpression);
    }
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
        if (childNode.type.name === PlannerNodeName.RepRange) {
          const [from, to] = getChildren(childNode).map((n) => parseInt(this.getValue(n), 10));
          for (let i = from; i <= to; i += 1) {
            result.add(i);
          }
          break;
        }
      }
      return Array.from(result).sort((a, b) => a - b);
    } else {
      assert(PlannerNodeName.ExerciseExpression);
    }
  }

  private getRepeatRanges(numbers: number[]): string[] {
    // Check if the input array is empty
    if (numbers.length === 0) {
      return [];
    }

    const ranges: string[] = [];
    let rangeStart = numbers[0];
    let rangeEnd = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === rangeEnd + 1) {
        // If the current number is consecutive, extend the current range
        rangeEnd = numbers[i];
      } else {
        // If not consecutive, add the current range to results and start a new range
        ranges.push(`${rangeStart}-${rangeEnd}`);
        rangeStart = numbers[i];
        rangeEnd = numbers[i];
      }
    }

    // Add the last range to results
    ranges.push(`${rangeStart}-${rangeEnd}`);

    return ranges;
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
      const fullName = this.getValue(nameNode);
      // eslint-disable-next-line prefer-const
      let { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, this.settings);
      const key = PlannerKey.fromFullName(fullName, this.settings);
      const shortName = `${name}${equipment ? `, ${equipmentName(equipment)}` : ""}`;
      const exercise = Exercise.findByNameAndEquipment(name, this.settings.exercises);
      if (exercise == null) {
        this.error(`Unknown exercise ${name}`, nameNode);
      }
      const sectionNodes = expr.getChildren(PlannerNodeName.ExerciseSection);
      const setVariations: IPlannerProgramExerciseSetVariation[] = [];
      const allSets: IPlannerProgramExerciseSet[] = [];
      let allWarmupSets: IPlannerProgramExerciseWarmupSet[] | undefined;
      let reuse: IPlannerProgramReuse | undefined;
      let notused: boolean = false;
      const repeat = this.getRepeat(expr);
      const order = this.getOrder(expr);
      const text = this.getValueTrim(expr).trim();
      let progress: IPlannerProgramProgress | undefined;
      let update: IPlannerProgramUpdate | undefined;
      let tags: number[] = [];
      for (const sectionNode of sectionNodes) {
        const section = this.evaluateSection(sectionNode, { id: exercise.id, equipment });
        if (section.type === "sets") {
          allSets.push(...section.data);
          if (section.data.some((set) => set.repRange != null)) {
            setVariations.push({ sets: section.data, expandedSets: [], isCurrent: section.isCurrent });
          }
        } else if (section.type === "warmup") {
          allWarmupSets = allWarmupSets || [];
          allWarmupSets.push(...section.data);
        } else if (section.type === "progress") {
          progress = section.data;
        } else if (section.type === "update") {
          update = section.data;
        } else if (section.type === "reuse") {
          reuse = section.data;
        } else if (section.type === "id") {
          tags = section.data;
        } else if (section.type === "used") {
          notused = true;
        } else {
          throw new Error(`Unexpected section type`);
        }
      }
      const hasRepRanges = allSets.filter((s) => s.repRange != null).length > 0;
      if (!hasRepRanges && !reuse) {
        this.error("Exercise must have sets x reps specified in one of sections", nameNode);
      }
      const rpe = allSets.find((set) => set.repRange == null && set.rpe != null)?.rpe;
      const timer = allSets.find((set) => set.repRange == null && set.timer != null)?.timer;
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
      const fullNamePoint = this.getPoint(nameNode);

      const reuseSetsNode = expr
        .getChildren(PlannerNodeName.ExerciseSection)
        .map((n) => n.getChild(PlannerNodeName.ReuseSectionWithWeekDay))
        .filter((n) => n)[0];
      const reuseSetPoint = reuseSetsNode ? this.getPoint(reuseSetsNode) : undefined;

      const progressNode = expr
        .getChildren(PlannerNodeName.ExerciseSection)
        .map((n) => {
          const node = n.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.ExercisePropertyName);
          return node != null && this.getValueTrim(node) === "progress" ? node : undefined;
        })
        .flat(2)
        .filter((n) => n)[0];
      const progressPoint = progressNode ? this.getPoint(progressNode) : undefined;

      const updateNode = expr
        .getChildren(PlannerNodeName.ExerciseSection)
        .map((n) => {
          const node = n.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.ExercisePropertyName);
          return node != null && this.getValueTrim(node) === "update" ? node : undefined;
        })
        .flat(2)
        .filter((n) => n)[0];
      const updatePoint = updateNode ? this.getPoint(updateNode) : undefined;

      const idNode = expr
        .getChildren(PlannerNodeName.ExerciseSection)
        .map((n) => {
          const node = n.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.ExercisePropertyName);
          return node != null && this.getValueTrim(node) === "id" ? node : undefined;
        })
        .flat(2)
        .filter((n) => n)[0];
      const idPoint = idNode ? this.getPoint(idNode) : undefined;

      const warmupNode = expr
        .getChildren(PlannerNodeName.ExerciseSection)
        .map((n) => n.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.WarmupExerciseSets))
        .flat(2)
        .filter((n) => n)[0];
      const warmupPoint = warmupNode ? this.getPoint(warmupNode) : undefined;

      const plannerExercise: IPlannerProgramExercise = {
        key,
        fullName,
        shortName,
        label,
        text,
        repeat,
        repeating: [...repeat],
        order,
        name,
        equipment,
        line,
        tags,
        notused: notused,
        setVariations,
        descriptions,
        warmupSets: allWarmupSets,
        progress,
        update,
        reuse,
        globals: {
          rpe,
          logRpe,
          askWeight,
          timer,
          weight,
        },
        points: {
          fullName: fullNamePoint,
          reuseSetPoint,
          progressPoint,
          idPoint,
          updatePoint,
          warmupPoint,
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

  public hasWeightInUnit(programNode: SyntaxNode, unit: IUnit): boolean {
    const cursor = programNode.cursor();
    do {
      const weight = this.getWeight(cursor.node);
      if (weight != null) {
        if (weight.unit === unit) {
          return true;
        }
      }
    } while (cursor.next());
    return false;
  }

  public switchWeightsToUnit(programNode: SyntaxNode, settings: ISettings): string {
    const cursor = programNode.cursor();
    let script = this.script;
    let shift = 0;
    do {
      if (cursor.node.type.name === PlannerNodeName.Weight) {
        const weight = this.getWeight(cursor.node);
        if (weight != null) {
          if (weight.unit !== settings.units) {
            const from = cursor.node.from;
            const to = cursor.node.to;
            const oldWeightStr = Weight.print(weight);
            const newWeightStr = Weight.print(Weight.smartConvert(weight, settings.units));
            script = script.substring(0, from + shift) + newWeightStr + script.substring(to + shift);
            shift = shift + newWeightStr.length - oldWeightStr.length;
          }
        }
      } else if (cursor.node.type.name === PlannerNodeName.Liftoscript) {
        const oldLiftoscript = this.getValueTrim(cursor.node);
        const liftoscriptEvaluator = new ScriptRunner(
          oldLiftoscript,
          {},
          {},
          Progress.createEmptyScriptBindings({ day: 1, week: 1, dayInWeek: 1 }, settings),
          Progress.createScriptFunctions(settings),
          settings.units,
          { unit: settings.units, prints: [] },
          "planner"
        );
        const newLiftoscript = liftoscriptEvaluator.switchWeightsToUnit(settings.units);
        script =
          script.substring(0, cursor.node.from + shift) + newLiftoscript + script.substring(cursor.node.to + shift);
        shift = shift + newLiftoscript.length - oldLiftoscript.length;
      }
    } while (cursor.next());
    return script;
  }

  public topLineMap(programNode: SyntaxNode): IPlannerTopLineItem[] {
    if (programNode.type.name !== PlannerNodeName.Program) {
      this.error(`Unexpected node type ${programNode.type.name} - should be Program`, programNode);
    }
    const children = getChildren(programNode);
    const result: IPlannerTopLineItem[] = [];
    let lastDescriptions: string[][] = [];
    let ongoingDescriptions = false;
    for (const child of children) {
      if (child.type.name === PlannerNodeName.ExerciseExpression) {
        ongoingDescriptions = false;
        const nameNode = child.getChild(PlannerNodeName.ExerciseName)!;
        const fullName = this.getValue(nameNode);
        const key = PlannerKey.fromFullName(fullName, this.settings);
        const repeat = this.getRepeat(child);
        const repeatRanges = this.getRepeatRanges(repeat);
        const order = this.getOrder(child);
        const sectionsNode = child.getChildren(PlannerNodeName.ExerciseSection);
        const sections = sectionsNode.map((section) => this.getValueTrim(section).trim()).join(" / ");
        const sectionsToReuse = sectionsNode
          .filter((section) => {
            const properties = section.getChild(PlannerNodeName.ExerciseProperty);
            if (properties == null) {
              return true;
            }
            const propertyNameNode = properties.getChild(PlannerNodeName.ExercisePropertyName);
            const propertyName = propertyNameNode ? this.getValue(propertyNameNode) : undefined;
            if (propertyName === "progress") {
              const none = properties.getChild(PlannerNodeName.None);
              return none != null;
            }
            return false;
          })
          .map((section) => this.getValueTrim(section).trim())
          .join(" / ");
        result.push({
          type: "exercise",
          fullName,
          order,
          value: key,
          repeat,
          repeatRanges,
          descriptions: lastDescriptions.map((d) => d.join("\n")),
          sections,
          sectionsToReuse,
        });
        lastDescriptions = [];
      } else if (child.type.name === PlannerNodeName.LineComment) {
        ongoingDescriptions = true;
        const description = this.getValueTrim(child).trim();
        if (lastDescriptions.length === 0) {
          lastDescriptions.push([]);
        }
        lastDescriptions[lastDescriptions.length - 1].push(description);
        result.push({ type: "description", value: description });
      } else if (child.type.name === PlannerNodeName.TripleLineComment) {
        result.push({ type: "comment", value: this.getValueTrim(child).trim() });
      } else if (child.type.name === PlannerNodeName.EmptyExpression) {
        result.push({ type: "empty", value: "" });
        if (ongoingDescriptions) {
          lastDescriptions.push([]);
        }
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
