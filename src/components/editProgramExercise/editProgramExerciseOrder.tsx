import { JSX, h } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { InputNumber2 } from "../inputNumber2";

interface IEditProgramExerciseOrderProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

export function EditProgramExerciseOrder(props: IEditProgramExerciseOrderProps): JSX.Element {
  return (
    <div className="flex items-center mb-2">
      <span className="mr-2 text-sm">Forced order: </span>
      <InputNumber2
        name="edit-exercise-order"
        value={props.plannerExercise.order}
        min={0}
        max={100}
        step={1}
        onInput={(val) => {
          if (val != null && !isNaN(val)) {
            EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                ex.order = val;
              }
            );
          }
        }}
        onBlur={(val) => {
          if (val != null) {
            EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                ex.order = val;
              }
            );
          }
        }}
      />
    </div>
  );
}
