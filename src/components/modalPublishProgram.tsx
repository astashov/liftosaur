import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IProgram } from "../models/program";
import { IDispatch } from "../ducks/types";
import { inputClassName } from "./input";
import { useRef } from "preact/hooks";
import { Thunk } from "../ducks/thunks";

interface IProps {
  program: IProgram;
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalPublishProgram(props: IProps): JSX.Element {
  const { program, dispatch } = props;
  const idRef = useRef<HTMLInputElement>();
  const nameRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const urlRef = useRef<HTMLInputElement>();
  const authorRef = useRef<HTMLInputElement>();
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <form>
        <div>
          <label for="program_id">Id</label>
          <input ref={idRef} id="program_id" className={inputClassName} type="text" value={program.id} />
        </div>
        <div>
          <label for="program_name">Name</label>
          <input ref={nameRef} id="program_name" className={inputClassName} type="text" value={program.name} />
        </div>
        <div>
          <label for="program_description">Description</label>
          <textarea ref={descriptionRef} id="program_description" className={inputClassName}>
            {program.description}
          </textarea>
        </div>
        <div>
          <label for="program_url">Url</label>
          <input ref={urlRef} id="program_url" className={inputClassName} type="text" value={program.url} />
        </div>
        <div>
          <label for="program_author">Author</label>
          <input ref={authorRef} id="program_author" className={inputClassName} type="text" value={program.author} />
        </div>
        <div className="mt-4 text-center">
          <Button
            type="button"
            kind="green"
            className="mr-3"
            onClick={() => {
              props.onClose();
              dispatch(
                Thunk.publishProgram({
                  id: idRef.current.value,
                  name: nameRef.current.value,
                  description: descriptionRef.current.value,
                  url: urlRef.current.value,
                  author: authorRef.current.value,
                })
              );
            }}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
