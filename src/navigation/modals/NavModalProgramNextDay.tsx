import { JSX } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalProgramNextDayContent } from "../../components/modalProgramNextDay";
import { Program_getProgram } from "../../models/program";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import type { IRootStackParamList } from "../types";

export function NavModalProgramNextDay(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "programNextDayModal";
    params: IRootStackParamList["programNextDayModal"];
  }>();
  const { programId } = route.params;

  const program = Program_getProgram(state, programId);
  const plannerState = state.editProgramStates?.[programId];

  const onClose = (): void => {
    navigation.goBack();
  };

  if (!program) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth noPaddings>
      <ModalProgramNextDayContent
        stats={state.storage.stats}
        initialCurrentProgramId={program.id}
        allPrograms={[program]}
        settings={state.storage.settings}
        onSelect={(_, day) => {
          updateState(
            dispatch,
            [lb<IState>().p("storage").p("programs").findBy("id", program.id).p("nextDay").record(day)],
            `Select program day ${program.name} - ${day}`
          );
          if (plannerState) {
            const plannerDispatch = buildPlannerDispatch(
              dispatch,
              lb<IState>().p("editProgramStates").p(programId),
              plannerState
            );
            plannerDispatch(
              [lb<IPlannerState>().p("current").p("program").p("nextDay").record(day)],
              `Select program day ${program.name} - ${day}`
            );
          }
        }}
        onClose={onClose}
      />
    </ModalScreenContainer>
  );
}
