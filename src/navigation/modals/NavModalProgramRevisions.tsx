import { JSX, useEffect, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { useAppContext } from "../../components/appContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalPlannerProgramRevisionsContent } from "../../pages/planner/modalPlannerProgramRevisions";
import { IPlannerState } from "../../pages/planner/models/types";
import { IState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { PlannerProgram_evaluateText } from "../../pages/planner/models/plannerProgram";
import type { IRootStackParamList } from "../types";

export function NavModalProgramRevisions(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "programRevisionsModal";
    params: IRootStackParamList["programRevisionsModal"];
  }>();
  const { programId } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const revisions = (state.revisions || {})[programId] || [];

  const plannerDispatch = useMemo(() => {
    if (!plannerState) {
      return undefined;
    }
    return buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState);
  }, [dispatch, programId, plannerState]);

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || revisions.length === 0;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !plannerState || !plannerDispatch) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth noPaddings innerClassName="flex flex-col">
      <ModalPlannerProgramRevisionsContent
        programId={programId}
        client={service.client}
        revisions={revisions}
        onClose={onClose}
        onRestore={(text) => {
          window.isUndoing = true;
          const weeks = PlannerProgram_evaluateText(text);
          plannerDispatch(
            lb<IPlannerState>().p("current").p("program").pi("planner").p("weeks").record(weeks),
            "stop-is-undoing"
          );
          onClose();
        }}
      />
    </ModalScreenContainer>
  );
}
