import React, { JSX } from "react";
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
      {props.exerciseType && <ExerciseImage settings={props.settings} exerciseType={props.exerciseType} size="large" />}
    </Modal>
  );
}
