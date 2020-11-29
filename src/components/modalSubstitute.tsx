import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Exercise, IExerciseId, IExerciseType, IExercise, IMuscle } from "../models/exercise";
import { StringUtils } from "../utils/string";
import { inputClassName } from "./input";

interface IModalDateProps {
  exerciseType: IExerciseType;
  onChange: (value?: IExerciseId) => void;
}

export function ModalSubstitute(props: IModalDateProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const tms = Exercise.targetMuscles(props.exerciseType);
  const sms = Exercise.synergistMuscles(props.exerciseType);

  const exercise = Exercise.get(props.exerciseType);
  let exercises = Exercise.similar(props.exerciseType);
  if (filter) {
    exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e[0].name.toLowerCase()));
  }

  return (
    <Modal autofocusInputRef={textInput} shouldShowClose={true} onClose={() => props.onChange()}>
      <h2 className="text-xl font-bold">Select exercise substitute</h2>
      <p className="text-xs italic">Similar exercises are sorted by the same muscles as the current one</p>
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <div className="p-4 my-2 bg-gray-200">
          <h2 className="text-lg font-bold">Current Exercise</h2>
          <ExerciseView currentTargetMuscles={tms} currentSynergistMuscles={sms} exercise={exercise} />
        </div>
        <div className="py-2">
          <h3 className="text-lg font-bold">Filter similar exercises</h3>
          <input
            ref={textInput}
            className={inputClassName}
            type="text"
            placeholder="Filter"
            onInput={() => {
              setFilter(textInput.current.value.toLowerCase());
            }}
          />
        </div>
        {exercises.map(([e, rating]) => {
          return (
            <section
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
              className="w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
              <ExerciseView currentSynergistMuscles={sms} currentTargetMuscles={tms} exercise={e} />
            </section>
          );
        })}
      </form>
    </Modal>
  );
}

interface IExerciseViewProps {
  exercise: IExercise;
  currentTargetMuscles: IMuscle[];
  currentSynergistMuscles: IMuscle[];
}

function ExerciseView(props: IExerciseViewProps): JSX.Element {
  const e = props.exercise;
  const tms = props.currentTargetMuscles;
  const sms = props.currentSynergistMuscles;
  const equipment = Exercise.defaultEquipment(e.id);
  const targetMuscles = Exercise.targetMuscles(e);
  const synergistMuscles = Exercise.synergistMuscles(e);
  return (
    <div>
      <section className="flex items-center">
        <div className="w-12 pr-2">
          {equipment && (
            <img
              src={`https://www.liftosaur.com/externalimages/exercises/single/small/${e.id.toLowerCase()}_${equipment.toLowerCase()}_single_small.png`}
              alt={`${e.name} image`}
            />
          )}
        </div>
        <div className="flex items-center flex-1 py-2 text-left">{e.name}</div>
      </section>
      <section className="text-xs">
        <div>
          <span className="text-gray-700">Target Muscles: </span>
          {targetMuscles.map((m, i) => {
            return (
              <span>
                <span className={tms.indexOf(m) !== -1 ? "text-green-700" : "text-red-700"}>{m}</span>
                {i !== targetMuscles.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
        <div>
          <span className="text-gray-700">Synergist Muscles: </span>
          {synergistMuscles.map((m, i) => {
            return (
              <span>
                <span className={sms.indexOf(m) !== -1 ? "text-green-700" : "text-red-700"}>{m}</span>
                {i !== synergistMuscles.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
