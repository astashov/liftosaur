import { JSX, h } from "preact";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { Input2 } from "./input2";
import { Modal } from "./modal";
import { useState } from "preact/hooks";

interface IModalNewSupersetGroupProps {
  onSelect: (name: string | undefined) => void;
  onClose: () => void;
}

export function ModalNewSupersetGroup(props: IModalNewSupersetGroupProps): JSX.Element {
  const [name, setName] = useState("");
  return (
    <Modal zIndex={50} onClose={props.onClose} isHidden={false}>
      <GroupHeader size="large" name="Enter new group name" />
      <form onSubmit={(e) => e.preventDefault()}>
        <Input2
          identifier="superset-group-input"
          data-cy="group-input"
          onInput={(event) => {
            setName(event.currentTarget.value);
          }}
          label="Name"
          required
          requiredMessage="Name cannot be empty"
          type="text"
          placeholder="My Group Name"
        />
        <div className="mt-4 text-right">
          <Button
            name="modal-new-superset-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => props.onClose()}
          >
            Cancel
          </Button>
          <Button
            kind="purple"
            name="modal-new-superset-submit"
            type="submit"
            data-cy="add-superset"
            disabled={!name.trim()}
            className="ls-add-superset"
            onClick={() => {
              if (name.trim() !== "") {
                props.onSelect(name.trim());
                props.onClose();
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
