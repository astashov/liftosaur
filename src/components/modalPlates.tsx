import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";

interface IProps {
  onInput: (value?: number) => void;
}

export function ModalPlates(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal>
      <h3 className="pb-2 font-bold">Enter new plate weight</h3>
      <form>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="number"
          min="0"
          placeholder="Plate weight in lb"
          autofocus
        />
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onInput(undefined)}>
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            onClick={() => {
              const value = textInput.current?.value;
              const numValue = value != null ? parseInt(value, 10) : undefined;
              props.onInput(numValue != null && !isNaN(numValue) ? numValue : undefined);
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
