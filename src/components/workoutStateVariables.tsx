import React, { JSX } from "react";
import { ObjectUtils } from "../utils/object";
import { IHistoryEntry, ISettings } from "../types";
import { Weight } from "../models/weight";
import { StringUtils } from "../utils/string";

interface IWorkoutStateVariablesProps {
  entry: IHistoryEntry;
  settings: ISettings;
}

export function WorkoutStateVariables(props: IWorkoutStateVariablesProps): JSX.Element {
  const state = props.entry.state || {};
  const vars = props.entry.vars || {};
  for (const key of ObjectUtils.keys(vars)) {
    const name = { rm1: "1 Rep Max" }[key] || key;
    state[name] = vars[key];
  }
  return (
    <section data-cy="workout-state-variables">
      <h4 className="mt-2 text-xs font-bold">State Variables</h4>
      <ul>
        {ObjectUtils.keys(state).map((stateKey, i) => {
          const value = state[stateKey];
          const displayValue = Weight.is(value) ? Weight.display(value) : value;
          return (
            <li className="text-xs" data-cy={`workout-state-variable-${StringUtils.dashcase(stateKey)}`}>
              <span>{stateKey}</span> - <strong>{`${displayValue}`}</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
