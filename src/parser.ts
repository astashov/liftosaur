/* eslint-disable @typescript-eslint/unified-signatures */
import { LiftoscriptEvaluator } from "./liftoscriptEvaluator";
import { parser as LiftoscriptParser } from "./liftoscript";
import { IScriptBindings, IScriptContext, IScriptFunctions } from "./models/progress";
import { Weight } from "./models/weight";
import { IUnit, IWeight, IProgramState } from "./types";
import type { Tree } from "@lezer/common";
import RB from "rollbar";
import { IState } from "./models/state";

declare let Rollbar: RB;

const lastAlertDisplayedTs: Partial<Record<string, number>> = {};

export class ScriptRunner {
  private readonly script: string;
  private readonly state: IProgramState;
  private readonly bindings: IScriptBindings;
  private readonly fns: IScriptFunctions;
  private readonly units: IUnit;
  private readonly context: IScriptContext;

  constructor(
    script: string,
    state: IProgramState,
    bindings: IScriptBindings,
    fns: IScriptFunctions,
    units: IUnit,
    context: IScriptContext
  ) {
    this.script = script;
    this.state = state;
    this.bindings = bindings;
    this.fns = fns;
    this.units = units;
    this.context = context;
  }

  public parse(): [LiftoscriptEvaluator, Tree] {
    const liftoscriptTree = LiftoscriptParser.parse(this.script);
    const liftoscriptEvaluator = new LiftoscriptEvaluator(
      this.script,
      this.state,
      this.bindings,
      this.fns,
      this.context
    );
    liftoscriptEvaluator.parse(liftoscriptTree.topNode);
    return [liftoscriptEvaluator, liftoscriptTree];
  }

  public static safe<T>(cb: () => T, errorMsg: (e: Error) => string, defaultValue: T, disabled?: boolean): T {
    let value: T;
    try {
      value = cb();
    } catch (e) {
      if (!disabled && e instanceof SyntaxError) {
        const lastAlertTs = lastAlertDisplayedTs[e.message];
        console.error(e);
        if (lastAlertTs == null || lastAlertTs < Date.now() - 1000 * 60 * 1) {
          alert(errorMsg(e));
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
  public execute(type: "weight"): IWeight;
  public execute(type: "timer"): number;
  public execute(type?: undefined): number | IWeight | boolean;
  public execute(type?: "reps" | "weight" | "timer"): number | IWeight | boolean {
    const [liftoscriptEvaluator, liftoscriptTree] = this.parse();
    const rawResult = liftoscriptEvaluator.evaluate(liftoscriptTree.topNode);
    const result = Array.isArray(rawResult) ? rawResult[0] : rawResult;
    const output = this.convertResult(type, result);

    return output;
  }

  private convertResult(
    type: "reps" | "weight" | "timer" | undefined,
    result: number | IWeight | boolean
  ): number | IWeight | boolean {
    if (type === "reps" || type === "timer") {
      if (typeof result !== "number") {
        throw new SyntaxError("Expected to get number as a result");
      } else if (result < 0) {
        return 0;
      } else {
        return result;
      }
    } else if (type === "weight") {
      if (typeof result === "boolean") {
        throw new SyntaxError("Expected to get number or weight as a result");
      } else {
        if (!Weight.is(result)) {
          result = Weight.build(result, this.units);
        }
        if (Weight.lt(result, 0)) {
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
