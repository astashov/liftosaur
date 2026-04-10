import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalPlannerSettingsContent } from "../../pages/planner/components/modalPlannerSettings";
import { IState, updateState } from "../../models/state";
import { lb, ILensRecordingPayload } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { navigationRef } from "../navigationRef";
import type { IRootStackParamList } from "../types";
import { ISettings } from "../../types";

export function NavModalPlannerSettings(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "plannerSettingsModal";
    params: IRootStackParamList["plannerSettingsModal"];
  }>();
  const params = route.params;
  const settings = state.storage.settings;

  const settingsDispatch = useCallback(
    (recording: ILensRecordingPayload<ISettings> | ILensRecordingPayload<ISettings>[], desc: string): void => {
      const recordings = Array.isArray(recording) ? recording : [recording];
      const stateRecordings = recordings.map((r) => r.prepend(lb<IState>().p("storage").p("settings").get()));
      updateState(dispatch, stateRecordings, desc);
    },
    [dispatch]
  );

  const onClose = (): void => {
    if (params.context === "editProgram") {
      const plannerState = state.editProgramStates?.[params.programId];
      if (plannerState) {
        const plannerDispatch = buildPlannerDispatch(
          dispatch,
          lb<IState>().p("editProgramStates").p(params.programId),
          plannerState
        );
        plannerDispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(false), "Close settings modal");
      }
    }
    navigation.goBack();
  };

  const shouldGoBack = params.context === "editProgram" && !state.editProgramStates?.[params.programId];
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <ModalPlannerSettingsContent
        inApp={true}
        settings={settings}
        dispatch={settingsDispatch}
        onShowEditMuscleGroups={() => {
          navigationRef.navigate("editMuscleGroupsModal", params);
        }}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
