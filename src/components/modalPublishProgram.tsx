import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { Input } from "./input";
import { useRef } from "preact/hooks";
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
  const idRef = useRef<HTMLInputElement>();
  const nameRef = useRef<HTMLInputElement>();
  const shortDescriptionRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const urlRef = useRef<HTMLInputElement>();
  const authorRef = useRef<HTMLInputElement>();
  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth={true}>
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
                Thunk.publishProgram(program, {
                  id: idRef.current.value,
                  name: nameRef.current.value,
                  shortDescription: shortDescriptionRef.current.value,
                  description: descriptionRef.current.value,
                  url: urlRef.current.value,
                  author: authorRef.current.value,
                })
              );
            }}
          >
            Publish Program
          </Button>
        </div>
      </form>
    </Modal>
  );
}
