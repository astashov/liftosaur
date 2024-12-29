import React, { JSX } from "react";
import { Button } from "./button";
import { Modal } from "./modal";
import { useRef } from "react";
import { Input } from "./input";
import { LinkButton } from "./linkButton";
import { UrlUtils } from "../utils/url";
import { IconSpinner } from "./icons/iconSpinner";

interface IProps {
  onSelect: (name: string, isV2: boolean) => void;
  onClose: () => void;
  isLoading?: boolean;
  isHidden: boolean;
}

function hasLegacyProgram(): boolean {
  if (typeof window !== "undefined") {
    const url = UrlUtils.build(window.location.href);
    return !!url.searchParams.get("legacy");
  } else {
    return false;
  }
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
          data-cy="modal-create-experimental-program-submit"
          name="modal-create-program-submit"
          type="button"
          disabled={props.isLoading}
          kind="orange"
          className="ls-modal-create-program"
          onClick={() => {
            if (!props.isLoading && textInput.current!.value) {
              props.onSelect(textInput.current!.value, true);
            }
          }}
        >
          {props.isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Create"}
        </Button>
      </p>
      {hasLegacyProgram() && (
        <div className="mt-2 text-center">
          <LinkButton
            name="modal-create-experimental-program-submit"
            data-cy="modal-create-program-submit"
            className="text-xs ls-modal-create-legacy-program"
            onClick={() => {
              if (textInput.current!.value) {
                props.onSelect(textInput.current!.value, false);
              }
            }}
          >
            Create legacy program
          </LinkButton>
        </div>
      )}
    </Modal>
  );
}
