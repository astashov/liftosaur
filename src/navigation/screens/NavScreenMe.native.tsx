import React from "react";
import { View, Text } from "react-native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenSettings as ScreenSettingsComponent } from "../../components/screenSettings";
import { ScreenTimers as ScreenTimersComponent } from "../../components/screenTimers";
import { ScreenGyms as ScreenGymsComponent } from "../../components/screenGyms";
import { ScreenAppleHealthSettings as ScreenAppleHealthSettingsComponent } from "../../components/screenAppleHealthSettings";
import { ScreenGoogleHealthSettings as ScreenGoogleHealthSettingsComponent } from "../../components/screenGoogleHealthSettings";
import { ScreenMuscleGroups as ScreenMuscleGroupsComponent } from "../../components/screenMuscleGroups";
import { ScreenApiKeys as ScreenApiKeysComponent } from "../../components/screenApiKeys";
import { ScreenAccount as ScreenAccountComponent } from "../../components/screenAccount";
import { Program_getProgram } from "../../models/program";
import { useAppContext } from "../../components/appContext";

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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenAccountComponent
          navCommon={navCommon}
          dispatch={dispatch}
          email={state.user?.email}
          userId={state.user?.id}
          storage={state.storage}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenTimers(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenTimersComponent navCommon={navCommon} dispatch={dispatch} timers={state.storage.settings.timers} />
      </NavScreenContent>
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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenGymsComponent
          navCommon={navCommon}
          expandedEquipment={state.defaultEquipmentExpanded}
          dispatch={dispatch}
          settings={state.storage.settings}
        />
      </NavScreenContent>
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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenAppleHealthSettingsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={state.storage.settings}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenGoogleHealth(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenGoogleHealthSettingsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={state.storage.settings}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenMuscleGroups(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenMuscleGroupsComponent navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />
      </NavScreenContent>
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
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenApiKeysComponent
          navCommon={navCommon}
          dispatch={dispatch}
          service={service}
          subscription={state.storage.subscription}
          userId={state.user?.id}
        />
      </NavScreenContent>
    </View>
  );
}
