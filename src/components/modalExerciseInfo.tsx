import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IExerciseType, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";

interface IModalDateProps {
  isHidden: boolean;
  settings: ISettings;
  exerciseType?: IExerciseType;
  onClose: () => void;
}

export function ModalExerciseInfo(props: IModalDateProps): JSX.Element {
  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose} isFullWidth={true}>
      {props.exerciseType && <ExerciseImage exerciseType={props.exerciseType} size="large" />}
    </Modal>
  );
}
