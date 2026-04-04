import { JSX, useMemo } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetCustomExerciseContent } from "../../components/bottomSheetCustomExercise";
import { Exercise_handleCustomExerciseChange, Exercise_createCustomExercise } from "../../models/exercise";
import { Program_getProgram } from "../../models/program";
import type { IRootStackParamList } from "../types";

export function NavModalCustomExercise(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "customExerciseModal";
    params: IRootStackParamList["customExerciseModal"];
  }>();
  const { exerciseId } = route.params;

  const existingExercise = exerciseId ? state.storage.settings.exercises[exerciseId] : undefined;
  const newExercise = useMemo(() => Exercise_createCustomExercise("", [], [], []), []);
  const exercise = existingExercise ?? newExercise;
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose}>
      <BottomSheetCustomExerciseContent
        settings={state.storage.settings}
        isLoggedIn={!!state.user?.id}
        exercise={exercise}
        dispatch={dispatch}
        onChange={(action, ex, notes) => {
          Exercise_handleCustomExerciseChange(dispatch, action, ex, notes, state.storage.settings, currentProgram);
        }}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
