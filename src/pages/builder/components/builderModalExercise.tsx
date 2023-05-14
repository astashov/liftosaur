import { h, JSX } from "preact";
import { forwardRef } from "preact/compat";
import { Ref, useEffect, useRef, useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Modal } from "../../../components/modal";
import { Exercise } from "../../../models/exercise";
import { IExerciseId } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { IBuilderDispatch } from "../models/builderReducer";

interface IBuilderModalExerciseProps {
  onChange: (value?: IExerciseId) => void;
  dispatch: IBuilderDispatch;
  isHidden: boolean;
}

export function BuilderModalExercise(props: IBuilderModalExerciseProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onChange()}
    >
      <ExercisesList
        isHidden={props.isHidden}
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
  isHidden: boolean;
}

const ExercisesList = forwardRef(
  (props: IExercisesListProps): JSX.Element => {
    const { textInput, setFilter, filter } = props;

    let exercises = Exercise.all({});
    if (filter) {
      exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e.name.toLowerCase()));
    }

    useEffect(() => {
      if (textInput.current) {
        textInput.current.value = "";
      }
    }, [props.isHidden]);

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
          return (
            <section
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}`}
              className="w-full px-2 py-1 text-left border-b border-gray-200"
              onClick={() => {
                props.onChange(e.id);
              }}
            >
              <section className="flex items-center">
                <div className="w-12 pr-2" style={{ minHeight: "2.5rem" }}>
                  <ExerciseImage className="w-full" exerciseType={e} size="small" />
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
