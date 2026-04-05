import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { BottomSheetMusclesOverrideContent } from "../../components/bottomSheetMusclesOverride";
import { ISettings } from "../../types";
import { updateSettings } from "../../models/state";
import { lb } from "lens-shmens";
import type { IRootStackParamList } from "../types";

export function NavModalMusclesOverride(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "musclesOverrideModal";
    params: IRootStackParamList["musclesOverrideModal"];
  }>();
  const { exerciseType } = route.params;

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <BottomSheetMusclesOverrideContent
        exerciseType={exerciseType}
        settings={state.storage.settings}
        helps={state.storage.helps}
        onNewExerciseData={(newExerciseData) => {
          updateSettings(
            dispatch,
            lb<ISettings>().p("exerciseData").record(newExerciseData),
            "Update exercise muscle override"
          );
        }}
        onClose={onClose}
        dispatch={dispatch}
      />
    </SheetScreenContainer>
  );
}
