import { JSX } from "react";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ScreenSettings as ScreenSettingsComponent } from "../../components/screenSettings";
import { ScreenAccount as ScreenAccountComponent } from "../../components/screenAccount";
import { ScreenApiKeys as ScreenApiKeysComponent } from "../../components/screenApiKeys";
import { ScreenTimers as ScreenTimersComponent } from "../../components/screenTimers";
import { ScreenEquipment } from "../../components/screenEquipment";
import { ScreenGyms as ScreenGymsComponent } from "../../components/screenGyms";
import { ScreenExercises as ScreenExercisesComponent } from "../../components/screenExercises";
import { ScreenAppleHealthSettings as ScreenAppleHealthSettingsComponent } from "../../components/screenAppleHealthSettings";
import { ScreenGoogleHealthSettings as ScreenGoogleHealthSettingsComponent } from "../../components/screenGoogleHealthSettings";
import { ScreenMuscleGroups as ScreenMuscleGroupsComponent } from "../../components/screenMuscleGroups";
import { ScreenStats as ScreenStatsComponent } from "../../components/screenStats";
import { ScreenMeasurements as ScreenMeasurementsComponent } from "../../components/screenMeasurements";
import { ScreenExerciseStats as ScreenExerciseStatsComponent } from "../../components/screenExerciseStats";
import { Program_getProgram } from "../../models/program";
import { Exercise_find, Exercise_toKey } from "../../models/exercise";
import { Equipment_getEquipmentOfGym } from "../../models/equipment";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { useAppContext } from "../../components/appContext";

export function NavScreenSettings(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
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
  );
}

export function NavScreenAccount(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return <ScreenAccountComponent navCommon={navCommon} dispatch={dispatch} email={state.user?.email} />;
}

export function NavScreenTimers(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return <ScreenTimersComponent navCommon={navCommon} dispatch={dispatch} timers={state.storage.settings.timers} />;
}

export function NavScreenPlates(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const allEquipment = Equipment_getEquipmentOfGym(state.storage.settings, state.selectedGymId);
  return (
    <ScreenEquipment
      stats={state.storage.stats}
      navCommon={navCommon}
      allEquipment={allEquipment}
      expandedEquipment={state.defaultEquipmentExpanded}
      selectedGymId={state.selectedGymId}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
  );
}

export function NavScreenGyms(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenGymsComponent
      navCommon={navCommon}
      expandedEquipment={state.defaultEquipmentExpanded}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
  );
}

export function NavScreenExercises(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  if (currentProgram == null) {
    throw new Error("Opened 'exercises' screen, but 'currentProgram' is null");
  }
  return (
    <ScreenExercisesComponent
      navCommon={navCommon}
      settings={state.storage.settings}
      dispatch={dispatch}
      program={currentProgram}
      history={state.storage.history}
    />
  );
}

export function NavScreenAppleHealth(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenAppleHealthSettingsComponent navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />
  );
}

export function NavScreenGoogleHealth(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenGoogleHealthSettingsComponent navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />
  );
}

export function NavScreenMuscleGroups(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return <ScreenMuscleGroupsComponent navCommon={navCommon} dispatch={dispatch} settings={state.storage.settings} />;
}

export function NavScreenStats(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenStatsComponent
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
      stats={state.storage.stats}
    />
  );
}

export function NavScreenMeasurements(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenMeasurementsComponent
      navCommon={navCommon}
      subscription={state.storage.subscription}
      dispatch={dispatch}
      settings={state.storage.settings}
      stats={state.storage.stats}
    />
  );
}

export function NavScreenExerciseStats(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const exercise = state.viewExerciseType
    ? Exercise_find(state.viewExerciseType, state.storage.settings.exercises)
    : undefined;
  if (exercise == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <></>;
  }
  return (
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
  );
}

export function NavScreenApiKeys(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenApiKeysComponent
      navCommon={navCommon}
      dispatch={dispatch}
      service={service}
      subscription={state.storage.subscription}
      userId={state.user?.id}
    />
  );
}
