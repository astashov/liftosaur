import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { Weight_build } from "../models/weight";
import { lb } from "lens-shmens";
import { Exercise_get, Exercise_toKey } from "../models/exercise";
import { updateState, IState } from "../models/state";
import { ISettings, IExerciseType } from "../types";
import { ExerciseRM } from "./exerciseRm";

interface IModal1RMProps {
  settings: ISettings;
  exercise: IExerciseType;
  onClose: () => void;
  dispatch: IDispatch;
}

export function Modal1RM(props: IModal1RMProps): JSX.Element {
  const exercise = Exercise_get(props.exercise, props.settings.exercises);
  return (
    <Modal isHidden={false} onClose={props.onClose} shouldShowClose={true} isFullWidth>
      <ExerciseRM
        name="1 Rep Max"
        rmKey="rm1"
        exercise={exercise}
        settings={props.settings}
        onEditVariable={(value) => {
          updateState(
            props.dispatch,
            [
              lb<IState>()
                .p("storage")
                .p("settings")
                .p("exerciseData")
                .recordModify((data) => {
                  const k = Exercise_toKey(exercise);
                  return { ...data, [k]: { ...data[k], rm1: Weight_build(value, props.settings.units) } };
                }),
            ],
            "Update 1RM from modal"
          );
        }}
      />
    </Modal>
  );
}
