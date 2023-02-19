import { h, JSX } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { Modal } from "../../../components/modal";
import { IExerciseId, IProgram, ISettings } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { ProgramContentExercise } from "./programContentExercise";

interface IProgramContentModalExistingExerciseProps {
  onChange: (value?: IExerciseId) => void;
  isHidden?: boolean;
  dayIndex: number;
  program: IProgram;
  settings: ISettings;
}

export function ProgramContentModalExistingExercise(props: IProgramContentModalExistingExerciseProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const excludedExercises = new Set(props.program.days[props.dayIndex].exercises.map((e) => e.id));
  const availableExercises = props.program.exercises.filter(
    (e) => !excludedExercises.has(e.id) && (filter ? StringUtils.fuzzySearch(filter, e.name.toLowerCase()) : true)
  );
  useEffect(() => {
    if (!props.isHidden) {
      textInput.current.value = "";
      setFilter("");
    }
  }, [!!props.isHidden]);

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onChange()}
    >
      <form
        data-cy="modal-existing-exercise"
        style={{ width: "40rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (availableExercises.length === 1) {
            props.onChange(availableExercises[0].id);
          }
        }}
      >
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
        {availableExercises.map((programExercise) => {
          return (
            <button
              onClick={() => props.onChange(programExercise.id)}
              className="block w-full text-left cursor-pointer"
            >
              <ProgramContentExercise
                programExercise={programExercise}
                program={props.program}
                settings={props.settings}
              />
            </button>
          );
        })}
      </form>
    </Modal>
  );
}
