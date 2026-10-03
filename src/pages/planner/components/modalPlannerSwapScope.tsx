import { JSX } from "react";
import { lb } from "lens-shmens";
import { Modal } from "../../../components/modal";
import { Button } from "../../../components/button";
import { GroupHeader } from "../../../components/groupHeader";
import { pickerStateFromPlannerExercise } from "../../../components/editProgram/editProgramUtils";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ISettings } from "../../../types";
import { IPlannerProgramExercise, IPlannerState } from "../models/types";

export function ModalPlannerSwapScope(props: {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
}): JSX.Element {
  const lbUi = lb<IPlannerState>().p("ui");
  const { plannerExercise } = props;
  const onClose = (): void => {
    props.dispatch(lbUi.p("editExerciseModal").record(undefined), "Close swap scope");
  };
  const openPicker = (change: "one" | "all"): void => {
    props.dispatch(
      [
        lbUi.p("editExerciseModal").record(undefined),
        lbUi.p("exercisePicker").record({
          state: { ...pickerStateFromPlannerExercise(props.settings, plannerExercise), hideLabel: true },
          exerciseKey: plannerExercise.key,
          dayData: plannerExercise.dayData,
          change,
        }),
      ],
      change === "one" ? "Change exercise for one instance" : "Change exercise for all instances"
    );
  };

  return (
    <Modal name="planner-swap-scope" shouldShowClose={true} onClose={onClose}>
      <GroupHeader size="large" name="Change Exercise" />
      <div className="flex gap-4 py-2">
        <Button name="edit-exercise-change-one" data-testid="edit-exercise-change-one" kind="purple" onClick={() => openPicker("one")}>
          Change only for this week/day
        </Button>
        <Button name="edit-exercise-change-all" data-testid="edit-exercise-change-all" kind="purple" onClick={() => openPicker("all")}>
          Change across whole program
        </Button>
      </div>
    </Modal>
  );
}
