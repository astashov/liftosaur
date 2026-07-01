import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { SetTimerEditContent } from "../../components/setTimerEdit";
import { Progress_getProgress } from "../../models/progress";
import { updateProgress } from "../../models/state";
import { buildPlaygroundDispatch, getPlaygroundProgress } from "./navModalPlaygroundUtils";
import { IHistoryRecord } from "../../types";
import type { IRootStackParamList } from "../types";

export function NavModalSetTimerEdit(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "setTimerEditModal";
    params: IRootStackParamList["setTimerEditModal"];
  }>();
  const { context } = route.params;
  const isPlayground = context === "playground";

  const settings = isPlayground ? (state.playgroundState?.settings ?? state.storage.settings) : state.storage.settings;

  let progress: IHistoryRecord | undefined;
  let modalDispatch = dispatch;
  if (context === "playground") {
    const { weekIndex, dayIndex } = route.params;
    progress = getPlaygroundProgress(state, weekIndex, dayIndex);
    modalDispatch = buildPlaygroundDispatch(
      dispatch,
      weekIndex,
      dayIndex,
      () => getPlaygroundProgress(state, weekIndex, dayIndex),
      settings,
      state.storage.stats
    );
  } else {
    progress = Progress_getProgress(state);
  }

  const editModal = progress?.ui?.setTimerEditModal;
  const set = editModal ? progress?.entries[editModal.entryIndex]?.sets[editModal.setIndex] : undefined;

  const shouldGoBack = editModal == null || set == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  useEffect(() => {
    const onBeforeRemove = (): void => {
      updateProgress(
        modalDispatch,
        [lb<IHistoryRecord>().pi("ui", {}).p("setTimerEditModal").record(undefined)],
        "close-set-timer-edit"
      );
    };
    const unsubscribe = navigation.addListener("beforeRemove", onBeforeRemove);
    return unsubscribe;
  }, [navigation, modalDispatch]);

  if (shouldGoBack || editModal == null || set == null) {
    return <></>;
  }

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <SetTimerEditContent
          set={set}
          entryIndex={editModal.entryIndex}
          setIndex={editModal.setIndex}
          dispatch={modalDispatch}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
