import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Exercise, IExercise } from "../models/exercise";
import { StringUtils } from "../utils/string";
import { inputClassName } from "./input";
import { IExerciseId, IAllCustomExercises } from "../types";
import { IScreenMuscle, Muscle } from "../models/muscle";

interface IModalSubstituteProps {
  screenMuscle: IScreenMuscle;
  customExercises: IAllCustomExercises;
  onChange: (value?: IExerciseId) => void;
}

export function ModalExercisesByMuscle(props: IModalSubstituteProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");

  let exercises = Exercise.sortedByScreenMuscle(props.screenMuscle, props.customExercises);
  if (filter) {
    exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e[0].name.toLowerCase()));
  }

  return (
    <Modal autofocusInputRef={textInput} shouldShowClose={true} onClose={() => props.onChange()}>
      <h2 className="text-lg font-bold">Select exercises for {StringUtils.capitalize(props.screenMuscle)}</h2>
      <p className="py-2">It adds an exercise to the last day of the current week</p>
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <div className="py-2">
          <h3 className="text-lg font-bold">Filter exercises</h3>
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
              className="w-full px-2 py-1 text-left border-b border-gray-200 cursor-pointer"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
              <ExerciseView screenMuscle={props.screenMuscle} exercise={e} customExercises={props.customExercises} />
            </section>
          );
        })}
      </form>
    </Modal>
  );
}

interface IExerciseViewProps {
  exercise: IExercise;
  customExercises: IAllCustomExercises;
  screenMuscle: IScreenMuscle;
}

function ExerciseView(props: IExerciseViewProps): JSX.Element {
  const e = props.exercise;
  const equipment = Exercise.defaultEquipment(e.id, props.customExercises);
  const targetMuscles = Exercise.targetMuscles(e, props.customExercises);
  const synergistMuscles = Exercise.synergistMuscles(e, props.customExercises);
  const muscles = Muscle.getMusclesFromScreenMuscle(props.screenMuscle);
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
                <span className={muscles.indexOf(m) !== -1 ? "text-green-700" : "text-red-700"}>{m}</span>
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
                <span className={muscles.indexOf(m) !== -1 ? "text-green-700" : "text-red-700"}>{m}</span>
                {i !== synergistMuscles.length - 1 ? ", " : ""}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
