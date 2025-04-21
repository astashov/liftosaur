// import util from "util";
import { SyntaxNode } from "@lezer/common";
import { Exercise } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { IEither } from "../../utils/types";
import {
  IPlannerProgramExercise,
  IPlannerProgramExerciseRepRange,
  IPlannerProgramExerciseSet,
  IPlannerProgramExerciseSetVariation,
  IPlannerProgramProperty,
  IPlannerProgramReuse,
  IPlannerProgramExerciseWarmupSet,
  IProgramExerciseProgress,
  IProgramExerciseUpdate,
} from "./models/types";
import { IWeight, IProgramState, IDayData, ISettings, IExerciseType, IUnit, IProgramStateMetadata } from "../../types";
import * as W from "../../models/weight";
import { PlannerNodeName } from "./plannerExerciseStyles";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { LiftoscriptSyntaxError, LiftoscriptEvaluator } from "../../liftoscriptEvaluator";
import { Weight } from "../../models/weight";
import { MathUtils } from "../../utils/math";
import { PlannerKey } from "./plannerKey";
import { UidFactory } from "../../utils/generator";
import { ObjectUtils } from "../../utils/object";
import { PlannerProgramExercise } from "./models/plannerProgramExercise";

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
  private dayData: Required<IDayData>;
  private readonly settings: ISettings;
  private weeks: IPlannerExerciseEvaluatorWeek[] = [];

  private latestDescriptions: string[][] = [];

  constructor(script: string, settings: ISettings, mode: IPlannerExerciseEvaluatorMode, dayData?: Required<IDayData>) {
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

  public static isEqualProperty(a: IPlannerProgramProperty, b: IPlannerProgramProperty): boolean {
    return a.fnName === b.fnName && a.fnArgs.join() === b.fnArgs.join() && a.script === b.script && a.body === b.body;
  }

  public static isEqualProgress(a: IProgramExerciseProgress, b: IProgramExerciseProgress): boolean {
    const pickA = {
      ...ObjectUtils.pick(a, ["type", "state", "stateMetadata", "script"]),
      reuse: a.reuse?.fullName,
    };
    const pickB = {
      ...ObjectUtils.pick(b, ["type", "state", "stateMetadata", "script"]),
      reuse: b.reuse?.fullName,
    };
    return ObjectUtils.isEqual(pickA, pickB);
  }

  public static isEqualUpdate(a: IProgramExerciseUpdate, b: IProgramExerciseUpdate): boolean {
    const pickA = { ...ObjectUtils.pick(a, ["type", "script"]), reuse: a.reuse?.fullName };
    const pickB = { ...ObjectUtils.pick(b, ["type", "script"]), reuse: b.reuse?.fullName };
    return ObjectUtils.isEqual(pickA, pickB);
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
    const reprange = repRangeStr.split("-", 2);
    let minrepStr: string | undefined = reprange[0];
    let maxrepStr: string | undefined = reprange[1];
    if (!maxrepStr) {
      maxrepStr = minrepStr;
      minrepStr = undefined;
    }
    let isAmrap = false;
    if (maxrepStr.endsWith("+")) {
      isAmrap = true;
      maxrepStr.replace(/\+/g, "");
    }
    return {
      numberOfSets: parseInt(numberOfSetsStr, 10),
      minrep: minrepStr != null ? parseInt(minrepStr, 10) : undefined,
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

  public static fnArgsToStateVars(
    fnArgs: string[],
    onError?: (message: string) => void
  ): {
    state: IProgramState;
    stateMetadata: IProgramStateMetadata;
  } {
    const state: IProgramState = {};
    const stateMetadata: IProgramStateMetadata = {};
    for (const value of fnArgs) {
      // eslint-disable-next-line prefer-const
      let [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
      if (onError && (!fnArgKey || !fnArgValStr)) {
        onError(`Invalid argument ${value}`);
      }
      if (fnArgKey.endsWith("+")) {
        fnArgKey = fnArgKey.replace("+", "");
        stateMetadata[fnArgKey] = { userPrompted: true };
      } else {
        stateMetadata[fnArgKey] = { userPrompted: false };
      }
      try {
        const fnArgVal = fnArgValStr.match(/(lb|kg)/)
          ? Weight.parse(fnArgValStr)
          : fnArgValStr.match(/%/)
            ? Weight.buildPct(parseFloat(fnArgValStr))
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
    return { state, stateMetadata };
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
      return fnArgs.map((t) => parseInt(t, 10)).filter((t) => !isNaN(t));
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private evaluateUpdate(expr: SyntaxNode, exerciseType?: IExerciseType): IProgramExerciseUpdate {
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
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      let script: string | undefined;
      let body: string | undefined;
      let meta: { stateKeys: Set<string> } | undefined;
      let liftoscriptNode: SyntaxNode | undefined;
      if (fnName === "custom") {
        liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript) || undefined;
        script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        if (fnArgs.length > 0) {
          this.error(`State variables for the update script are taken from "progress" block`, fnNameNode);
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
            {},
            Progress.createEmptyScriptBindings(this.dayData, this.settings),
            Progress.createScriptFunctions(this.settings),
            this.settings.units,
            { exerciseType, unit: this.settings.units, prints: [] },
            "update"
          );
          const stateKeys = liftoscriptEvaluator.getStateVariableKeys();
          meta = { stateKeys };
        }
        if (!script && !body) {
          this.error(
            `'custom' update requires either to specify Liftoscript block or specify which one to reuse`,
            valueNode
          );
        }
        return {
          type: "custom",
          script,
          liftoscriptNode,
          meta,
          reuse: body ? { fullName: body } : undefined,
        };
      } else {
        this.error(`There's no such update progression exists - '${fnName}'`, fnNameNode);
      }
    } else {
      assert(PlannerNodeName.ExerciseProperty);
    }
  }

  private validateProgress(fnName: string, fnArgs: string[], fnNameNode: SyntaxNode, valueNode: SyntaxNode): void {
    if (["lp", "sum", "dp", "custom", "none"].indexOf(fnName) === -1) {
      this.error(`There's no such progression exists - '${fnName}'`, fnNameNode);
    }
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
      const script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
      const reuseLiftoscriptNode = valueNode
        .getChild(PlannerNodeName.ReuseLiftoscript)
        ?.getChild(PlannerNodeName.ReuseSection)
        ?.getChild(PlannerNodeName.ExerciseName);
      const body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
      if (!script && !body) {
        this.error(
          `'custom' progression requires either to specify Liftoscript block or specify which one to reuse`,
          valueNode
        );
      }
    }
  }

  private evaluateProgress(expr: SyntaxNode, exerciseType?: IExerciseType): IProgramExerciseProgress {
    if (expr.type.name === PlannerNodeName.ExerciseProperty) {
      const valueNode = expr.getChild(PlannerNodeName.FunctionExpression);
      if (valueNode == null) {
        const none = expr.getChild(PlannerNodeName.None);
        if (none != null) {
          return {
            type: "none",
            state: {},
            stateMetadata: {},
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
      const fnArgs = valueNode.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => this.getValue(argNode));
      this.validateProgress(fnName, fnArgs, fnNameNode, valueNode);

      if (fnName === "lp") {
        const increment = fnArgs[0] ? Weight.parsePct(fnArgs[0]) : Weight.build(0, "lb");
        const decrement = fnArgs[3] ? Weight.parsePct(fnArgs[3]) : Weight.build(0, "lb");
        const state: IProgramState = {
          increment: increment ?? Weight.build(0, "lb"),
          successes: fnArgs[1] ? parseInt(fnArgs[1], 10) : 1,
          successCounter: fnArgs[2] ? parseInt(fnArgs[2], 10) : 0,
          decrement: decrement ?? Weight.build(0, "lb"),
          failures: fnArgs[4] ? parseInt(fnArgs[4], 10) : (decrement?.value ?? 0) > 0 ? 1 : 0,
          failureCounter: fnArgs[5] ? parseInt(fnArgs[5], 10) : 0,
        };
        const script = `if (completedReps >= reps && completedRPE <= RPE) {
  state.successCounter += 1;
  if (state.successCounter >= state.successes) {
    weights += state.increment
    state.successCounter = 0
    state.failureCounter = 0
  }
}
if (state.decrement > 0 && state.failures > 0) {
  if (!(completedReps >= minReps && completedRPE <= RPE)) {
    state.failureCounter += 1;
    if (state.failureCounter >= state.failures) {
      weights -= state.decrement
      state.failureCounter = 0
      state.successCounter = 0
    }
  }
}`;
        return {
          type: "lp",
          state,
          stateMetadata: {},
          script,
        };
      } else if (fnName === "dp") {
        const increment = fnArgs[0] ? Weight.parsePct(fnArgs[0]) : Weight.build(0, "lb");
        const state: IProgramState = {
          increment: increment ?? Weight.build(0, "lb"),
          minReps: fnArgs[1] ? parseInt(fnArgs[1], 10) : 0,
          maxReps: fnArgs[2] ? parseInt(fnArgs[2], 10) : 0,
        };
        const script = `
if (completedReps >= reps && completedRPE <= RPE) {
  if (reps[ns] < state.maxReps) {
    reps += 1
  } else {
    reps = state.minReps
    weights += state.increment
  }
}`;
        return {
          type: "dp",
          state,
          stateMetadata: {},
          script,
        };
      } else if (fnName === "sum") {
        const increment = fnArgs[1] ? Weight.parsePct(fnArgs[1]) : Weight.build(0, "lb");
        const state: IProgramState = {
          reps: fnArgs[0] ? parseInt(fnArgs[0], 10) : 0,
          increment: increment ?? Weight.build(0, "lb"),
        };
        const script = `if (sum(completedReps) >= state.reps) {
        weights += state.increment
      }`;
        return {
          type: "sum",
          state,
          stateMetadata: {},
          script,
        };
      } else if (fnName === "custom") {
        const liftoscriptNode = valueNode.getChild(PlannerNodeName.Liftoscript);
        const script = liftoscriptNode ? this.getValueTrim(liftoscriptNode) : undefined;
        const { state, stateMetadata } = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs, (message) =>
          this.error(message, fnNameNode)
        );
        if (script) {
          const liftoscriptEvaluator = new ScriptRunner(
            script,
            state,
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
        const reuseLiftoscriptNode = valueNode
          .getChild(PlannerNodeName.ReuseLiftoscript)
          ?.getChild(PlannerNodeName.ReuseSection)
          ?.getChild(PlannerNodeName.ExerciseName);
        const body = reuseLiftoscriptNode ? this.getValue(reuseLiftoscriptNode) : undefined;
        return {
          type: "custom",
          state,
          stateMetadata,
          script,
          reuse: body ? { fullName: body } : undefined,
        };
      } else {
        this.error(`Unknown progression type - '${fnName}'`, fnNameNode);
      }
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
    | { type: "progress"; data: IProgramExerciseProgress }
    | { type: "update"; data: IProgramExerciseUpdate }
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
    | { type: "progress"; data: IProgramExerciseProgress }
    | { type: "update"; data: IProgramExerciseUpdate }
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

  private getIsNotUsed(expr: SyntaxNode): boolean {
    if (expr.type.name === PlannerNodeName.ExerciseExpression) {
      const sections = expr.getChildren(PlannerNodeName.ExerciseSection);
      for (const section of sections) {
        const properties = section.getChildren(PlannerNodeName.ExerciseProperty);
        for (const property of properties) {
          const nameNode = property.getChild(PlannerNodeName.ExercisePropertyName);
          const name = nameNode ? this.getValueTrim(nameNode) : undefined;
          const valueNode = property.getChild(PlannerNodeName.None);
          if (name === "used" && valueNode != null) {
            return true;
          }
        }
      }
      return false;
    } else {
      assert(PlannerNodeName.ExerciseSection);
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
      const fullName = this.getValue(nameNode);
      // eslint-disable-next-line prefer-const
      let { label, name, equipment } = PlannerExerciseEvaluator.extractNameParts(fullName, this.settings);
      const key = PlannerKey.fromFullName(fullName, this.settings);
      const shortName = PlannerProgramExercise.shortNameFromFullName(fullName, this.settings);
      const exercise = Exercise.findByNameAndEquipment(shortName, this.settings.exercises);
      let notused = this.getIsNotUsed(expr);
      const sectionNodes = expr.getChildren(PlannerNodeName.ExerciseSection);
      const setVariations: IPlannerProgramExerciseSetVariation[] = [];
      const allSets: IPlannerProgramExerciseSet[] = [];
      let allWarmupSets: IPlannerProgramExerciseWarmupSet[] | undefined;
      let reuse: IPlannerProgramReuse | undefined;
      const repeat = this.getRepeat(expr);
      const order = this.getOrder(expr);
      const text = this.getValueTrim(expr).trim();
      let tags: number[] = [];
      let progress: IProgramExerciseProgress | undefined;
      let update: IProgramExerciseUpdate | undefined;
      for (const sectionNode of sectionNodes) {
        const section = this.evaluateSection(sectionNode, exercise ? { id: exercise.id, equipment } : undefined);
        if (section.type === "sets") {
          allSets.push(...section.data);
          if (section.data.some((set) => set.repRange != null)) {
            setVariations.push({ sets: section.data, isCurrent: section.isCurrent });
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
          tags = tags.concat(section.data);
        } else if (section.type === "used") {
          notused = true;
        } else {
          throw new Error(`Unexpected section type`);
        }
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
        id: UidFactory.generateUid(8),
        key,
        fullName,
        shortName,
        exerciseType: exercise,
        label,
        dayData: this.dayData,
        text,
        repeat,
        repeating: [...repeat],
        order,
        name,
        equipment,
        line,
        tags,
        notused: notused,
        evaluatedSetVariations: [],
        setVariations,
        descriptions: {
          values: descriptions,
        },
        warmupSets: allWarmupSets,
        reuse,
        progress,
        update,
        globals: {
          rpe,
          logRpe,
          askWeight,
          timer,
          percentage,
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

  public changeExerciseName(node: SyntaxNode, from: string, to: string): string {
    const cursor = node.cursor();
    let script = this.script;
    let shift = 0;
    do {
      if (cursor.node.type.name === PlannerNodeName.ExerciseName) {
        const name = this.getValue(cursor.node);
        if (name === from) {
          const fromNode = cursor.node.from;
          const toNode = cursor.node.to;
          script = script.substring(0, fromNode + shift) + to + script.substring(toNode + shift);
          shift = shift + to.length - name.length;
        }
      }
    } while (cursor.next());
    return script;
  }

  public static changeWeightsToCompletedWeights(oldScript: string): string {
    const node = plannerExerciseParser.parse(oldScript);
    const cursor = node.cursor();
    let script = oldScript;
    let shift = 0;
    do {
      if (cursor.node.type.name === PlannerNodeName.Liftoscript) {
        const value = LiftoscriptEvaluator.getValueRaw(oldScript, cursor.node);
        const from = cursor.node.from;
        const to = cursor.node.to;
        const newValue = LiftoscriptEvaluator.changeWeightsToCompleteWeights(value);
        script = script.substring(0, from + shift) + newValue + script.substring(to + shift);
        shift = shift + newValue.length - value.length;
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
