import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { TrainingMax } from "./program/the5314b/trainingMax";
import { IProgram, ISettings } from "../types";

interface IProps {
  program: IProgram;
  programIndex: number;
  settings: ISettings;
  onClose: () => void;
  dispatch: IDispatch;
}

export function ModalPostClone(props: IProps): JSX.Element | null {
  const { program, programIndex, dispatch } = props;

  let content: (() => JSX.Element) | undefined;
  if (program.id === "the5314b") {
    content = () => (
      <TrainingMax dispatch={dispatch} program={program} programIndex={programIndex} settings={props.settings} />
    );
  }

  return content ? (
    <Modal>
      <h3 className="pb-2 font-bold text-center">Program Settings</h3>
      {content()}
    </Modal>
  ) : null;
}
