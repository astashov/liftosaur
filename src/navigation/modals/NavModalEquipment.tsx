import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalEquipmentContent } from "../../components/modalEquipment";
import { Progress_lbProgress } from "../../models/progress";
import { updateState } from "../../models/state";
import type { IRootStackParamList } from "../types";

export function NavModalEquipment(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "equipmentModal"; params: IRootStackParamList["equipmentModal"] }>();
  const { progressId } = route.params;

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
