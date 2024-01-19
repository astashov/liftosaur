import { h, JSX, Fragment } from "preact";
import { IProgramMode, Program } from "../models/program";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { StringUtils } from "../utils/string";
import { Reps } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState, IDayData } from "../types";
import { Exercise } from "../models/exercise";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  dayData: IDayData;
  state: IProgramState;
  script: string;
  userPromptedStateVars?: IProgramState;
  forceShow?: boolean;
  staticState?: IProgramState;
  mode: IProgramMode;
}

export function ProgressStateChanges(props: IProps): JSX.Element | null {
  const { entry, settings, state, script, dayData } = props;
  const { units } = settings;
  const mergedState = { ...state, ...props.userPromptedStateVars };
  const result = Program.runExerciseFinishDayScript(
    entry,
    dayData,
    settings,
    mergedState,
    script,
    props.mode,
    props.staticState
  );
  const isFinished = Reps.isFinished(entry.sets);

  if ((props.forceShow || isFinished) && result.success) {
    const { state: newState, variables } = result.data;
    const diffState = ObjectUtils.keys(state).reduce<Record<string, string | undefined>>((memo, key) => {
      const oldValue = state[key];
      const newValue = newState[key];
      if (!Weight.eq(oldValue, newValue)) {
        const oldValueStr = Weight.display(Weight.convertTo(oldValue as number, units));
        const newValueStr = Weight.display(Weight.convertTo(newValue as number, units));
        memo[key] = `${oldValueStr} -> ${newValueStr}`;
      }
      return memo;
    }, {});
    const diffVars: Record<string, string | undefined> = {};
    if (variables.rm1 != null) {
      const oldOnerm = Exercise.rm1(entry.exercise, settings.exerciseData, settings.units);
      if (oldOnerm !== variables.rm1) {
        diffVars["1 RM"] = `${Weight.display(Weight.convertTo(oldOnerm, units))} -> ${Weight.display(
          Weight.convertTo(variables.rm1, units)
        )}`;
      }
    }
    for (const key of ["reps", "weights", "RPE"] as const) {
      if (variables[key] != null) {
        for (const value of variables[key] || []) {
          const keyStr = `${key}${value.target.length > 0 ? `[${value.target.join(":")}]` : ""}`;
          diffVars[keyStr] = `${Weight.printOrNumber(value.value)}`;
        }
      }
    }

    if (ObjectUtils.isNotEmpty(diffState) || ObjectUtils.isNotEmpty(diffVars)) {
      return (
        <div
          className="text-xs"
          data-help-id="progress-state-changes"
          data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
        >
          {ObjectUtils.isNotEmpty(diffVars) && (
            <>
              <header className="font-bold">Exercise Changes</header>
              <ul data-cy="variable-changes">
                {ObjectUtils.keys(diffVars).map((key) => (
                  <li data-cy={`variable-changes-key-${StringUtils.dashcase(key)}`}>
                    <span className="italic">{key}</span>:{" "}
                    <strong data-cy={`variable-changes-value-${StringUtils.dashcase(key)}`}>{diffVars[key]}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          {ObjectUtils.isNotEmpty(diffState) && (
            <>
              <header className="font-bold">State Variables changes</header>
              <ul data-cy="state-changes">
                {ObjectUtils.keys(diffState).map((key) => (
                  <li data-cy={`state-changes-key-${StringUtils.dashcase(key)}`}>
                    <span className="italic">{key}</span>:{" "}
                    <strong data-cy={`state-changes-value-${StringUtils.dashcase(key)}`}>{diffState[key]}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }
  }
  return null;
}
