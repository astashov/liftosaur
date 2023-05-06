import { JSX, h } from "preact";
import { ObjectUtils } from "../utils/object";
import { IHistoryEntry, ISettings } from "../types";
import { Weight } from "../models/weight";

interface IWorkoutStateVariablesProps {
  entry: IHistoryEntry;
  settings: ISettings;
}

export function WorkoutStateVariables(props: IWorkoutStateVariablesProps): JSX.Element {
  const state = props.entry.state || {};
  return (
    <section>
      <h4 className="mt-2 text-xs font-bold">State Variables</h4>
      <ul>
        {ObjectUtils.keys(state).map((stateKey, i) => {
          const value = state[stateKey];
          const displayValue = Weight.is(value) ? Weight.display(value) : value;
          return (
            <li className="text-xs">
              <span>{stateKey}</span> - <strong>{displayValue}</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
