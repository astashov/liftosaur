import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { WeightRoundingInfoContent } from "../../components/weightRoundingInfo";
import { Progress_getProgressById, Progress_lbProgress } from "../../models/progress";
import { updateProgress, updateState } from "../../models/state";
import { buildPlaygroundDispatch, getPlaygroundProgress } from "./navModalPlaygroundUtils";
import { useClearOnModalRemove } from "../useClearOnModalRemove";
import { IHistoryRecord } from "../../types";
import type { IRootStackParamList } from "../types";

export function NavModalRoundingInfo(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "roundingInfoModal";
    params: IRootStackParamList["roundingInfoModal"];
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
    progress = Progress_getProgressById(state, route.params.progressId);
  }

  const roundingModal = progress?.ui?.roundingModal;
  const entry = roundingModal ? progress?.entries[roundingModal.entryIndex] : undefined;
  const set = roundingModal ? entry?.sets[roundingModal.setIndex] : undefined;

  const shouldGoBack = roundingModal == null || entry == null || set == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  useClearOnModalRemove(() => {
    if (context === "playground") {
      updateProgress(
        modalDispatch,
        [lb<IHistoryRecord>().pi("ui", {}).p("roundingModal").record(undefined)],
        "close-rounding-info"
      );
    } else {
      updateState(
        dispatch,
        [Progress_lbProgress(route.params.progressId).pi("ui", {}).p("roundingModal").record(undefined)],
        "close-rounding-info"
      );
    }
  });

  if (shouldGoBack || entry == null || set == null) {
    return <></>;
  }

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <WeightRoundingInfoContent set={set} exerciseType={entry.exercise} settings={settings} />
      </FormSheet>
    </ModalScreenContainer>
  );
}
