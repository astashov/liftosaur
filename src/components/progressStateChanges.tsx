import { h, JSX } from "preact";
import { Program } from "../models/program";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { StringUtils } from "../utils/string";
import { Reps } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState } from "../types";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  day: number;
  state: IProgramState;
  script: string;
  userPromptedStateVars?: IProgramState;
  forceShow?: boolean;
}

export function ProgressStateChanges(props: IProps): JSX.Element | null {
  const { entry, settings, state, script, day } = props;
  const { units } = settings;
  const mergedState = { ...state, ...props.userPromptedStateVars };
  const result = Program.runExerciseFinishDayScript(
    entry,
    day,
    settings,
    mergedState,
    script,
    entry.exercise.equipment
  );
  const isFinished = Reps.isFinished(entry.sets);

  if ((props.forceShow || isFinished) && result.success) {
    const newState = result.data;
    const diffState = ObjectUtils.keys(state).reduce<Record<string, string | undefined>>((memo, key) => {
      const oldValue = state[key];
      const newValue = newState[key];
      if (!Weight.eq(oldValue, newValue)) {
        memo[key] = `${Weight.display(Weight.convertTo(oldValue as number, units))} -> ${Weight.display(
          Weight.convertTo(newValue as number, units)
        )}`;
      }
      return memo;
    }, {});
    if (ObjectUtils.keys(diffState).length > 0) {
      return (
        <div
          className="text-xs"
          data-help-id="progress-state-changes"
          data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
        >
          <header className="font-bold">Exercise State Variables changes</header>
          <ul data-cy="state-changes">
            {ObjectUtils.keys(diffState).map((key) => (
              <li data-cy={`state-changes-key-${StringUtils.dashcase(key)}`}>
                <span className="italic">{key}</span>:{" "}
                <strong data-cy={`state-changes-value-${StringUtils.dashcase(key)}`}>{diffState[key]}</strong>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }
  return null;
}
