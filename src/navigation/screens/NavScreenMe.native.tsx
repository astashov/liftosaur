import React from "react";
import { View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenSettings as ScreenSettingsComponent } from "../../components/screenSettings";
import { ScreenTimers as ScreenTimersComponent } from "../../components/screenTimers";
import { ScreenEquipment } from "../../components/screenEquipment";
import { ScreenGyms as ScreenGymsComponent } from "../../components/screenGyms";
import { ScreenAppleHealthSettings as ScreenAppleHealthSettingsComponent } from "../../components/screenAppleHealthSettings";
import { ScreenGoogleHealthSettings as ScreenGoogleHealthSettingsComponent } from "../../components/screenGoogleHealthSettings";
import { ScreenMuscleGroups as ScreenMuscleGroupsComponent } from "../../components/screenMuscleGroups";
import { ScreenApiKeys as ScreenApiKeysComponent } from "../../components/screenApiKeys";
import { ScreenAccount as ScreenAccountComponent } from "../../components/screenAccount";
import { ScreenMeasurements as ScreenMeasurementsComponent } from "../../components/screenMeasurements";
import { ScreenStats as ScreenStatsComponent } from "../../components/screenStats";
import { ScreenExercises as ScreenExercisesComponent } from "../../components/screenExercises";
import { ScreenExerciseStats as ScreenExerciseStatsComponent } from "../../components/screenExerciseStats";
import { Program_getProgram } from "../../models/program";
import { Exercise_find, Exercise_toKey } from "../../models/exercise";
import { Equipment_getEquipmentOfGym } from "../../models/equipment";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";
import type { IStatsKey } from "../../types";

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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const allEquipment = Equipment_getEquipmentOfGym(state.storage.settings, state.selectedGymId);
  return (
    <View className="flex-1 bg-background-default">
      <ScreenEquipment
        stats={state.storage.stats}
        navCommon={navCommon}
        allEquipment={allEquipment}
        expandedEquipment={state.defaultEquipmentExpanded}
        selectedGymId={state.selectedGymId}
        dispatch={dispatch}
        settings={state.storage.settings}
      />
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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  if (currentProgram == null) {
    throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
  }
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenExercisesComponent
          navCommon={navCommon}
          settings={state.storage.settings}
          dispatch={dispatch}
          program={currentProgram}
          history={state.storage.history}
        />
      </NavScreenContent>
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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenStatsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={state.storage.settings}
          stats={state.storage.stats}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenMeasurements(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "measurements"; params?: { key?: IStatsKey } }>();
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenMeasurementsComponent
          navCommon={navCommon}
          subscription={state.storage.subscription}
          dispatch={dispatch}
          settings={state.storage.settings}
          stats={state.storage.stats}
          initialKey={route.params?.key}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenExerciseStats(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const exercise = state.viewExerciseType
    ? Exercise_find(state.viewExerciseType, state.storage.settings.exercises)
    : undefined;
  if (exercise == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return (
      <View className="flex-1 bg-background-default">
        <NavScreenContent>
          <View />
        </NavScreenContent>
      </View>
    );
  }
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenExerciseStatsComponent
          navCommon={navCommon}
          currentProgram={currentProgram}
          key={Exercise_toKey(exercise)}
          history={state.storage.history}
          dispatch={dispatch}
          exerciseType={exercise}
          settings={state.storage.settings}
          subscription={state.storage.subscription}
        />
      </NavScreenContent>
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
