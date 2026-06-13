import React, { useMemo } from "react";
import { View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
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
import { ScreenRecentImports as ScreenRecentImportsComponent } from "../../components/screenRecentImports";
import { ScreenImportPreview as ScreenImportPreviewComponent } from "../../components/screenImportPreview";
import { Program_getProgram } from "../../models/program";
import { Exercise_find, Exercise_toKey } from "../../models/exercise";
import { Equipment_getEquipmentOfGym } from "../../models/equipment";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";
import type { IStatsKey } from "../../types";

export function NavScreenSettings(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const subscription = untrack(state.storage.subscription);
  const settings = untrack(state.storage.settings);
  const stats = untrack(state.storage.stats);
  const loading = untrack(state.loading);
  const user = untrack(state.user);
  const tempUserId = state.storage.tempUserId;
  const currentProgramId = state.storage.currentProgramId;
  const currentProgram = untrack(currentProgramId != null ? Program_getProgram(state, currentProgramId) : undefined);
  const isOngoingProgress = (state.storage.progress?.length ?? 0) > 0;
  const navCommon = useMemo(
    () => ({
      loading,
      currentProgram,
      settings,
      isOngoingProgress,
      stats,
      userId: user?.id,
    }),
    [loading, currentProgram, settings, isOngoingProgress, stats, user]
  );
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenSettingsComponent
          stats={stats}
          tempUserId={tempUserId}
          navCommon={navCommon}
          subscription={subscription}
          dispatch={dispatch}
          user={user}
          currentProgramName={currentProgram?.name || ""}
          settings={settings}
          importSessions={untrack(state.storage.importSessions)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenAccount(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenAccountComponent
          navCommon={navCommon}
          dispatch={dispatch}
          email={state.user?.email}
          userId={state.user?.id}
          storage={untrack(state.storage)}
          subscriptionStatus={state.subscriptionStatus}
          subscriptionStatusLoading={state.subscriptionStatusLoading}
          ownedLifetime={state.ownedLifetime}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenTimers(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenTimersComponent
          navCommon={navCommon}
          dispatch={dispatch}
          timers={untrack(state.storage.settings.timers)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenPlates(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const allEquipment = untrack(Equipment_getEquipmentOfGym(state.storage.settings, state.selectedGymId));
  return (
    <View className="flex-1 bg-background-default">
      <ScreenEquipment
        stats={untrack(state.storage.stats)}
        navCommon={navCommon}
        allEquipment={allEquipment}
        expandedEquipment={untrack(state.defaultEquipmentExpanded)}
        selectedGymId={state.selectedGymId}
        dispatch={dispatch}
        settings={untrack(state.storage.settings)}
      />
    </View>
  );
}

export function NavScreenGyms(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenGymsComponent
          navCommon={navCommon}
          expandedEquipment={untrack(state.defaultEquipmentExpanded)}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenExercises(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  if (currentProgram == null) {
    throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
  }
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenExercisesComponent
          navCommon={navCommon}
          settings={untrack(state.storage.settings)}
          dispatch={dispatch}
          program={currentProgram}
          history={untrack(state.storage.history)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenAppleHealth(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenAppleHealthSettingsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenGoogleHealth(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenGoogleHealthSettingsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenMuscleGroups(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenMuscleGroupsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenStats(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenStatsComponent
          navCommon={navCommon}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
          stats={untrack(state.storage.stats)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenMeasurements(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const route = useRoute<{ key: string; name: "measurements"; params?: { key?: IStatsKey } }>();
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenMeasurementsComponent
          navCommon={navCommon}
          subscription={untrack(state.storage.subscription)}
          dispatch={dispatch}
          settings={untrack(state.storage.settings)}
          stats={untrack(state.storage.stats)}
          initialKey={route.params?.key}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenExerciseStats(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  const exercise = untrack(
    state.viewExerciseType ? Exercise_find(state.viewExerciseType, state.storage.settings.exercises) : undefined
  );
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
          history={untrack(state.storage.history)}
          dispatch={dispatch}
          exerciseType={exercise}
          settings={untrack(state.storage.settings)}
          subscription={untrack(state.storage.subscription)}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenApiKeys(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const { service } = useAppContext();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenApiKeysComponent
          navCommon={navCommon}
          dispatch={dispatch}
          service={service}
          subscription={untrack(state.storage.subscription)}
          userId={state.user?.id}
        />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenRecentImports(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  return (
    <View className="flex-1 bg-background-default">
      <NavScreenContent>
        <ScreenRecentImportsComponent dispatch={dispatch} importSessions={untrack(state.storage.importSessions)} />
      </NavScreenContent>
    </View>
  );
}

export function NavScreenImportPreview(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const preview = untrack(state.importPreview);
  if (preview == null) {
    return <View className="flex-1 bg-background-default" />;
  }
  return (
    <View className="flex-1 bg-background-default">
      <ScreenImportPreviewComponent
        dispatch={dispatch}
        preview={preview}
        history={untrack(state.storage.history)}
        settings={untrack(state.storage.settings)}
      />
    </View>
  );
}
