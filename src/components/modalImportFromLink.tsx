import { JSX, useRef } from "react";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";

export function ModalImportFromLinkContent(props: { onSubmit: (value?: string) => void }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <>
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
            kind="purple"
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
    </>
  );
}
