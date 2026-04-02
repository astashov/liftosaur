import { JSX, useRef } from "react";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ProgramHistoryView } from "../../components/programHistory";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Program_getProgram } from "../../models/program";
import { Progress_getProgress } from "../../models/progress";

export function NavScreenMain(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;

  if (currentProgram == null) {
    return (
      <NavScreenContent>
        <ChooseProgramView
          navCommon={navCommon}
          settings={state.storage.settings}
          dispatch={dispatch}
          progress={Progress_getProgress(state)}
          programs={state.programs || []}
          programsIndex={state.programsIndex || []}
          customPrograms={state.storage.programs || []}
          editProgramId={Progress_getProgress(state)?.programId}
        />
      </NavScreenContent>
    );
  }

  return (
    <NavScreenContent scrollRef={scrollRef}>
      <ProgramHistoryView
        scrollContainerRef={scrollRef}
        progress={Progress_getProgress(state)}
        navCommon={navCommon}
        program={currentProgram}
        settings={state.storage.settings}
        history={state.storage.history}
        subscription={state.storage.subscription}
        dispatch={dispatch}
      />
    </NavScreenContent>
  );
}
