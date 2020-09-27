import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Exercise, IExerciseId } from "../models/exercise";
import { MenuItem } from "./menuItem";
import { StringUtils } from "../utils/string";

interface IModalDateProps {
  isHidden: boolean;
  onChange: (value?: IExerciseId) => void;
}

export function ModalExercise(props: IModalDateProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");

  let exercises = Exercise.all();
  if (filter) {
    exercises = exercises.filter((e) => StringUtils.fuzzySearch(filter, e.name.toLowerCase()));
  }

  console.log(filter);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onChange()}
    >
      <form data-cy="modal-exercise" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="text"
          placeholder="Filter"
          onChange={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        {exercises.map((e) => {
          return (
            <MenuItem
              name={e.name}
              onClick={() => {
                props.onChange(e.id);
              }}
            />
          );
        })}
      </form>
    </Modal>
  );
}
