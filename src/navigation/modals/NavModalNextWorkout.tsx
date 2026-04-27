import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { BottomSheetNextWorkoutContent } from "../../components/bottomSheetNextWorkout";
import { Program_getProgram } from "../../models/program";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { Platform } from "react-native";

export function NavModalNextWorkout(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const onClose = (): void => {
    navigation.goBack();
  };

  const content = (
    <BottomSheetNextWorkoutContent
      currentProgram={currentProgram}
      allPrograms={state.storage.programs}
      settings={state.storage.settings}
      stats={state.storage.stats}
      dispatch={dispatch}
      onClose={onClose}
    />
  );

  return Platform.OS === "web" ? (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      {content}
    </SheetScreenContainer>
  ) : (
    content
  );
}
