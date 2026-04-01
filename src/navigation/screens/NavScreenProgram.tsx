import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenEditProgram as ScreenEditProgramComponent } from "../../components/screenEditProgram";
import { ScreenEditProgramExercise as ScreenEditProgramExerciseComponent } from "../../components/editProgramExercise/screenEditProgramExercise";
import { ScreenMusclesProgram } from "../../components/muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "../../components/muscles/screenMusclesDay";
import { Screen1RM } from "../../components/screen1RM";
import {
  ScreenSetupEquipment as ScreenSetupEquipmentComponent,
  ScreenSetupPlates as ScreenSetupPlatesComponent,
} from "../../components/screenSetupEquipment";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { ScreenUnitSelector } from "../../components/screenUnitSelector";
import { ScreenFirst as ScreenFirstComponent } from "../../components/screenFirst";
import { Program_getProgram, Program_fullProgram } from "../../models/program";
import { Progress_getProgress } from "../../models/progress";
import { FallbackScreen } from "../../components/fallbackScreen";
import { Account_getFromStorage } from "../../models/account";
import { Thunk_pullScreen } from "../../ducks/thunks";
import type { IProgramStackParamList } from "../types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppContext } from "../../components/appContext";

export function NavScreenPrograms(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
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
  );
}

export function NavScreenEditProgram(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navCommon = buildNavCommon(state);
  const route = useRoute<NativeStackScreenProps<IProgramStackParamList, "editProgram">["route"]>();
  const plannerState = route.params?.plannerState;
  const editProgram = Program_getProgram(
    state,
    plannerState ? plannerState.current.program.id : Progress_getProgress(state)?.programId
  );
  return (
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
  );
}

export function NavScreenEditProgramExercise(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const route = useRoute<NativeStackScreenProps<IProgramStackParamList, "editProgramExercise">["route"]>();
  const exerciseKey = route.params?.key;
  const dayData = route.params?.dayData;
  const plannerState = route.params?.plannerState;
  return (
    <FallbackScreen state={{ plannerState, exerciseKey, dayData }} dispatch={dispatch}>
      {({ plannerState: plannerState2, exerciseKey: exerciseKey2, dayData: dayData2 }) => (
        <ScreenEditProgramExerciseComponent
          plannerState={plannerState2}
          exerciseKey={exerciseKey2}
          dayData={dayData2}
          dispatch={dispatch}
          settings={state.storage.settings}
          navCommon={navCommon}
        />
      )}
    </FallbackScreen>
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
      <ScreenMusclesProgram
        navCommon={navCommon}
        dispatch={dispatch}
        program={program}
        settings={state.storage.settings}
      />
    );
  }
  return (
    <ScreenMusclesDay
      navCommon={navCommon}
      dispatch={dispatch}
      program={program}
      day={type.day ?? 1}
      settings={state.storage.settings}
    />
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
    <Screen1RM navCommon={navCommon} dispatch={dispatch} program={currentProgram} settings={state.storage.settings} />
  );
}

export function NavScreenSetupEquipment(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenSetupEquipmentComponent
      stats={state.storage.stats}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
  );
}

export function NavScreenSetupPlates(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenSetupPlatesComponent
      stats={state.storage.stats}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
  );
}

export function NavScreenProgramSelect(): JSX.Element {
  const { state, dispatch } = useAppState();
  return <ScreenProgramSelectComponent dispatch={dispatch} settings={state.storage.settings} />;
}

export function NavScreenProgramPreview(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <></>;
  }
  return (
    <ScreenProgramPreviewComponent
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
      selectedProgramId={state.previewProgram.id}
      programs={state.previewProgram.showCustomPrograms ? state.storage.programs : state.programs}
      subscription={state.storage.subscription}
    />
  );
}

export function NavScreenUnits(): JSX.Element {
  const { state, dispatch } = useAppState();
  return <ScreenUnitSelector settings={state.storage.settings} dispatch={dispatch} />;
}

export function NavScreenFirst(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const userId = state.user?.id;
  const userEmail = state.user?.email;
  const account = userId && userEmail ? Account_getFromStorage(userId, userEmail, state.storage) : undefined;
  return <ScreenFirstComponent account={account} client={service.client} dispatch={dispatch} />;
}
