import type { IProgramState, IProgramStateMetadata } from "../../../types";
import { Weight_parse, Weight_buildPct } from "../../../models/weight";
import { MathUtils_roundFloat } from "../../../utils/math";

export function PlannerStateVars_fromArgs(
  fnArgs: string[],
  onError?: (message: string) => void
): { state: IProgramState; stateMetadata: IProgramStateMetadata } {
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
        ? Weight_parse(fnArgValStr)
        : fnArgValStr.match(/%/)
          ? Weight_buildPct(parseFloat(fnArgValStr))
          : MathUtils_roundFloat(parseFloat(fnArgValStr), 2);
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
