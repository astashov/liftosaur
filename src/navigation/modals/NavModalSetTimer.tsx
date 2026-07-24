import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { SetTimerBannerContent } from "../../components/setTimerBanner";
import { Program_evaluate, Program_fullProgram, Program_getProgramExercise } from "../../models/program";
import { buildPlaygroundDispatch, getPlaygroundProgress } from "./navModalPlaygroundUtils";
import { useClearOnModalRemove } from "../useClearOnModalRemove";
import type { IRootStackParamList } from "../types";

export function NavModalSetTimer(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "setTimerModal"; params: IRootStackParamList["setTimerModal"] }>();
  const { context } = route.params;
  const isPlayground = context === "playground";

  // Playground edits (exercise vars, units) live on playgroundState.settings, not the global storage copy — use
  // it so the dispatch, program evaluation, and display all run against what the user actually sees.
  const settings = isPlayground ? (state.playgroundState?.settings ?? state.storage.settings) : state.storage.settings;

  let progress: ReturnType<typeof getPlaygroundProgress>;
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
      // Real stats, not empty — a timed set's completion/auto-fire can run update scripts that read
      // stats/bodyweight/history (the in-card playground path passes these through too).
      state.storage.stats
    );
  } else {
    const { progressId } = route.params;
    progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  }

  const setTimerModal = progress?.setTimer;

  const evaluatedProgram = isPlayground
    ? state.playgroundState?.program
      ? Program_evaluate(Program_fullProgram(state.playgroundState.program, settings), settings)
      : undefined
    : undefined;
  const entry = setTimerModal != null ? progress?.entries[setTimerModal.entryIndex] : undefined;
  const programExercise =
    evaluatedProgram && progress
      ? Program_getProgramExercise(progress.day, evaluatedProgram, entry?.programExerciseId)
      : undefined;

  useClearOnModalRemove(() => modalDispatch({ type: "CloseSetTimerAction", isPlayground }));

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !progress || !setTimerModal;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress || !setTimerModal) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} maxWidth="480px" isFullWidth>
      <FormSheet>
        <SetTimerBannerContent
          progress={progress}
          settings={settings}
          setTimerModal={setTimerModal}
          dispatch={modalDispatch}
          onClose={onClose}
          isPlayground={isPlayground}
          programExercise={programExercise}
          otherStates={evaluatedProgram?.states}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
