import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { IProgram } from "../models/program";

interface IProps {
  program: IProgram;
  onSelect: () => void;
  onClose: () => void;
}

export function ModalProgramInfo(props: IProps): JSX.Element {
  const { program } = props;
  return (
    <Modal>
      <p className="px-1 pb-1 text-sm italic">
        Make sure to{" "}
        <a className="text-blue-700 underline" href={program.url} target="_blank">
          read about the program
        </a>{" "}
        before starting it!!!
      </p>
      <h3 className="pb-2 font-bold text-center">
        <a className="text-blue-700 underline" href={program.url} target="_blank">
          {program.name}
        </a>{" "}
        <span>by {program.author}</span>
      </h3>
      <div dangerouslySetInnerHTML={{ __html: program.description }} className="program-description" />
      <p className="mt-4 text-center">
        <Button type="button" kind="gray" className="mr-3" onClick={props.onClose}>
          Cancel
        </Button>
        <Button type="button" kind="green" className="mr-3" onClick={props.onSelect}>
          Clone
        </Button>
      </p>
    </Modal>
  );
}
