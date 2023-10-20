import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { inputClassName } from "./input";
import { GroupHeader } from "./groupHeader";

interface IModalAddFriendProps {
  isHidden: boolean;
  onAdd: (message: string) => void;
  onCancel: () => void;
}

export function ModalAddFriend(props: IModalAddFriendProps): JSX.Element {
  const textArea = useRef<HTMLTextAreaElement>(null);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={textArea} isFullWidth={true}>
      <GroupHeader size="large" name="Enter some message (optional)" />
      <form onSubmit={(e) => e.preventDefault()}>
        <textarea
          ref={textArea}
          data-cy="modal-add-friend-input"
          style={{ minHeight: "10em" }}
          className={inputClassName}
          placeholder="Hi! Let's be friends!"
        ></textarea>
        <div className="mt-4 text-right">
          <Button
            name="modal-add-friend-cancel"
            type="button"
            kind="grayv2"
            data-cy="modal-add-friend-cancel"
            className="mr-3"
            onClick={() => props.onCancel()}
          >
            Cancel
          </Button>
          <Button
            name="modal-add-friend-submit"
            kind="orange"
            data-cy="modal-add-friend-invite"
            className="ls-modal-set-weight"
            type="submit"
            onClick={() => {
              const value = textArea.current?.value;
              props.onAdd(value);
            }}
          >
            Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
