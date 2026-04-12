import React from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Progress_getCurrentProgress } from "../../models/progress";

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
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Program Preview</Text>
    </View>
  );
}
