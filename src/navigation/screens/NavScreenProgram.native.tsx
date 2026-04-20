import React from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { IDayData } from "../../types";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenEditProgram as ScreenEditProgramComponent } from "../../components/screenEditProgram";
import { ScreenMusclesProgram } from "../../components/muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "../../components/muscles/screenMusclesDay";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Program_getProgram, Program_fullProgram } from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { FallbackScreen } from "../../components/fallbackScreen";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";
import { usePlaygroundModalBridges } from "../usePlaygroundModalBridges";

export function NavScreenPrograms(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ChooseProgramView
      navCommon={navCommon}
      settings={state.storage.settings}
      dispatch={dispatch}
      progress={Progress_getCurrentProgress(state)}
      programs={state.programs || []}
      programsIndex={state.programsIndex || []}
      customPrograms={state.storage.programs || []}
      editProgramId={Progress_getCurrentProgress(state)?.programId}
    />
  );
}

export function NavScreenEditProgram(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  usePlaygroundModalBridges(state);
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "editProgram"; params: { programId: string } }>();
  const programId = route.params.programId;
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

export function NavScreenEditProgramExercise(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgramExercise";
    params: { programId: string; key: string; dayData: Required<IDayData> };
  }>();
  const { programId, key: exerciseKey } = route.params;
  const exerciseStateKey = `${programId}_${exerciseKey}`;
  const { state } = useAppState();
  const plannerState = state.editProgramExerciseStates[exerciseStateKey];
  const pendingNewKey = plannerState?.ui.pendingNewKey;
  React.useEffect(() => {
    if (pendingNewKey) {
      navigation.setParams({ key: pendingNewKey } as never);
    }
  }, [pendingNewKey]);
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Exercise</Text>
    </View>
  );
}

export function NavScreenMuscles(): React.JSX.Element {
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

export function NavScreenOnerms(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">1 Rep Maxes</Text>
    </View>
  );
}

export function NavScreenProgramSelect(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Select Program</Text>
    </View>
  );
}

export function NavScreenProgramPreview(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);

  usePlaygroundModalBridges(state);

  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <View className="flex-1 bg-background-default" />;
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
