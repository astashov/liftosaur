import { h, JSX, Fragment } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program_getSupersetExercises } from "../../models/program";
import { useState } from "preact/hooks";
import { BottomSheetEditProgramExerciseSuperset } from "./bottomSheetEditProgramExerciseSuperset";
import { LinkButton } from "../linkButton";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";

interface IEditProgramExerciseSupersetsProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseSupersets(props: IEditProgramExerciseSupersetsProps): JSX.Element {
  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const superset = props.plannerExercise.superset;
  const supersetExercises = Program_getSupersetExercises(props.evaluatedProgram, props.plannerExercise);
  return (
    <div>
      <div
        className="flex items-center gap-2 mx-4 mb-2 text-sm border-b cursor-pointer border-border-neutral min-h-12"
        data-cy="edit-exercise-select-superset"
        onClick={() => {
          setShowSupersetPicker(true);
        }}
      >
        <span>Superset group:</span>
        <LinkButton name="superset-group">{superset == null ? "None" : superset.name}</LinkButton>
        {supersetExercises.length > 0 && (
          <span className="text-xs text-text-secondary" data-cy="edit-exercise-superset-exercises">
            (
            {supersetExercises.map((e, i) => {
              return (
                <>
                  {i !== 0 ? ", " : ""}
                  <strong>{e.fullName}</strong>
                </>
              );
            })}
            )
          </span>
        )}
      </div>
      {showSupersetPicker && (
        <BottomSheetEditProgramExerciseSuperset
          isHidden={!showSupersetPicker}
          onClose={() => setShowSupersetPicker(false)}
          plannerExercise={props.plannerExercise}
          evaluatedProgram={props.evaluatedProgram}
          settings={props.settings}
          onSelect={(group: string | undefined) => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                ex.superset = group ? { name: group } : undefined;
              }
            );
            setShowSupersetPicker(false);
          }}
        />
      )}
    </div>
  );
}
