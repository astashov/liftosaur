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
import { EditProgramExerciseRepeat } from "./editProgramExerciseRepeat";
import { LinkButton } from "../linkButton";
import { useState } from "preact/hooks";
import { EditProgramExerciseOrder } from "./editProgramExerciseOrder";

interface IEditProgramExerciseDayExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  showRepeat: boolean;
  showOrder: boolean;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDayExercise(props: IEditProgramExerciseDayExerciseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuse = plannerExercise.reuse;
  const hasOwnSets = plannerExercise.setVariations.length > 0;
  const [showRepeating, setShowRepeating] = useState(plannerExercise.isRepeat);

  if (showRepeating) {
    return (
      <div className="px-4 pb-4">
        <div className="flex gap-4">
          <div className="text-sm">Repeating from week {plannerExercise.repeating[0]}</div>
          <div className="ml-auto text-sm">
            <LinkButton
              name="override-repeating"
              onClick={() => {
                setShowRepeating(false);
              }}
            >
              Override
            </LinkButton>
          </div>
        </div>
        <EditProgramUiExerciseSetVariations
          plannerExercise={plannerExercise}
          settings={props.settings}
          isCurrentIndicatorNearby={true}
        />
      </div>
    );
  }

  return (
    <div>
      {props.showRepeat && (
        <div className="px-4">
          <EditProgramExerciseRepeat
            plannerExercise={plannerExercise}
            numberOfWeeks={props.evaluatedProgram.weeks.length}
            settings={props.settings}
            onRemoveOverride={() => setShowRepeating(true)}
            plannerDispatch={props.plannerDispatch}
          />
        </div>
      )}
      {props.showOrder && (
        <div className="px-4">
          <EditProgramExerciseOrder
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={props.plannerDispatch}
          />
        </div>
      )}
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
