import { JSX, useEffect, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetEditProgramExerciseSetContent } from "../../components/editProgramExercise/bottomSheetEditProgramExerciseSet";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { Program_evaluate } from "../../models/program";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import type { IRootStackParamList } from "../types";

export function NavModalEditProgramExerciseSet(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgramExerciseSetModal";
    params: IRootStackParamList["editProgramExerciseSetModal"];
  }>();
  const { exerciseStateKey } = route.params;

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

  const onClose = (): void => {
    plannerDispatch?.(
      lb<IPlannerExerciseState>().pi("ui").p("editSetBottomSheet").record(undefined),
      "Close edit set sheet"
    );
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !evaluatedProgram || !plannerDispatch || !plannerState.ui.editSetBottomSheet;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <BottomSheetEditProgramExerciseSetContent
        ui={plannerState!.ui}
        evaluatedProgram={evaluatedProgram!}
        plannerDispatch={plannerDispatch!}
        settings={state.storage.settings}
      />
    </SheetScreenContainer>
  );
}
