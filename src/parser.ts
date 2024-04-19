/* eslint-disable @typescript-eslint/unified-signatures */
import { LiftoscriptEvaluator, NodeName, LiftoscriptSyntaxError } from "./liftoscriptEvaluator";
import { parser as LiftoscriptParser } from "./liftoscript";
import { IScriptBindings, IScriptFnContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IUnit, IWeight, IProgramState, IPercentage } from "./types";
import type { Tree } from "@lezer/common";
import RB from "rollbar";
import { IState } from "./models/state";
import { IProgramMode } from "./models/program";
import { ILiftoscriptEvaluatorUpdate } from "./liftoscriptEvaluator";

declare let Rollbar: RB;

const lastAlertDisplayedTs: Partial<Record<string, number>> = {};

export class ScriptRunner {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly otherStates: Record<number, IProgramState>;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly units: IUnit;
  private readonly context: IScriptFnContext;
  private readonly mode: IProgramMode;
  private updates: ILiftoscriptEvaluatorUpdate[] = [];

  constructor(
    script: string,
    state: IProgramState,
    otherStates: Record<number, IProgramState>,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    units: IUnit,
    context: IScriptFnContext,
    mode: IProgramMode
  ) {
    this.script = script;
    this.state = state;
    this.otherStates = otherStates;
    this.bindings = bindings;
    this.fns = fns;
    this.units = units;
    this.context = context;
    this.mode = mode;
  }

  public parse(): [LiftoscriptEvaluator, Tree] {
    const liftoscriptTree = LiftoscriptParser.parse(this.script);
    const liftoscriptEvaluator = new LiftoscriptEvaluator(
      this.script,
      this.state,
      this.otherStates,
      this.bindings,
      this.fns,
      this.context,
      this.units,
      this.mode
    );
    liftoscriptEvaluator.parse(liftoscriptTree.topNode);
    return [liftoscriptEvaluator, liftoscriptTree];
  }

  public getStateVariableKeys(): Set<string> {
    const liftoscriptTree = LiftoscriptParser.parse(this.script);
    const liftoscriptEvaluator = new LiftoscriptEvaluator(
      this.script,
      this.state,
      this.otherStates,
      this.bindings,
      this.fns,
      this.context,
      this.units,
      this.mode
    );
    return liftoscriptEvaluator.getStateVariableKeys(liftoscriptTree.topNode);
  }

  public static hasKeyword(script: string, name: string): boolean {
    const expr = LiftoscriptParser.parse(script);
    const cursor = expr.cursor();
    do {
      if (cursor.node.type.name === NodeName.Keyword) {
        if (LiftoscriptEvaluator.getValue(script, cursor.node) === name) {
          return true;
        }
      }
    } while (cursor.next());
    return false;
  }

  public static safe<T>(cb: () => T, errorMsg: (e: Error) => string, defaultValue: T, disabled?: boolean): T {
    let value: T;
    try {
      value = cb();
    } catch (e) {
      if (!disabled && e instanceof LiftoscriptSyntaxError) {
        const lastAlertTs = lastAlertDisplayedTs[e.message];
        console.error(e);
        if (lastAlertTs == null || lastAlertTs < Date.now() - 1000 * 60 * 1) {
          if (typeof window !== "undefined") {
            alert(errorMsg(e));
          }
          this.reportError("Error during Liftoscript execution", e);
          lastAlertDisplayedTs[e.message] = Date.now();
        }
        value = defaultValue;
      } else {
        throw e;
      }
    }
    return value;
  }

  public execute(type: "reps"): number;
  public execute(type: "rpe"): number;
  public execute(type: "weight"): IWeight | IPercentage;
  public execute(type: "timer"): number;
  public execute(type?: undefined): number | IWeight | boolean;
  public execute(type?: "reps" | "weight" | "timer" | "rpe"): number | IWeight | IPercentage | boolean {
    const [liftoscriptEvaluator, liftoscriptTree] = this.parse();
    const rawResult = liftoscriptEvaluator.evaluate(liftoscriptTree.topNode);
    let result = Array.isArray(rawResult) ? rawResult[0] : rawResult;
    if (result == null) {
      result = 0;
    }
    const output = this.convertResult(type, result);
    this.updates = liftoscriptEvaluator.updates;

    return output;
  }

  public getUpdates(): ILiftoscriptEvaluatorUpdate[] {
    return this.updates;
  }

  private convertResult(
    type: "reps" | "weight" | "timer" | "rpe" | undefined,
    result: number | IWeight | IPercentage | boolean
  ): number | IWeight | IPercentage | boolean {
    if (type === "reps" || type === "timer") {
      if (typeof result !== "number") {
        throw new LiftoscriptSyntaxError("Expected to get number as a result", 0, 0, 0, 0);
      } else if (result < 0) {
        return 0;
      } else {
        return result;
      }
    } else if (type === "rpe") {
      if (typeof result !== "number") {
        throw new LiftoscriptSyntaxError("Expected to get number as a result", 0, 0, 0, 0);
      } else {
        return Math.round(Math.min(10, Math.max(0, result)) / 0.5) * 0.5;
      }
    } else if (type === "weight") {
      if (typeof result === "boolean") {
        throw new LiftoscriptSyntaxError("Expected to get number, percentage or weight as a result", 0, 0, 0, 0);
      } else if (typeof result === "number") {
        return Weight.build(result, this.units);
      } else {
        if (result.value < 0) {
          return Weight.build(0, this.units);
        } else {
          return result;
        }
      }
    } else {
      return result;
    }
  }

  private static reportError(msg: string, error?: Error): void {
    if (typeof Rollbar === "undefined") {
      return;
    }
    const payload = {
      error: error ? { message: error.message, name: error.name, stack: error.stack } : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      screen: JSON.stringify(((window as any)?.state as IState)?.screenStack),
    };
    Rollbar.error(msg, payload);
  }
}
