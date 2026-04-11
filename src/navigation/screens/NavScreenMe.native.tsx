import React from "react";
import { View, Text } from "react-native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenSettings as ScreenSettingsComponent } from "../../components/screenSettings";
import { Program_getProgram } from "../../models/program";

export function NavScreenSettings(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenSettingsComponent
          stats={state.storage.stats}
          tempUserId={state.storage.tempUserId}
          navCommon={navCommon}
          subscription={state.storage.subscription}
          dispatch={dispatch}
          user={state.user}
          currentProgramName={Program_getProgram(state, state.storage.currentProgramId)?.name || ""}
          settings={state.storage.settings}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenAccount(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Account</Text>
    </View>
  );
}

export function NavScreenTimers(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Timers</Text>
    </View>
  );
}

export function NavScreenPlates(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Plates</Text>
    </View>
  );
}

export function NavScreenGyms(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Gyms</Text>
    </View>
  );
}

export function NavScreenExercises(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Exercises</Text>
    </View>
  );
}

export function NavScreenAppleHealth(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Apple Health</Text>
    </View>
  );
}

export function NavScreenGoogleHealth(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Google Health</Text>
    </View>
  );
}

export function NavScreenMuscleGroups(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Muscle Groups</Text>
    </View>
  );
}

export function NavScreenStats(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Stats</Text>
    </View>
  );
}

export function NavScreenMeasurements(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Measurements</Text>
    </View>
  );
}

export function NavScreenExerciseStats(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Exercise Stats</Text>
    </View>
  );
}

export function NavScreenApiKeys(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">API Keys</Text>
    </View>
  );
}
