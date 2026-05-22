import { JSX, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalChangeNextDayContent } from "../../components/modalChangeNextDay";
import { Program_getProgram, Program_selectProgram } from "../../models/program";
import { EditProgram_setNextDay } from "../../models/editProgram";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";

export function NavModalChangeNextDay(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

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

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70} isFullWidth={true}>
      <FormSheet>
        <ModalChangeNextDayContent
          initialCurrentProgramId={currentProgram?.id}
          allPrograms={state.storage.programs}
          settings={state.storage.settings}
          stats={state.storage.stats}
          onSelect={onSelect}
          onClose={onClose}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
