import { JSX, useEffect, useMemo } from "react";
import { View, Platform } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetEditProgramExerciseSupersetContent } from "../../components/editProgramExercise/bottomSheetEditProgramExerciseSuperset";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import type { IRootStackParamList } from "../types";

export function NavModalEditProgramExerciseSuperset(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgramExerciseSupersetModal";
    params: IRootStackParamList["editProgramExerciseSupersetModal"];
  }>();
  const { exerciseStateKey, exerciseKey } = route.params;

  const plannerState = state.editProgramExerciseStates?.[exerciseStateKey] as IPlannerExerciseState | undefined;

  const plannerDispatch = useMemo(() => {
    if (!plannerState) {
      return undefined;
    }
    return buildPlannerDispatch(
      dispatch,
      lb<IState>().p("editProgramExerciseStates").p(exerciseStateKey),
      plannerState
    );
  }, [dispatch, exerciseStateKey, plannerState]);

  const evaluatedProgram = plannerState
    ? Program_evaluate(plannerState.current.program, state.storage.settings)
    : undefined;

  const plannerExercise = Program_getFirstProgramExercise(evaluatedProgram, exerciseKey);

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !evaluatedProgram || !plannerDispatch || !plannerExercise;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  const content = (
    <BottomSheetEditProgramExerciseSupersetContent
      plannerExercise={plannerExercise!}
      evaluatedProgram={evaluatedProgram!}
      settings={state.storage.settings}
      onSelect={(group) => {
        EditProgramUiHelpers_changeCurrentInstanceExercise(
          plannerDispatch!,
          plannerExercise!,
          state.storage.settings,
          (ex) => {
            ex.superset = group ? { name: group } : undefined;
          }
        );
        onClose();
      }}
      onClose={onClose}
    />
  );

  if (Platform.OS === "web") {
    return (
      <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
        {content}
      </SheetScreenContainer>
    );
  }

  return <View className="bg-background-default flex-1">{content}</View>;
}
