import { IProgramState, IProgramStateMetadata } from "../types";
import { Weight } from "./weight";
import { MathUtils } from "../utils/math";

export class PlannerToProgram {
  public static fnArgsToState(
    fnArgs: string[]
  ): {
    state: IProgramState;
    metadata: IProgramStateMetadata;
  } {
    const state: IProgramState = {};
    const metadata: IProgramStateMetadata = {};
    for (const value of fnArgs) {
      // eslint-disable-next-line prefer-const
      let [fnArgKey, fnArgValStr] = value.split(":").map((v) => v.trim());
      if (fnArgKey.endsWith("+")) {
        fnArgKey = fnArgKey.replace("+", "");
        metadata[fnArgKey] = { userPrompted: true };
      }
      const fnArgVal = fnArgValStr.match(/(lb|kg)/)
        ? Weight.parse(fnArgValStr)
        : fnArgValStr.match(/%/)
        ? Weight.buildPct(parseFloat(fnArgValStr))
        : MathUtils.roundFloat(parseFloat(fnArgValStr), 2);
      state[fnArgKey] = fnArgVal ?? 0;
    }
    return { metadata, state };
  }
}
