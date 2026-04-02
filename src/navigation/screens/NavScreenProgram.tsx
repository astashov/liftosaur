import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import type { IDayData } from "../../types";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenEditProgram as ScreenEditProgramComponent } from "../../components/screenEditProgram";
import { ScreenEditProgramExercise as ScreenEditProgramExerciseComponent } from "../../components/editProgramExercise/screenEditProgramExercise";
import { ScreenMusclesProgram } from "../../components/muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "../../components/muscles/screenMusclesDay";
import { Screen1RM } from "../../components/screen1RM";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Program_getProgram, Program_fullProgram } from "../../models/program";
import { Progress_getProgress } from "../../models/progress";
import { FallbackScreen } from "../../components/fallbackScreen";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";

export function NavScreenPrograms(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
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

export function NavScreenEditProgram(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "editProgram"; params: { programId: string } }>();
  const programId = route.params.programId;
  const plannerState = state.editProgramStates[programId];
  const editProgram = Program_getProgram(
    state,
    plannerState ? plannerState.current.program.id : Progress_getProgress(state)?.programId
  );
  return (
    <NavScreenContent>
      <FallbackScreen state={{ plannerState, editProgram }} dispatch={dispatch}>
        {({ plannerState: plannerState2, editProgram: editProgram2 }) => (
          <ScreenEditProgramComponent
            client={service.client}
            helps={state.storage.helps}
            navCommon={navCommon}
            subscription={state.storage.subscription}
            settings={state.storage.settings}
            dispatch={dispatch}
            originalProgram={editProgram2}
            plannerState={plannerState2}
            revisions={(state.revisions || {})[editProgram2.id] || []}
            isLoggedIn={state.user != null}
          />
        )}
      </FallbackScreen>
    </NavScreenContent>
  );
}

export function NavScreenEditProgramExercise(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "editProgramExercise"; params: { programId: string; key: string; dayData: Required<IDayData> } }>();
  const { programId, key: exerciseKey, dayData } = route.params;
  const exerciseStateKey = `${programId}_${exerciseKey}`;
  const plannerState = state.editProgramExerciseStates[exerciseStateKey];
  const editProgramState = state.editProgramStates[programId];
  return (
    <NavScreenContent>
      <FallbackScreen state={{ plannerState, exerciseKey, dayData }} dispatch={dispatch}>
        {({ plannerState: plannerState2, exerciseKey: exerciseKey2, dayData: dayData2 }) => (
          <ScreenEditProgramExerciseComponent
            plannerState={plannerState2}
            exerciseKey={exerciseKey2}
            exerciseStateKey={exerciseStateKey}
            programId={programId}
            dayData={dayData2}
            dispatch={dispatch}
            settings={state.storage.settings}
            navCommon={navCommon}
            editProgramState={editProgramState}
          />
        )}
      </FallbackScreen>
    </NavScreenContent>
  );
}

export function NavScreenMuscles(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const type = state.muscleView || {
    type: "program" as const,
    programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
  };
  if (type.programId == null) {
    throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
  }
  let program = Program_getProgram(state, type.programId);
  if (program == null) {
    throw new Error("Opened 'muscles' screen, but 'program' is null");
  }
  program = Program_fullProgram(program, state.storage.settings);
  if (type.type === "program") {
    return (
      <NavScreenContent>
        <ScreenMusclesProgram
          navCommon={navCommon}
          dispatch={dispatch}
          program={program}
          settings={state.storage.settings}
        />
      </NavScreenContent>
    );
  }
  return (
    <NavScreenContent>
      <ScreenMusclesDay
        navCommon={navCommon}
        dispatch={dispatch}
        program={program}
        day={type.day ?? 1}
        settings={state.storage.settings}
      />
    </NavScreenContent>
  );
}

export function NavScreenOnerms(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  if (currentProgram == null) {
    throw new Error("Opened 'onerms' screen, but 'currentProgram' is null");
  }
  return (
    <NavScreenContent>
      <Screen1RM navCommon={navCommon} dispatch={dispatch} program={currentProgram} settings={state.storage.settings} />
    </NavScreenContent>
  );
}

export function NavScreenProgramSelect(): JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenProgramSelectComponent dispatch={dispatch} settings={state.storage.settings} />
    </NavScreenContent>
  );
}

export function NavScreenProgramPreview(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <NavScreenContent><></></NavScreenContent>;
  }
  return (
    <NavScreenContent>
      <ScreenProgramPreviewComponent
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        selectedProgramId={state.previewProgram.id}
        programs={state.previewProgram.showCustomPrograms ? state.storage.programs : state.programs}
        subscription={state.storage.subscription}
      />
    </NavScreenContent>
  );
}

