import { JSX } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { BottomSheetNextWorkoutContent } from "../../components/bottomSheetNextWorkout";
import { Program_getProgram } from "../../models/program";
import { SheetScreenContainer } from "../SheetScreenContainer";

export function NavModalNextWorkout(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  if (Platform.OS === "web") {
    return (
      <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
        {content}
      </SheetScreenContainer>
    );
  }

  if (Platform.OS === "android") {
    return <View style={{ paddingBottom: insets.bottom }}>{content}</View>;
  }

  return content;
}
