import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalChangeNextDayContent } from "../../components/modalChangeNextDay";
import { Program_selectProgram, Program_getProgram } from "../../models/program";
import { EditProgram_setNextDay } from "../../models/editProgram";

export function NavModalChangeNextDay(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer
      onClose={onClose}
      shouldShowClose={true}
      noPaddings={true}
      isFullWidth={true}
      isFullHeight={true}
    >
      <ModalChangeNextDayContent
        initialCurrentProgramId={currentProgram?.id}
        allPrograms={state.storage.programs}
        settings={state.storage.settings}
        stats={state.storage.stats}
        onSelect={(programId, day) => {
          Program_selectProgram(dispatch, programId);
          EditProgram_setNextDay(dispatch, programId, day);
          onClose();
        }}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
