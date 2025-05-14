import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { BottomSheet } from "../bottomSheet";

interface IBottomSheetEditProgramExerciseSetProps {
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function BottomSheetEditProgramExerciseSet(props: IBottomSheetEditProgramExerciseSetProps): JSX.Element {
  const lbUi = lb<IPlannerExerciseState>().pi("ui");
  function onClose(): void {
    props.plannerDispatch(lbUi.p("editSetBottomSheet").record(undefined));
  }

  return (
    <BottomSheet isHidden={!props.ui.editSetBottomSheet} onClose={onClose} shouldShowClose={true}>
      <div className="p-4">Hmm</div>
    </BottomSheet>
  );
}
