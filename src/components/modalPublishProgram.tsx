import React, { JSX } from "react";
import { Button } from "./button";
import { LftModal } from "./modal";
import { IDispatch } from "../ducks/types";
import { Input } from "./input";
import { useRef } from "react";
import { Thunk } from "../ducks/thunks";
import { IProgram } from "../types";
import { GroupHeader } from "./groupHeader";

interface IProps {
  program: IProgram;
  isHidden: boolean;
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalPublishProgram(props: IProps): JSX.Element {
  const { program, dispatch } = props;
  const idRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  return (
    <LftModal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth={true}>
      <form>
        <GroupHeader name="Publish Program" topPadding={false} />
        <div className="mb-2">
          <Input ref={idRef} label="Id" defaultValue={program.id} type="text" />
        </div>
        <div className="mb-2">
          <Input ref={nameRef} label="Name" defaultValue={program.name} type="text" />
        </div>
        <div className="mb-2">
          <Input
            ref={shortDescriptionRef}
            label="Short Description"
            defaultValue={program.shortDescription}
            type="text"
          />
        </div>
        <div className="mb-2">
          <Input ref={descriptionRef} label="Description" defaultValue={program.description} multiline={4} />
        </div>
        <div className="mb-2">
          <Input ref={urlRef} label="Url" defaultValue={program.url} type="text" />
        </div>
        <div className="mb-2">
          <Input ref={authorRef} label="Author" defaultValue={program.author} type="text" />
        </div>
        <div className="mt-4 text-center">
          <Button
            name="modal-publish-program"
            type="button"
            kind="orange"
            className="mr-3"
            onClick={() => {
              props.onClose();
              dispatch(
                Thunk.publishProgram({
                  id: idRef.current!.value ?? "",
                  name: nameRef.current!.value ?? "",
                  shortDescription: shortDescriptionRef.current!.value,
                  description: descriptionRef.current!.value ?? "",
                  url: urlRef.current!.value ?? "",
                  author: authorRef.current!.value ?? "",
                })
              );
            }}
          >
            Publish Program
          </Button>
        </div>
      </form>
    </LftModal>
  );
}
