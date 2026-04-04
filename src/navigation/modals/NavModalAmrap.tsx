import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalAmrapContent } from "../../components/modalAmrap";
import { Progress_isCurrent, Progress_forceUpdateEntryIndex } from "../../models/progress";
import {
  Program_getFullProgram,
  Program_evaluate,
  Program_getProgramExercise,
  Program_getFirstProgramExercise,
  Program_fullProgram,
} from "../../models/program";
import { buildPlaygroundDispatch, getPlaygroundProgress } from "./navModalPlaygroundUtils";
import type { IRootStackParamList } from "../types";

export function NavModalAmrap(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "amrapModal"; params: IRootStackParamList["amrapModal"] }>();
  const { context, ...rest } = route.params;
  const amrapModal = rest;
  const isPlayground = context === "playground";

  let progress: ReturnType<typeof getPlaygroundProgress>;
  let modalDispatch = dispatch;

  if (context === "workout") {
    const { progressId } = route.params as IRootStackParamList["amrapModal"] & { context: "workout" };
    progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  } else {
    const { weekIndex, dayIndex } = route.params as IRootStackParamList["amrapModal"] & { context: "playground" };
    progress = getPlaygroundProgress(state, weekIndex, dayIndex);
    modalDispatch = buildPlaygroundDispatch(
      dispatch,
      weekIndex,
      dayIndex,
      () => getPlaygroundProgress(state, weekIndex, dayIndex),
      state.storage.settings,
      { weight: {}, length: {}, percentage: {} }
    );
  }

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getFullProgram(state, state.storage.currentProgramId) : undefined;

  let program: ReturnType<typeof Program_fullProgram> | undefined;
  let evaluatedProgram: ReturnType<typeof Program_evaluate> | undefined;

  if (isPlayground) {
    const playgroundProgram = state.playgroundState?.program;
    if (playgroundProgram) {
      program = Program_fullProgram(playgroundProgram, state.storage.settings);
      evaluatedProgram = Program_evaluate(program, state.storage.settings);
    }
  } else {
    program =
      progress && Progress_isCurrent(progress)
        ? Program_getFullProgram(state, progress.programId) ||
          (currentProgram ? Program_fullProgram(currentProgram, state.storage.settings) : undefined)
        : undefined;
    evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;
  }

  const entry = progress?.entries[amrapModal.entryIndex];
  const programExercise = evaluatedProgram
    ? Program_getProgramExercise(progress!.day, evaluatedProgram, entry?.programExerciseId) ||
      Program_getFirstProgramExercise(evaluatedProgram, entry?.programExerciseId)
    : undefined;

  const onClose = (): void => {
    modalDispatch({
      type: "ChangeAMRAPAction",
      amrapValue: undefined,
      amrapLeftValue: undefined,
      rpeValue: undefined,
      weightValue: undefined,
      setIndex: amrapModal.setIndex,
      entryIndex: amrapModal.entryIndex,
      programExercise,
      isPlayground,
      otherStates: evaluatedProgram?.states,
      isAmrap: !!amrapModal.isAmrap,
      logRpe: !!amrapModal.logRpe,
      askWeight: !!amrapModal.askWeight,
      userVars: {},
    });
    if (!isPlayground) {
      Progress_forceUpdateEntryIndex(dispatch);
    }
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
    <ModalScreenContainer onClose={onClose} maxWidth="480px" isFullWidth>
      <ModalAmrapContent
        progress={progress}
        dispatch={modalDispatch}
        isPlayground={isPlayground}
        settings={state.storage.settings}
        amrapModal={amrapModal}
        programExercise={programExercise}
        otherStates={evaluatedProgram?.states}
        onDone={() => {
          if (!isPlayground) {
            Progress_forceUpdateEntryIndex(dispatch);
          }
          navigation.goBack();
        }}
      />
    </ModalScreenContainer>
  );
}
