import React from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Thunk_pullScreen } from "../../ducks/thunks";
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
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Program</Text>
    </View>
  );
}

export function NavScreenEditProgramExercise(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Exercise</Text>
    </View>
  );
}

export function NavScreenMuscles(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Muscles</Text>
    </View>
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
