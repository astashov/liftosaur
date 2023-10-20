import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";

interface IProps {
  onSubmit: (value?: string) => void;
  isHidden: boolean;
}

export function ModalImportFromLink(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onSubmit(undefined)}
    >
      <GroupHeader size="large" name="Paste link here from /program web editor here" />
      <form onSubmit={(e) => e.preventDefault()}>
        <input ref={textInput} className={inputClassName} type="text" />
        <div className="mt-4 text-right">
          <Button
            name="modal-import-from-link-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={(e) => {
              e.preventDefault();
              props.onSubmit(undefined);
            }}
          >
            Cancel
          </Button>
          <Button
            name="modal-import-from-link-submit"
            kind="orange"
            type="submit"
            className="ls-submit-link"
            onClick={(e) => {
              e.preventDefault();
              props.onSubmit(textInput.current?.value);
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
