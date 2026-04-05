import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { PlannerExerciseStats } from "../../pages/planner/components/plannerExerciseStats";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import type { IRootStackParamList } from "../types";

export function NavModalExerciseStats(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "exerciseStatsModal";
    params: IRootStackParamList["exerciseStatsModal"];
  }>();
  const { programId } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const focusedExercise = plannerState?.ui?.focusedExercise;
  const planner = plannerState?.current?.program?.planner;
  const settings = state.storage.settings;
  const { evaluatedWeeks } = planner ? PlannerProgram_evaluate(planner, settings) : { evaluatedWeeks: [] };

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(lb<IPlannerState>().p("ui").p("showExerciseStats").record(undefined), "Close exercise stats");
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !focusedExercise || !plannerState.ui?.showExerciseStats;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <PlannerExerciseStats
        dispatch={plannerDispatch}
        settings={settings}
        evaluatedWeeks={evaluatedWeeks}
        weekIndex={focusedExercise!.weekIndex}
        dayIndex={focusedExercise!.dayIndex}
        exerciseLine={focusedExercise!.exerciseLine}
        hideSwap={true}
      />
    </ModalScreenContainer>
  );
}
