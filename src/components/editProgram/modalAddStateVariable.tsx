import { h, JSX } from "preact";
import { Modal } from "../modal";
import { Button } from "../button";
import { useRef, useState } from "preact/hooks";
import { GroupHeader } from "../groupHeader";
import { MenuItemEditable } from "../menuItemEditable";
import { Input } from "../input";

interface IProps {
  onDone: (newValue?: string, newType?: string, userPrompted?: boolean) => void;
  isHidden: boolean;
}

export function ModalAddStateVariable(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>();
  const [type, setType] = useState("");
  const [userPrompted, setUserPrompted] = useState(false);

  function clear(): void {
    setUserPrompted(false);
    setType("");
    if (textInput.current) {
      textInput.current.value = "";
    }
  }

  return (
    <Modal
      isFullWidth={true}
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => {
        clear();
        props.onDone();
      }}
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
        <MenuItemEditable
          type="boolean"
          name="User prompted"
          nextLine={
            <div className="text-xs text-grayv2-main" style={{ marginTop: "-0.5rem" }}>
              Ask user to enter value for this variable after finishing exercise
            </div>
          }
          value={userPrompted ? "true" : "false"}
          onChange={(v) => setUserPrompted(v === "true")}
        />
        <div className="flex justify-between mt-4">
          <Button
            name="cancel-add-state-variable"
            data-cy="modal-add-state-variable-cancel"
            type="button"
            kind="grayv2"
            onClick={() => {
              clear();
              props.onDone();
            }}
          >
            Cancel
          </Button>
          <Button
            name="add-state-variable"
            data-cy="modal-add-state-variable-submit"
            kind="orange"
            type="submit"
            onClick={() => {
              if (textInput.current?.value) {
                props.onDone(textInput.current!.value, type, userPrompted);
                clear();
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
