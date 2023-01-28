import { h, JSX } from "preact";
import { forwardRef } from "preact/compat";
import { Ref, useRef, useState } from "preact/hooks";
import { Modal } from "../../../components/modal";
import { Exercise } from "../../../models/exercise";
import { IExerciseId } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { IBuilderDispatch } from "../models/builderReducer";

interface IBuilderModalExerciseProps {
  onChange: (value?: IExerciseId) => void;
  dispatch: IBuilderDispatch;
}

export function BuilderModalExercise(props: IBuilderModalExerciseProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");

  return (
    <Modal autofocusInputRef={textInput} shouldShowClose={true} onClose={() => props.onChange()} isFullWidth={true}>
      <ExercisesList
        dispatch={props.dispatch}
        filter={filter}
        setFilter={setFilter}
        textInput={textInput}
        onChange={props.onChange}
      />
    </Modal>
  );
}

interface IExercisesListProps {
  filter: string;
  setFilter: (newFilter: string) => void;
  onChange: (value?: IExerciseId) => void;
  textInput: Ref<HTMLInputElement>;
  dispatch: IBuilderDispatch;
}

const ExercisesList = forwardRef(
  (props: IExercisesListProps): JSX.Element => {
    const { textInput, setFilter, filter } = props;

    let exercises = Exercise.all({});
    if (filter) {
      exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e.name.toLowerCase()));
    }

    return (
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <input
          autoFocus={true}
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="text"
          placeholder="Filter"
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        {exercises.map((e) => {
          const equipment = Exercise.defaultEquipment(e.id, {});
          return (
            <section
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
              className="w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
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
            </section>
          );
        })}
      </form>
    );
  }
);
