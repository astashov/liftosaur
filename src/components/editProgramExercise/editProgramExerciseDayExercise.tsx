import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
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
import { EditProgramExerciseOrder } from "./editProgramExerciseOrder";
import { ObjectUtils_isEqual } from "../../utils/object";
import { EditProgramExerciseSupersets } from "./editProgramExerciseSupersets";

interface IEditProgramExerciseDayExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  showSupersets: boolean;
  showRepeat: boolean;
  showOrder: boolean;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseDayExercise(props: IEditProgramExerciseDayExerciseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuse = plannerExercise.reuse;
  const [isOverriding, setIsOverriding] = useState<boolean>(
    plannerExercise.reuse != null &&
      !ObjectUtils_isEqual(
        { v: plannerExercise.evaluatedSetVariations },
        { v: plannerExercise.reuse.exercise?.evaluatedSetVariations || [] }
      )
  );
  const [showRepeating, setShowRepeating] = useState(plannerExercise.isRepeat);

  if (showRepeating) {
    return (
      <View className="px-4 pb-4">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-sm">Repeating from week {plannerExercise.repeating[0]}</Text>
          </View>
          <View>
            <LinkButton
              name="override-repeating"
              onClick={() => {
                setShowRepeating(false);
              }}
            >
              Override
            </LinkButton>
          </View>
        </View>
        <EditProgramUiExerciseSetVariations
          plannerExercise={plannerExercise}
          settings={props.settings}
          isCurrentIndicatorNearby={true}
        />
      </View>
    );
  }

  return (
    <View>
      {props.showRepeat && (
        <View className="px-4">
          <EditProgramExerciseRepeat
            plannerExercise={plannerExercise}
            numberOfWeeks={props.evaluatedProgram.weeks.length}
            settings={props.settings}
            onRemoveOverride={() => setShowRepeating(true)}
            plannerDispatch={props.plannerDispatch}
          />
        </View>
      )}
      {props.showOrder && (
        <View className="px-4">
          <EditProgramExerciseOrder
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={props.plannerDispatch}
          />
        </View>
      )}
      {props.showSupersets && (
        <EditProgramExerciseSupersets
          plannerExercise={plannerExercise}
          evaluatedProgram={props.evaluatedProgram}
          exerciseStateKey={props.exerciseStateKey}
          programId={props.programId}
        />
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
          <View className="px-4 pb-4">
            <EditProgramUiExerciseDescriptions plannerExercise={plannerExercise} settings={props.settings} />
          </View>
        ) : (
          <EditProgramExerciseDescriptionsList
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={props.plannerDispatch}
          />
        ))}
      <EditProgramExerciseReuseSetsExercise
        ui={props.ui}
        plannerExercise={plannerExercise}
        settings={props.settings}
        isOverriding={isOverriding}
        setIsOverriding={setIsOverriding}
        plannerDispatch={props.plannerDispatch}
        evaluatedProgram={props.evaluatedProgram}
      />
      {reuse && !isOverriding ? (
        <View className="px-4">
          <EditProgramUiExerciseSetVariations
            plannerExercise={plannerExercise}
            settings={props.settings}
            isCurrentIndicatorNearby={true}
          />
        </View>
      ) : (
        <EditProgramExerciseSetVariationsList
          ui={props.ui}
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={props.plannerDispatch}
          exerciseStateKey={props.exerciseStateKey}
          programId={props.programId}
        />
      )}
    </View>
  );
}
