import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { Weight } from "../models/weight";
import { lb } from "lens-shmens";
import { Exercise } from "../models/exercise";
import { updateState, IState } from "../models/state";
import { ISettings, IExerciseType } from "../types";
import { ExerciseRM } from "./exerciseRm";

interface IModal1RMProps {
  progressId: number;
  settings: ISettings;
  exercise: IExerciseType;
  dispatch: IDispatch;
}

export function Modal1RM(props: IModal1RMProps): JSX.Element {
  const exercise = Exercise.get(props.exercise, props.settings.exercises);
  return (
    <Modal
      isHidden={false}
      onClose={() => {
        updateState(props.dispatch, [
          lb<IState>().p("progress").pi(props.progressId).pi("ui").p("rm1Modal").record(undefined),
        ]);
      }}
      shouldShowClose={true}
      isFullWidth
    >
      <ExerciseRM
        name="1 Rep Max"
        rmKey="rm1"
        exercise={exercise}
        settings={props.settings}
        onEditVariable={(value) => {
          updateState(props.dispatch, [
            lb<IState>()
              .p("storage")
              .p("settings")
              .p("exerciseData")
              .recordModify((data) => {
                const k = Exercise.toKey(exercise);
                return { ...data, [k]: { ...data[k], rm1: Weight.build(value, props.settings.units) } };
              }),
          ]);
        }}
      />
    </Modal>
  );
}
