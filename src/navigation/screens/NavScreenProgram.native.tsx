import React from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { IDayData } from "../../types";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { useConfirmScreenLeave } from "../useConfirmScreenLeave";
import { ChooseProgramView } from "../../components/chooseProgram";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import { usePerfRenderTrace } from "../../utils/usePerfRenderTrace";
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
import { EditProgram_initPlannerProgramExerciseState } from "../../models/editProgram";
import { updateState, type IState } from "../../models/state";
import { lb } from "lens-shmens";
import { useAppContext } from "../../components/appContext";
import { usePlaygroundModalBridges } from "../usePlaygroundModalBridges";
import { useEqual } from "../../utils/useEqual";

const EMPTY_REVISIONS: string[] = [];

export function NavScreenPrograms(): React.JSX.Element {
  useScreenPerf("programs");
  usePerfRenderCount("NavScreenPrograms");
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const progress = untrack(Progress_getCurrentProgress(state));
  return (
    <ChooseProgramView
      navCommon={navCommon}
      settings={untrack(state.storage.settings)}
      dispatch={dispatch}
      progress={progress}
      programs={untrack(state.programs || [])}
      programsIndex={untrack(state.programsIndex || [])}
      customPrograms={untrack(state.storage.programs || [])}
      editProgramId={progress?.programId}
      hasBottomNav={true}
    />
  );
}

export function NavScreenEditProgram(): React.JSX.Element {
  useScreenPerf("editProgram");
  usePerfRenderCount("NavScreenEditProgram");
  usePerfRenderTrace("NavScreenEditProgram");
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const { service } = useAppContext();
  // Pass tracked state so playgroundState reads register subscriptions and the modal opens.
  usePlaygroundModalBridges(state);
  const navCommon = useEqual(untrack(buildNavCommon(state)));
  const route = useRoute<{ key: string; name: "editProgram"; params: { programId: string } }>();
  const programId = route.params.programId;
  useConfirmScreenLeave(state, dispatch, { name: "editProgram", params: { programId } });
  const plannerState = untrack(state.editProgramStates[programId]);
  const editProgram = untrack(
    Program_getProgram(
      state,
      plannerState ? plannerState.current.program.id : Progress_getCurrentProgress(state)?.programId
    )
  );
  const helps = untrack(state.storage.helps);
  const subscription = untrack(state.storage.subscription);
  const settings = untrack(state.storage.settings);
  const isLoggedIn = state.user != null;
  return (
    <FallbackScreen state={{ plannerState, editProgram }} dispatch={dispatch}>
      {({ plannerState: plannerState2, editProgram: editProgram2 }) => (
        <ScreenEditProgramComponent
          client={service.client}
          helps={helps}
          navCommon={navCommon}
          subscription={subscription}
          settings={settings}
          dispatch={dispatch}
          originalProgram={editProgram2}
          plannerState={plannerState2}
          revisions={untrack(state.revisions?.[editProgram2.id]) ?? EMPTY_REVISIONS}
          isLoggedIn={isLoggedIn}
        />
      )}
    </FallbackScreen>
  );
}

export function NavScreenEditProgramExercise(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const navCommon = untrack(buildNavCommon(state));
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
  const plannerState = untrack(state.editProgramExerciseStates[exerciseStateKey]);
  const editProgramState = untrack(state.editProgramStates[programId]);
  const [didInit, setDidInit] = React.useState(false);
  const ownedKeysRef = React.useRef<Set<string>>(new Set());
  ownedKeysRef.current.add(exerciseStateKey);

  React.useLayoutEffect(() => {
    const isFromWorkout = fromWorkout ?? editProgramState == null;
    const program = isFromWorkout
      ? untrack(Program_getProgram(state, programId))
      : (editProgramState?.current.program ?? untrack(Program_getProgram(state, programId)));
    if (!program || Program_isEmpty(program)) {
      dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
      return;
    }
    const newPlannerState = EditProgram_initPlannerProgramExerciseState(
      program,
      untrack(state.storage.settings),
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
    return () => {
      const keysToClear = Array.from(ownedKeysRef.current);
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("editProgramExerciseStates")
            .recordModify((states) => {
              const next = { ...states };
              for (const k of keysToClear) {
                delete next[k];
              }
              return next;
            }),
        ],
        "Clear edit exercise state"
      );
    };
  }, []);

  const pendingNewKey = plannerState?.ui.pendingNewKey;
  React.useEffect(() => {
    if (pendingNewKey) {
      navigation.setParams({ key: pendingNewKey } as never);
    }
  }, [pendingNewKey]);

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
        settings={untrack(state.storage.settings)}
        navCommon={navCommon}
        editProgramState={editProgramState}
      />
    </NavScreenContent>
  );
}

export function NavScreenMuscles(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const type = state.muscleView || {
    type: "program" as const,
    programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
  };
  if (type.programId == null) {
    throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
  }
  const settings = untrack(state.storage.settings);
  let program = untrack(Program_getProgram(state, type.programId));
  if (program == null) {
    throw new Error("Opened 'muscles' screen, but 'program' is null");
  }
  program = Program_fullProgram(program, settings);
  if (type.type === "program") {
    return (
      <NavScreenContent>
        <ScreenMusclesProgram navCommon={navCommon} dispatch={dispatch} program={program} settings={settings} />
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
        settings={settings}
      />
    </NavScreenContent>
  );
}

export function NavScreenOnerms(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  if (currentProgram == null) {
    throw new Error("Opened 'onerms' screen, but 'currentProgram' is null");
  }
  return (
    <Screen1RM
      navCommon={navCommon}
      dispatch={dispatch}
      program={currentProgram}
      settings={untrack(state.storage.settings)}
    />
  );
}

export function NavScreenProgramSelect(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  return (
    <NavScreenContent>
      <ScreenProgramSelectComponent dispatch={dispatch} settings={untrack(state.storage.settings)} />
    </NavScreenContent>
  );
}

export function NavScreenProgramPreview(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));

  // Pass tracked state so playgroundState reads register subscriptions and the modal opens.
  usePlaygroundModalBridges(state);

  const previewProgram = state.previewProgram;
  const shouldGoBack = previewProgram?.id == null;
  React.useEffect(() => {
    if (!shouldGoBack) {
      return;
    }
    const t = setTimeout(() => dispatch(Thunk_pullScreen()), 150);
    return () => clearTimeout(t);
  }, [shouldGoBack, dispatch]);

  if (shouldGoBack || !previewProgram) {
    return <View className="flex-1 bg-background-default" />;
  }
  return (
    <ScreenProgramPreviewComponent
      navCommon={navCommon}
      dispatch={dispatch}
      settings={untrack(state.storage.settings)}
      selectedProgramId={previewProgram.id}
      programs={untrack(previewProgram.showCustomPrograms ? state.storage.programs : state.programs)}
      subscription={untrack(state.storage.subscription)}
    />
  );
}
