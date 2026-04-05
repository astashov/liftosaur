import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { PlannerDayStats } from "../../pages/planner/components/plannerDayStats";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import type { IRootStackParamList } from "../types";

export function NavModalDayStats(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "dayStatsModal";
    params: IRootStackParamList["dayStatsModal"];
  }>();
  const { programId } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const dayIndex = plannerState?.ui?.showDayStats;
  const weekIndex = plannerState?.ui?.weekIndex ?? 0;
  const planner = plannerState?.current?.program?.planner;
  const settings = state.storage.settings;
  const { evaluatedWeeks } = planner ? PlannerProgram_evaluate(planner, settings) : { evaluatedWeeks: [] };

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(lb<IPlannerState>().p("ui").p("showDayStats").record(undefined), "Close day stats");
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || dayIndex == null || !evaluatedWeeks[weekIndex]?.[dayIndex];
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
      <PlannerDayStats
        dispatch={plannerDispatch}
        settings={settings}
        evaluatedDay={evaluatedWeeks[weekIndex][dayIndex!]}
      />
    </ModalScreenContainer>
  );
}
