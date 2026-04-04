import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
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
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <BottomSheetNextWorkoutContent
        currentProgram={currentProgram}
        allPrograms={state.storage.programs}
        settings={state.storage.settings}
        stats={state.storage.stats}
        dispatch={dispatch}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
