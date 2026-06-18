import { JSX, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { IDayData } from "../../types";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { useConfirmScreenLeave } from "../useConfirmScreenLeave";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenEditProgram as ScreenEditProgramComponent } from "../../components/screenEditProgram";
import { ScreenEditProgramExercise as ScreenEditProgramExerciseComponent } from "../../components/editProgramExercise/screenEditProgramExercise";
import { ScreenMusclesProgram } from "../../components/muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "../../components/muscles/screenMusclesDay";
import { Screen1RM } from "../../components/screen1RM";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Program_getProgram, Program_fullProgram, Program_isEmpty } from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { FallbackScreen } from "../../components/fallbackScreen";
import { Thunk_pullScreen, Thunk_pushScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";
import { usePlaygroundModalBridges } from "../usePlaygroundModalBridges";
import { EditProgram_initPlannerProgramExerciseState } from "../../models/editProgram";
import { updateState, type IState } from "../../models/state";
import { lb } from "lens-shmens";

export function NavScreenPrograms(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <ChooseProgramView
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        progress={Progress_getCurrentProgress(state)}
        programs={state.programs || []}
        programsIndex={state.programsIndex || []}
        customPrograms={state.storage.programs || []}
        editProgramId={Progress_getCurrentProgress(state)?.programId}
        hasBottomNav={true}
      />
    </View>
  );
}

export function NavScreenEditProgram(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  usePlaygroundModalBridges(state);
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "editProgram"; params: { programId: string } }>();
  const programId = route.params.programId;
  useConfirmScreenLeave(state, dispatch, { name: "editProgram", params: { programId } });
  const plannerState = state.editProgramStates[programId];
  const editProgram = Program_getProgram(
    state,
    plannerState ? plannerState.current.program.id : Progress_getCurrentProgress(state)?.programId
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
  const navigation = useNavigation();
  const navCommon = buildNavCommon(state);
  const route = useRoute<{
    key: string;
    name: "editProgramExercise";
    params: { programId: string; key: string; dayData: Required<IDayData>; fromWorkout?: boolean };
  }>();
  const { programId, key: exerciseKey, dayData, fromWorkout } = route.params;
  useConfirmScreenLeave(state, dispatch, {
    name: "editProgramExercise",
    params: { programId, key: exerciseKey, dayData, fromWorkout },
  });
  const exerciseStateKey = `${programId}_${exerciseKey}`;
  const plannerState = state.editProgramExerciseStates[exerciseStateKey];
  const editProgramState = state.editProgramStates[programId];
  const [didInit, setDidInit] = useState(false);
  const hasInitedRef = useRef(false);

  // Init runs once per genuine mount. RN-screens freeze (freezeOnBlur) tears down
  // and re-runs layout effects when this screen is fully obscured by stacked
  // modals; the ref guard prevents unfreeze from re-initializing, which would
  // rebuild from the saved program and discard in-progress edits. The edit state
  // is cleared on real route removal via screenRemovalCleanup, not on unmount.
  useLayoutEffect(() => {
    if (hasInitedRef.current) {
      return;
    }
    const isFromWorkout = fromWorkout ?? editProgramState == null;
    const program = isFromWorkout
      ? Program_getProgram(state, programId)
      : (editProgramState?.current.program ?? Program_getProgram(state, programId));
    if (!program || Program_isEmpty(program)) {
      dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
      return;
    }
    hasInitedRef.current = true;
    const newPlannerState = EditProgram_initPlannerProgramExerciseState(
      program,
      state.storage.settings,
      exerciseKey,
      dayData,
      isFromWorkout
    );
    updateState(
      dispatch,
      [lb<IState>().p("editProgramExerciseStates").p(exerciseStateKey).record(newPlannerState)],
      "Init edit exercise state"
    );
    setDidInit(true);
  }, []);

  const pendingNewKey = plannerState?.ui.pendingNewKey;
  useEffect(() => {
    if (pendingNewKey) {
      navigation.setParams({ key: pendingNewKey } as never);
    }
  }, [pendingNewKey]);

  // An exercise type swap (picker onNewKey) creates a new keyed entry and
  // migrates to it via pendingNewKey/setParams; drop the now-orphaned previous
  // entry so only the current key remains for route-removal cleanup to clear.
  // Guarded on the new entry actually existing: undo/redo (reducer.ts) also
  // setParams the key but keeps the edit state under the previous key with no
  // new entry — deleting it there would lose the edit session.
  const prevStateKeyRef = useRef(exerciseStateKey);
  useEffect(() => {
    const prevKey = prevStateKeyRef.current;
    if (prevKey === exerciseStateKey) {
      return;
    }
    prevStateKeyRef.current = exerciseStateKey;
    if (state.editProgramExerciseStates[exerciseStateKey] == null) {
      return;
    }
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("editProgramExerciseStates")
          .recordModify((states) => {
            if (states[prevKey] == null) {
              return states;
            }
            const next = { ...states };
            delete next[prevKey];
            return next;
          }),
      ],
      "Clear migrated exercise state"
    );
  }, [exerciseStateKey]);

  if (!didInit || plannerState == null) {
    return (
      <NavScreenContent>
        <View />
      </NavScreenContent>
    );
  }

  return (
    <NavScreenContent>
      <ScreenEditProgramExerciseComponent
        plannerState={plannerState}
        exerciseKey={exerciseKey}
        exerciseStateKey={exerciseStateKey}
        programId={programId}
        dayData={dayData}
        dispatch={dispatch}
        settings={state.storage.settings}
        navCommon={navCommon}
        editProgramState={editProgramState}
      />
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
    <Screen1RM navCommon={navCommon} dispatch={dispatch} program={currentProgram} settings={state.storage.settings} />
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

  usePlaygroundModalBridges(state);

  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return (
      <NavScreenContent>
        <></>
      </NavScreenContent>
    );
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
