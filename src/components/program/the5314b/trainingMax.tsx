import { h, JSX, Fragment } from "preact";
import { Exercise } from "../../../models/exercise";
import { Weight } from "../../../models/weight";
import { MenuItemEditable } from "../../menuItemEditable";
import { useState, useRef } from "preact/hooks";
import { Button } from "../../button";
import { IDispatch } from "../../../ducks/types";
import { EditProgram } from "../../../models/editProgram";
import { Thunk } from "../../../ducks/thunks";
import { IProgram, ISettings, IWeight } from "../../../types";

interface IProps {
  program: IProgram;
  programIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function TrainingMax(props: IProps): JSX.Element {
  const exerciseIds = ["squat", "benchPress", "deadlift", "overheadPress"] as const;
  const exercises = exerciseIds.map((id) => Exercise.getById(id, props.settings.exercises));
  const programExercises = props.program.exercises;
  const [tms, setTms] = useState({
    squat: programExercises.find((e) => e.exerciseType.id === "squat")!.state.tm as IWeight,
    benchPress: programExercises.find((e) => e.exerciseType.id === "benchPress")!.state.tm as IWeight,
    deadlift: programExercises.find((e) => e.exerciseType.id === "deadlift")!.state.tm as IWeight,
    overheadPress: programExercises.find((e) => e.exerciseType.id === "overheadPress")!.state.tm as IWeight,
  });

  return (
    <div>
      <p>
        5/3/1 programs are based on Training Max - 90% of your 1 rep max. Enter your Training Maxes for main lifts, or
        use the calculator to calculate it's value.
      </p>
      {exercises.map((e) => (
        <TrainingMaxExercise
          name={e.name}
          tm={tms[e.id as typeof exerciseIds[number]]}
          program={props.program}
          settings={props.settings}
          onTmChange={(weight) => {
            setTms({ ...tms, [e.id]: weight });
          }}
        />
      ))}
      <div className="p-2 text-center">
        <Button
          kind="green"
          className="ls-save-training-max"
          onClick={() => {
            EditProgram.set531Tms(props.dispatch, props.programIndex, tms);
            props.dispatch(Thunk.pushScreen("main"));
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

interface IPropsExercise {
  program: IProgram;
  tm: IWeight;
  name: string;
  settings: ISettings;
  onTmChange: (tm: IWeight) => void;
}

function TrainingMaxExercise(props: IPropsExercise): JSX.Element {
  const { tm } = props;
  const [shouldShowCalculator, setShouldShowCalculator] = useState<boolean>(false);

  return (
    <Fragment>
      <MenuItemEditable
        type="number"
        name={props.name}
        value={tm.value.toString()}
        valueUnits={tm.unit}
        after={
          <span className="flex items-center ml-2 text-sm">
            <button onClick={() => setShouldShowCalculator(!shouldShowCalculator)} className="text-blue-700 underline">
              Calculate
            </button>
          </span>
        }
        onChange={(w) => {
          const value = w != null ? parseInt(w, 10) : NaN;
          const weight = !isNaN(value) ? Weight.build(value, props.settings.units) : undefined;
          if (weight != null) {
            props.onTmChange(weight);
          }
        }}
        nextLine={
          shouldShowCalculator ? (
            <TrainingMaxCalculator
              settings={props.settings}
              onCalculate={(w) => {
                props.onTmChange(w);
              }}
            />
          ) : undefined
        }
      />
    </Fragment>
  );
}

interface IPropsCalculator {
  settings: ISettings;
  onCalculate: (weight: IWeight) => void;
}

export function TrainingMaxCalculator(props: IPropsCalculator): JSX.Element {
  const weightInput = useRef<HTMLInputElement>(null);
  const repsInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<IWeight | undefined>(undefined);

  function calculate(): void {
    const reps = parseInt(repsInput.current.value, 10);
    const weight = parseInt(weightInput.current.value, 10);
    setResult(Weight.getTrainingMax(Weight.build(weight, props.settings.units), reps, props.settings, "barbell"));
  }

  return (
    <Fragment>
      <h3 className="pb-2 text-sm font-bold">Enter weight and number of reps</h3>
      <form onSubmit={(e) => e.preventDefault()} className="pb-2">
        <div className="mb-2">
          <label className="flex items-center">
            <span className="pr-4 text-sm" style={{ width: "100px" }}>
              Reps lifted
            </span>
            <input
              data-cy="input-reps"
              ref={repsInput}
              className="focus:outline-none focus:shadow-outline flex-1 block w-full px-4 py-1 leading-normal bg-white border border-gray-300 rounded-lg appearance-none"
              type="number"
              min="0"
              onInput={() => calculate()}
              placeholder="0"
            />
          </label>
        </div>
        <div className="mb-2">
          <label className="flex items-center">
            <span className="pr-4 text-sm" style={{ width: "100px" }}>
              Weight lifted
            </span>
            <input
              data-cy="input-weight"
              ref={weightInput}
              className="focus:outline-none focus:shadow-outline flex-1 block w-full px-4 py-1 leading-normal bg-white border border-gray-300 rounded-lg appearance-none"
              type="number"
              min="0"
              onInput={() => calculate()}
              placeholder="0 lbs"
            />
          </label>
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-sm">
            Result: <strong>{result != null ? Weight.display(result) : "-"}</strong>
          </div>
          <div className="">
            <Button
              buttonSize="sm"
              disabled={result == null}
              type="button"
              kind="blue"
              onClick={() => {
                if (result != null) {
                  props.onCalculate(result);
                }
              }}
            >
              Use this value
            </Button>
          </div>
        </div>
      </form>
    </Fragment>
  );
}
