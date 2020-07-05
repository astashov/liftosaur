import { h, JSX } from "preact";
import { Modal } from "../modal";
import { Button } from "../button";
import { useRef } from "preact/hooks";

interface IProps {
  onDone: (newValue?: string) => void;
}

export function ModalAddStateVariable(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal>
      <h3 className="pb-2 font-bold text-center">Add State Variable</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <label for="add_state_variable" className="block text-sm font-bold">
          Variable Name
        </label>
        <input
          id="add_state_variable"
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          value=""
          type="text"
          autofocus
        />
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onDone()}>
            Cancel
          </Button>
          <Button kind="green" type="submit" onClick={() => props.onDone(textInput.current.value)}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
