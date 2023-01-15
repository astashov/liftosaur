import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IProgram } from "../types";
import { Link } from "./link";

interface IProps {
  program: IProgram;
  hasCustomPrograms: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onClose: () => void;
}

export function ModalProgramInfo(props: IProps): JSX.Element {
  const { program } = props;
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h2 className="pr-6 text-lg font-bold">
        {props.hasCustomPrograms ? "Clone" : "Start"} <Link href={program.url}>{program.name}</Link>
      </h2>
      <div className="text-sm text-grayv2-700">by {program.author}</div>
      <div dangerouslySetInnerHTML={{ __html: program.description }} className="mt-4 program-description" />
      <p className="mt-6 text-center">
        <Button type="button" kind="purple" className="mr-3" onClick={props.onPreview}>
          Preview
        </Button>
        <Button
          type="button"
          kind="orange"
          data-cy="clone-program"
          className="mr-3 ls-modal-clone-program"
          onClick={props.onSelect}
        >
          {props.hasCustomPrograms ? "Clone" : "Start"}
        </Button>
      </p>
    </Modal>
  );
}
