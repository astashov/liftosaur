import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseSetVariationsList } from "./editProgramExerciseSetVariationsList";
import { EditProgramUiExerciseSetVariations } from "../editProgram/editProgramUiExerciseSetVariations";
import { EditProgramExerciseDescriptionsList } from "./editProgramExerciseDescriptionsList";
import { EditProgramExerciseReuseSetsExercise } from "./editProgramExerciseReuseSets";
import { EditProgramExerciseReuseDescriptions } from "./editProgramExerciseReuseDescriptions";
import { EditProgramUiExerciseDescriptions } from "../editProgram/editProgramUiExerciseDescriptions";

interface IEditProgramExerciseDayExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDayExercise(props: IEditProgramExerciseDayExerciseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuse = plannerExercise.reuse;
  const hasOwnSets = plannerExercise.setVariations.length > 0;

  return (
    <div>
      {plannerExercise.descriptions.values.length > 0 && (
        <EditProgramExerciseReuseDescriptions
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={props.plannerDispatch}
          evaluatedProgram={props.evaluatedProgram}
        />
      )}
      {plannerExercise.descriptions.values.length > 0 &&
        (plannerExercise.descriptions.reuse ? (
          <div className="px-4 pb-4">
            <EditProgramUiExerciseDescriptions plannerExercise={plannerExercise} settings={props.settings} />
          </div>
        ) : (
          <EditProgramExerciseDescriptionsList
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={props.plannerDispatch}
          />
        ))}
      <EditProgramExerciseReuseSetsExercise
        plannerExercise={plannerExercise}
        settings={props.settings}
        plannerDispatch={props.plannerDispatch}
        evaluatedProgram={props.evaluatedProgram}
      />
      {reuse && !hasOwnSets ? (
        <div className="px-4">
          <EditProgramUiExerciseSetVariations
            plannerExercise={plannerExercise}
            settings={props.settings}
            isCurrentIndicatorNearby={true}
          />
        </div>
      ) : (
        <EditProgramExerciseSetVariationsList
          ui={props.ui}
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={props.plannerDispatch}
        />
      )}
    </div>
  );
}
