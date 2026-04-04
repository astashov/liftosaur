import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalDateContent } from "../../components/modalDate";
import type { IRootStackParamList } from "../types";

export function NavModalDate(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "dateModal"; params: IRootStackParamList["dateModal"] }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const dateModal = progress?.ui?.dateModal;

  const onClose = (): void => {
    dispatch({ type: "ConfirmDate", date: undefined, time: undefined });
    navigation.goBack();
  };

  const shouldGoBack = !progress || !dateModal;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !dateModal) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose}>
      <ModalDateContent
        dispatch={dispatch}
        date={dateModal.date ?? ""}
        time={dateModal.time ?? 0}
        onDone={() => navigation.goBack()}
      />
    </ModalScreenContainer>
  );
}
