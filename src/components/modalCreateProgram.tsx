import { JSX, useRef } from "react";
import { Button } from "./button";
import { Modal } from "./modal";
import { Input } from "./input";
import { IconSpinner } from "./icons/iconSpinner";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  isHidden: boolean;
}

export function ModalCreateProgramContent(props: Omit<IProps, "isHidden">): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <>
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
          data-cy="modal-create-experimental-program-submit"
          name="modal-create-program-submit"
          type="button"
          disabled={props.isLoading}
          kind="purple"
          className="ls-modal-create-program"
          onClick={() => {
            if (!props.isLoading && textInput.current?.value) {
              props.onSelect(textInput.current.value);
            }
          }}
        >
          {props.isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Create"}
        </Button>
      </p>
    </>
  );
}

export function ModalCreateProgram(props: IProps): JSX.Element {
  return (
    <Modal zIndex={70} isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <ModalCreateProgramContent onSelect={props.onSelect} onClose={props.onClose} isLoading={props.isLoading} />
    </Modal>
  );
}
