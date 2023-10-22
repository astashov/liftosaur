import { h, JSX, Fragment } from "preact";
import { Exercise } from "../../../models/exercise";
import { Weight } from "../../../models/weight";
import { useState, useRef } from "preact/hooks";
import { Button } from "../../button";
import { IDispatch } from "../../../ducks/types";
import { EditProgram } from "../../../models/editProgram";
import { Thunk } from "../../../ducks/thunks";
import { IProgram, ISettings, IWeight } from "../../../types";
import { Input } from "../../input";
import { LinkButton } from "../../linkButton";
import { StringUtils } from "../../../utils/string";
import { ProgramExercise } from "../../../models/programExercise";
import { SendMessage } from "../../../utils/sendMessage";

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
  const squatExercise = programExercises.find((e) => e.exerciseType.id === "squat")!;
  const benchPressExercise = programExercises.find((e) => e.exerciseType.id === "benchPress")!;
  const deadliftExercise = programExercises.find((e) => e.exerciseType.id === "deadlift")!;
  const overheadPressExercise = programExercises.find((e) => e.exerciseType.id === "overheadPress")!;
  const [tms, setTms] = useState({
    squat: ProgramExercise.getState(squatExercise, props.program.exercises).tm as IWeight,
    benchPress: ProgramExercise.getState(benchPressExercise, props.program.exercises).tm as IWeight,
    deadlift: ProgramExercise.getState(deadliftExercise, props.program.exercises).tm as IWeight,
    overheadPress: ProgramExercise.getState(overheadPressExercise, props.program.exercises).tm as IWeight,
  });

  return (
    <div>
      <p className="mb-4">
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
          name="save-training-max"
          kind="orange"
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
    <div className="mb-4">
      <div>
        <Input
          label={`${props.name} Training Max, ${tm.unit}`}
          className="w-full"
          type="text"
          value={tm.value}
          changeHandler={(either) => {
            if (either.success) {
              const value = parseInt(either.data, 10);
              const weight = !isNaN(value) ? Weight.build(value, props.settings.units) : undefined;
              if (weight != null) {
                props.onTmChange(weight);
              }
            }
          }}
        />
      </div>
      <div>
        <LinkButton
          name="calculate-training-max"
          data-cy={`${StringUtils.dashcase(props.name)}-calculate`}
          onClick={() => setShouldShowCalculator(!shouldShowCalculator)}
          className="text-blue-700 underline"
        >
          Calculate
        </LinkButton>
      </div>
      {shouldShowCalculator ? (
        <TrainingMaxCalculator
          settings={props.settings}
          onCalculate={(w) => {
            props.onTmChange(w);
          }}
        />
      ) : undefined}
    </div>
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
          <Input
            label="Reps lifted"
            data-cy="input-reps"
            ref={repsInput}
            type="tel"
            className="w-full"
            min="0"
            onInput={() => calculate()}
            placeholder="0"
          />
        </div>
        <div className="mb-2">
          <Input
            label="Weight lifted"
            data-cy="input-weight"
            ref={weightInput}
            className="w-full"
            type={SendMessage.isIos() ? "number" : "tel"}
            min="0"
            onInput={() => calculate()}
            placeholder="0 lbs"
          />
        </div>
        <div className="flex items-center">
          <div className="flex-1 text-sm">
            Result: <strong>{result != null ? Weight.display(result) : "-"}</strong>
          </div>
          <div className="">
            <Button
              name="use-this-value-tm"
              buttonSize="sm"
              disabled={result == null}
              type="button"
              kind="purple"
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
