import { JSX, useCallback } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalChangeNextDayContent } from "../../components/modalChangeNextDay";
import { Program_getProgram, Program_selectProgram } from "../../models/program";
import { EditProgram_setNextDay } from "../../models/editProgram";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export function NavModalChangeNextDay(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const onClose = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const onSelect = useCallback(
    (programId: string, day: number): void => {
      Program_selectProgram(dispatch, programId);
      EditProgram_setNextDay(dispatch, programId, day);
    },
    [dispatch]
  );

  const content = (
    <ModalChangeNextDayContent
      initialCurrentProgramId={currentProgram?.id}
      allPrograms={state.storage.programs}
      settings={state.storage.settings}
      stats={state.storage.stats}
      onSelect={onSelect}
      onClose={onClose}
    />
  );

  if (Platform.OS === "web") {
    return (
      <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70} isFullWidth={true}>
        {content}
      </ModalScreenContainer>
    );
  }

  return (
    <View
      className="flex-1 pt-4"
      style={{ paddingBottom: insets.bottom, backgroundColor: Tailwind_semantic().background.default }}
    >
      {content}
    </View>
  );
}
