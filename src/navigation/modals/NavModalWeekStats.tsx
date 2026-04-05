import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { PlannerWeekStats } from "../../pages/planner/components/plannerWeekStats";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import { navigationRef } from "../navigationRef";
import type { IRootStackParamList } from "../types";

export function NavModalWeekStats(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "weekStatsModal";
    params: IRootStackParamList["weekStatsModal"];
  }>();
  const { programId } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const weekIndex = plannerState?.ui?.showWeekStats;
  const planner = plannerState?.current?.program?.planner;
  const settings = state.storage.settings;
  const { evaluatedWeeks } = planner ? PlannerProgram_evaluate(planner, settings) : { evaluatedWeeks: [] };

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(lb<IPlannerState>().p("ui").p("showWeekStats").record(undefined), "Close week stats");
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || weekIndex == null || !evaluatedWeeks[weekIndex];
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
      <PlannerWeekStats
        dispatch={plannerDispatch}
        onEditSettings={() => {
          navigationRef.navigate("plannerSettingsModal", { context: "editProgram", programId });
        }}
        evaluatedDays={evaluatedWeeks[weekIndex!]}
        settings={settings}
      />
    </ModalScreenContainer>
  );
}
