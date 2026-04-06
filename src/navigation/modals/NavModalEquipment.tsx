import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalEquipmentContent } from "../../components/modalEquipment";
import { Progress_lbProgress } from "../../models/progress";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IPlannerState } from "../../pages/planner/models/types";
import type { IRootStackParamList } from "../types";

function NavModalEquipmentWorkout(props: { progressId: number }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { progressId } = props;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const exerciseType = progress?.ui?.equipmentModal?.exerciseType;

  const onClose = (): void => {
    updateState(
      dispatch,
      [Progress_lbProgress(progressId).pi("ui").p("equipmentModal").record(undefined)],
      "Close equipment modal"
    );
    navigation.goBack();
  };

  const shouldGoBack = !progress || !exerciseType;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress || !exerciseType) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <ModalEquipmentContent
        settings={state.storage.settings}
        stats={state.storage.stats}
        exercise={exerciseType}
        entries={progress.entries}
        dispatch={dispatch}
      />
    </ModalScreenContainer>
  );
}

function NavModalEquipmentPreview(props: { programId: string }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { programId } = props;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const previewEquipmentModal = plannerState?.ui?.previewEquipmentModal;
  const exerciseType = previewEquipmentModal?.plannerExercise?.exerciseType;

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(
        lb<IPlannerState>().pi("ui").p("previewEquipmentModal").record(undefined),
        "Close preview equipment modal"
      );
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !exerciseType;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !exerciseType) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <ModalEquipmentContent
        settings={state.storage.settings}
        stats={state.storage.stats}
        exercise={exerciseType}
        entries={[]}
        dispatch={dispatch}
      />
    </ModalScreenContainer>
  );
}

export function NavModalEquipment(): JSX.Element {
  const route = useRoute<{ key: string; name: "equipmentModal"; params: IRootStackParamList["equipmentModal"] }>();
  const params = route.params;

  if (params.context === "preview") {
    return <NavModalEquipmentPreview programId={params.programId} />;
  }
  return <NavModalEquipmentWorkout progressId={params.progressId} />;
}
