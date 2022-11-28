import { h, JSX } from "preact";
import { Modal } from "../modal";
import { Button } from "../button";
import { useRef, useState } from "preact/hooks";
import { GroupHeader } from "../groupHeader";
import { MenuItemEditable } from "../menuItemEditable";
import { Input } from "../input";

interface IProps {
  onDone: (newValue?: string, newType?: string) => void;
  isHidden: boolean;
}

export function ModalAddStateVariable(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>();
  const [type, setType] = useState("");
  return (
    <Modal
      isFullWidth={true}
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onDone()}
    >
      <GroupHeader size="large" topPadding={false} name="Add State Variable" />
      <form onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Variable Name"
          data-cy="modal-add-state-variable-input-name"
          id="add_state_variable"
          ref={textInput}
          defaultValue=""
          type="text"
          autofocus
        />
        <MenuItemEditable
          type="select"
          values={[
            ["", "number"],
            ["kg", "kg"],
            ["lb", "lb"],
          ]}
          value={type}
          onChange={(v) => {
            if (v != null) {
              setType(v);
            }
          }}
          name="Variable Type"
          data-cy="modal-add-state-variable-input-type"
        />
        <div className="flex justify-between mt-4">
          <Button data-cy="modal-add-state-variable-cancel" type="button" kind="grayv2" onClick={() => props.onDone()}>
            Cancel
          </Button>
          <Button
            data-cy="modal-add-state-variable-submit"
            kind="orange"
            type="submit"
            onClick={() => {
              props.onDone(textInput.current!.value, type);
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
