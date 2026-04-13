import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { BottomSheetNextWorkoutContent } from "../../components/bottomSheetNextWorkout";
import { Program_getProgram } from "../../models/program";

export function NavModalNextWorkout(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} noPaddings={true}>
      <BottomSheetNextWorkoutContent
        currentProgram={currentProgram}
        allPrograms={state.storage.programs}
        settings={state.storage.settings}
        stats={state.storage.stats}
        dispatch={dispatch}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
