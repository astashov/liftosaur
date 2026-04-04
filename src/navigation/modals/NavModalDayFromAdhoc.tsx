import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalDayFromAdhocContent } from "../../components/modalDayFromAdhoc";
import type { IRootStackParamList } from "../types";

export function NavModalDayFromAdhoc(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "dayFromAdhocModal";
    params: IRootStackParamList["dayFromAdhocModal"];
  }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !progress;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth isFullHeight noPaddings>
      <ModalDayFromAdhocContent
        initialCurrentProgramId={progress.programId}
        stats={state.storage.stats}
        record={progress}
        dispatch={dispatch}
        allPrograms={state.storage.programs}
        settings={state.storage.settings}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
