import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { useRef } from "preact/hooks";
import { Input } from "./input";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
  isHidden: boolean;
}

export function ModalCreateProgram(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={textInput} onClose={props.onClose} shouldShowClose={true}>
      <h3 className="pb-2 text-xl font-bold text-center">Create Program</h3>
      <Input
        label="Program Name"
        data-cy="modal-create-program-input"
        ref={textInput}
        type="text"
        placeholder="My Awesome Routine"
        required={true}
        requiredMessage="Please enter a name for your program"
      />
      <p className="mt-4 text-center">
        <Button
          name="modal-create-program-cancel"
          data-cy="modal-create-program-cancel"
          type="button"
          kind="grayv2"
          className="mr-3"
          onClick={props.onClose}
        >
          Cancel
        </Button>
        <Button
          name="modal-create-program-submit"
          data-cy="modal-create-program-submit"
          type="button"
          kind="orange"
          className="ls-modal-create-program"
          onClick={() => {
            if (textInput.current.value) {
              props.onSelect(textInput.current.value);
            }
          }}
        >
          Create
        </Button>
      </p>
    </Modal>
  );
}
