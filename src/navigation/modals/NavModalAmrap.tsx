import { JSX } from "react";
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
import type { IRootStackParamList } from "../types";

export function NavModalAmrap(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "amrapModal"; params: IRootStackParamList["amrapModal"] }>();
  const { progressId, ...amrapModal } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getFullProgram(state, state.storage.currentProgramId) : undefined;
  const program =
    progress && Progress_isCurrent(progress)
      ? Program_getFullProgram(state, progress.programId) ||
        (currentProgram ? Program_fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined;
  const evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;
  const entry = progress?.entries[amrapModal.entryIndex];
  const programExercise = evaluatedProgram
    ? Program_getProgramExercise(progress!.day, evaluatedProgram, entry?.programExerciseId) ||
      Program_getFirstProgramExercise(evaluatedProgram, entry?.programExerciseId)
    : undefined;

  const onClose = (): void => {
    dispatch({
      type: "ChangeAMRAPAction",
      amrapValue: undefined,
      amrapLeftValue: undefined,
      rpeValue: undefined,
      weightValue: undefined,
      setIndex: amrapModal.setIndex,
      entryIndex: amrapModal.entryIndex,
      programExercise,
      isPlayground: false,
      otherStates: evaluatedProgram?.states,
      isAmrap: !!amrapModal.isAmrap,
      logRpe: !!amrapModal.logRpe,
      askWeight: !!amrapModal.askWeight,
      userVars: {},
    });
    Progress_forceUpdateEntryIndex(dispatch);
    navigation.goBack();
  };

  if (!progress) {
    navigation.goBack();
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} maxWidth="480px" isFullWidth>
      <ModalAmrapContent
        progress={progress}
        dispatch={dispatch}
        isPlayground={false}
        settings={state.storage.settings}
        amrapModal={amrapModal}
        programExercise={programExercise}
        otherStates={evaluatedProgram?.states}
        onDone={() => {
          Progress_forceUpdateEntryIndex(dispatch);
          navigation.goBack();
        }}
      />
    </ModalScreenContainer>
  );
}
