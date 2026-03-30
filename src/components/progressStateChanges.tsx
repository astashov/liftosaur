import type { JSX } from "react";
import {
  IEvaluatedProgram,
  Program_getDiffState,
  Program_getDiffVars,
  Program_runExerciseFinishDayScript,
} from "../models/program";
import { ObjectUtils_isNotEmpty, ObjectUtils_keys } from "../utils/object";
import { Weight_print } from "../models/weight";
import { StringUtils_dashcase } from "../utils/string";
import { Reps_isFinished } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState, IDayData, IPercentage, IWeight, IStats } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise_getState } from "../pages/planner/models/plannerProgramExercise";
import { LinkButton } from "./linkButton";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  dayData: IDayData;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  stats: IStats;
  userPromptedStateVars?: IProgramState;
  onSuppressProgress?: (isSuppressed: boolean) => void;
  forceShow?: boolean;
}

export function ProgressStateChanges(props: IProps): JSX.Element | null {
  const state = PlannerProgramExercise_getState(props.programExercise);
  const { entry, settings, dayData } = props;
  const { units } = settings;
  const result = Program_runExerciseFinishDayScript(
    entry,
    dayData,
    settings,
    state,
    props.program.states,
    props.programExercise,
    props.stats,
    props.userPromptedStateVars
  );
  const isFinished = Reps_isFinished(entry.sets);
  const updatePrints = entry.updatePrints || [];
  const showEndOfDay = props.forceShow || isFinished;
  const onSuppressProgress = props.onSuppressProgress;

  if (result.success) {
    const { state: newState, updates, bindings } = result.data;
    const diffState = Program_getDiffState(state, newState, units);
    const diffVars = Program_getDiffVars(entry, updates, bindings, settings);
    const prints = result.data.prints;

    if (
      (showEndOfDay && ObjectUtils_isNotEmpty(diffState)) ||
      (showEndOfDay && ObjectUtils_isNotEmpty(diffVars)) ||
      (showEndOfDay && prints.length > 0) ||
      updatePrints.length > 0
    ) {
      return (
        <div
          className="text-xs"
          data-help-id="progress-state-changes"
          data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
        >
          <div>
            {showEndOfDay && ObjectUtils_isNotEmpty(diffVars) && (
              <div className={props.entry.isSuppressed ? "line-through" : ""}>
                <ExerciseChanges diffVars={diffVars} />
              </div>
            )}
            {showEndOfDay && ObjectUtils_isNotEmpty(diffState) && (
              <div className={props.entry.isSuppressed ? "line-through" : ""}>
                <StateVariablesChanges diffState={diffState} />
              </div>
            )}
            {showEndOfDay && prints.length > 0 && <Prints title="Progress Prints" prints={prints} />}
            {updatePrints.length > 0 && <Prints title="Update Prints" prints={updatePrints} />}
          </div>
          {onSuppressProgress && (
            <div>
              <LinkButton
                name="supress-progress"
                className="text-xs"
                data-cy="suppress-progress"
                onClick={() => {
                  onSuppressProgress(!props.entry.isSuppressed);
                }}
              >
                {props.entry.isSuppressed ? "Enable" : "Suppress"}
              </LinkButton>
            </div>
          )}
        </div>
      );
    }
  }
  return null;
}

function ExerciseChanges({ diffVars }: { diffVars: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffVars)) {
    return (
      <>
        <header className="font-bold">Exercise Changes</header>
        <ul data-cy="variable-changes">
          {ObjectUtils_keys(diffVars).map((key) => (
            <li key={key} data-cy={`variable-changes-key-${StringUtils_dashcase(key)}`}>
              <span className="italic">{key}</span>:{" "}
              <strong data-cy={`variable-changes-value-${StringUtils_dashcase(key)}`}>{diffVars[key]}</strong>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}

function StateVariablesChanges({ diffState }: { diffState: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffState)) {
    return (
      <>
        <header className="font-bold">State Variables changes</header>
        <ul data-cy="state-changes">
          {ObjectUtils_keys(diffState).map((key) => (
            <li key={key} data-cy={`state-changes-key-${StringUtils_dashcase(key)}`}>
              <span className="italic">{key}</span>:{" "}
              <strong data-cy={`state-changes-value-${StringUtils_dashcase(key)}`}>{diffState[key]}</strong>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}

function Prints({
  title,
  prints,
}: {
  title: string;
  prints: (IWeight | IPercentage | number)[][];
}): JSX.Element | null {
  if (prints.length > 0) {
    return (
      <>
        <header className="font-bold">{title}</header>
        <ul>
          {prints.map((print) => (
            <li key={JSON.stringify(print)}>
              {print.map((p, i) => {
                return (
                  <>
                    {i > 0 ? <span>, </span> : <></>}
                    <span>{Weight_print(p)}</span>
                  </>
                );
              })}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}
