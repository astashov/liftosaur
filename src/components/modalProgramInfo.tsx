import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IProgramId, Program } from "../models/program";

interface IProps {
  programId: IProgramId;
  onSelect: () => void;
  onClose: () => void;
}

export function ModalProgramInfo(props: IProps): JSX.Element {
  const program = Program.get(props.programId);
  return (
    <Modal>
      <h3 className="pb-2 font-bold text-center">
        <a className="text-blue-700 underline" href={program.url} target="_blank">
          {program.name}
        </a>{" "}
        <span>by {program.author}</span>
      </h3>
      {program.description}
      <p className="mt-4 text-center">
        <Button type="button" kind="gray" className="mr-3" onClick={props.onClose}>
          Cancel
        </Button>
        <Button type="button" kind="green" className="mr-3" onClick={props.onSelect}>
          Select
        </Button>
      </p>
    </Modal>
  );
}
