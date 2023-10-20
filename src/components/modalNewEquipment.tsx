import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";
import { GroupHeader } from "./groupHeader";
import { Input } from "./input";

interface IProps {
  onInput: (value?: string) => void;
  isHidden: boolean;
}

export function ModalNewEquipment(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onInput(undefined)}
    >
      <GroupHeader size="large" name="Enter new equipment name" />
      <form onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Equipment name"
          ref={textInput}
          required={true}
          requiredMessage="Please enter a name for the equipment"
          type="text"
          placeholder="Tummy Tormentor 3000"
        />
        <div className="mt-4 text-right">
          <Button
            name="add-equipment-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => props.onInput(undefined)}
          >
            Cancel
          </Button>
          <Button
            kind="orange"
            type="submit"
            name="add-equipment-submit"
            className="ls-add-equipment"
            onClick={() => {
              const value = textInput.current?.value;
              if (value) {
                props.onInput(value);
              }
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
