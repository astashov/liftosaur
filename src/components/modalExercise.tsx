import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Exercise, IExerciseId } from "../models/exercise";
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
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        {exercises.map((e) => {
          const equipment = Exercise.defaultEquipment(e.id);
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
    </Modal>
  );
}
