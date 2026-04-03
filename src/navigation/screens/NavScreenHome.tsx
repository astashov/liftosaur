import { JSX, useRef } from "react";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ProgramHistoryView } from "../../components/programHistory";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Program_getProgram } from "../../models/program";

export function NavScreenMain(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const scrollRef = useRef<HTMLDivElement>(null);
  const route = useRoute<{ key: string; name: "main"; params?: { historyRecordId?: number } }>();
  const ongoingProgress = state.storage.progress?.[0];
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  if (currentProgram == null) {
    return (
      <NavScreenContent>
        <ChooseProgramView
          navCommon={navCommon}
          settings={state.storage.settings}
          dispatch={dispatch}
          progress={ongoingProgress}
          programs={state.programs || []}
          programsIndex={state.programsIndex || []}
          customPrograms={state.storage.programs || []}
          editProgramId={ongoingProgress?.programId}
        />
      </NavScreenContent>
    );
  }

  return (
    <NavScreenContent scrollRef={scrollRef}>
      <ProgramHistoryView
        scrollContainerRef={scrollRef}
        progress={ongoingProgress}
        navCommon={navCommon}
        program={currentProgram}
        settings={state.storage.settings}
        history={state.storage.history}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        initialHistoryRecordId={route.params?.historyRecordId}
      />
    </NavScreenContent>
  );
}
