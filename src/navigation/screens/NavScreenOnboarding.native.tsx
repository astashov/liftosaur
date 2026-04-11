import React from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenFirst as ScreenFirstComponent } from "../../components/screenFirst";
import { ScreenUnitSelector } from "../../components/screenUnitSelector";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";

export function NavScreenFirst(): React.JSX.Element {
  const { dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenFirstComponent dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenUnits(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenUnitSelector settings={state.storage.settings} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenSetupEquipment(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Setup Equipment</Text>
    </View>
  );
}

export function NavScreenSetupPlates(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Setup Plates</Text>
    </View>
  );
}

export function NavScreenProgramSelectOnboarding(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenProgramSelectComponent dispatch={dispatch} settings={state.storage.settings} />
    </NavScreenContent>
  );
}

export function NavScreenProgramsOnboarding(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Programs</Text>
    </View>
  );
}

export function NavScreenProgramPreviewOnboarding(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Program Preview</Text>
    </View>
  );
}
