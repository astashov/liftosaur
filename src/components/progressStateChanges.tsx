import { h, JSX, Fragment } from "preact";
import { IEvaluatedProgram, Program } from "../models/program";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { StringUtils } from "../utils/string";
import { Reps } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState, IDayData, IUnit, IPercentage, IWeight } from "../types";
import { Exercise } from "../models/exercise";
import { IScriptBindings } from "../models/progress";
import { ILiftoscriptEvaluatorUpdate } from "../liftoscriptEvaluator";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  dayData: IDayData;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  userPromptedStateVars?: IProgramState;
  forceShow?: boolean;
}

export function ProgressStateChanges(props: IProps): JSX.Element | null {
  const state = PlannerProgramExercise.getState(props.programExercise);
  const { entry, settings, dayData } = props;
  const { units } = settings;
  const result = Program.runExerciseFinishDayScript(
    entry,
    dayData,
    settings,
    state,
    props.program.states,
    props.programExercise,
    props.userPromptedStateVars
  );
  const isFinished = Reps.isFinished(entry.sets);
  const updatePrints = entry.updatePrints || [];
  const showEndOfDay = props.forceShow || isFinished;

  if (result.success) {
    const { state: newState, updates, bindings } = result.data;
    const diffState = getDiffState(state, newState, units);
    const diffVars = getDiffVars(entry, updates, bindings, settings);
    const prints = result.data.prints;

    if (
      (showEndOfDay && ObjectUtils.isNotEmpty(diffState)) ||
      (showEndOfDay && ObjectUtils.isNotEmpty(diffVars)) ||
      (showEndOfDay && prints.length > 0) ||
      updatePrints.length > 0
    ) {
      return (
        <div
          className="text-xs"
          data-help-id="progress-state-changes"
          data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
        >
          {showEndOfDay && ObjectUtils.isNotEmpty(diffVars) && <ExerciseChanges diffVars={diffVars} />}
          {showEndOfDay && ObjectUtils.isNotEmpty(diffState) && <StateVariablesChanges diffState={diffState} />}
          {showEndOfDay && prints.length > 0 && <Prints title="Progress Prints" prints={prints} />}
          {updatePrints.length > 0 && <Prints title="Update Prints" prints={updatePrints} />}
        </div>
      );
    }
  }
  return null;
}

function ExerciseChanges({ diffVars }: { diffVars: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils.isNotEmpty(diffVars)) {
    return (
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
    );
  }
  return null;
}

function StateVariablesChanges({ diffState }: { diffState: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils.isNotEmpty(diffState)) {
    return (
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
                    <span>{Weight.print(p)}</span>
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

function getDiffState(state: IProgramState, newState: IProgramState, units: IUnit): Record<string, string | undefined> {
  return ObjectUtils.keys(state).reduce<Record<string, string | undefined>>((memo, key) => {
    const oldValue = state[key];
    const newValue = newState[key];
    if (newValue != null && !Weight.eq(oldValue, newValue)) {
      const oldValueStr = Weight.display(Weight.convertTo(oldValue as number, units));
      const newValueStr = Weight.display(Weight.convertTo(newValue as number, units));
      memo[key] = `${oldValueStr} -> ${newValueStr}`;
    }
    return memo;
  }, {});
}

function getDiffVars(
  entry: IHistoryEntry,
  updates: ILiftoscriptEvaluatorUpdate[],
  bindings: IScriptBindings,
  settings: ISettings
): Record<string, string | undefined> {
  const diffVars: Record<string, string | undefined> = {};
  if (bindings.rm1 != null) {
    const oldOnerm = Exercise.onerm(entry.exercise, settings);
    if (!Weight.eq(oldOnerm, bindings.rm1)) {
      diffVars["1 RM"] = `${Weight.display(Weight.convertTo(oldOnerm, settings.units))} -> ${Weight.display(
        Weight.convertTo(bindings.rm1, settings.units)
      )}`;
    }
  }
  for (const update of updates) {
    const key = update.type;
    const value = update.value;
    const target = value.target;
    while (target[0] === "*") {
      target.shift();
    }
    const keyStr = `${key}${target.length > 0 ? `[${target.join(":")}]` : ""}`;
    diffVars[keyStr] = `${value.op !== "=" ? `${value.op} ` : ""}${Weight.printOrNumber(value.value)}`;
  }
  return diffVars;
}
