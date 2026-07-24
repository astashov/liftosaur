import React from "react";
import { View } from "react-native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { NavScreenContent } from "../NavScreenContent";
import { buildNavCommon } from "../utils";
import { ScreenFirst as ScreenFirstComponent } from "../../components/screenFirst";
import { ScreenUnitSelector } from "../../components/screenUnitSelector";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { usePlaygroundModalBridges } from "../usePlaygroundModalBridges";
import {
  ScreenSetupEquipment as ScreenSetupEquipmentComponent,
  ScreenSetupPlates as ScreenSetupPlatesComponent,
} from "../../components/screenSetupEquipment";
import { ScreenHearAboutUs as ScreenHearAboutUsComponent } from "../../components/screenHearAboutUs";

export function NavScreenFirst(): React.JSX.Element {
  const dispatch = useTrackedDispatch();
  return (
    <NavScreenContent>
      <ScreenFirstComponent dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenUnits(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  return (
    <NavScreenContent>
      <ScreenUnitSelector settings={untrack(state.storage.settings)} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenSetupEquipment(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <ScreenSetupEquipmentComponent
      stats={untrack(state.storage.stats)}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={untrack(state.storage.settings)}
    />
  );
}

export function NavScreenSetupPlates(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <ScreenSetupPlatesComponent
      stats={untrack(state.storage.stats)}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={untrack(state.storage.settings)}
    />
  );
}

export function NavScreenHearAboutUs(): React.JSX.Element {
  const dispatch = useTrackedDispatch();
  return (
    <NavScreenContent>
      <ScreenHearAboutUsComponent dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenProgramSelectOnboarding(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  return (
    <NavScreenContent>
      <ScreenProgramSelectComponent dispatch={dispatch} settings={untrack(state.storage.settings)} />
    </NavScreenContent>
  );
}

export function NavScreenProgramsOnboarding(): React.JSX.Element {
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
    />
  );
}

export function NavScreenProgramPreviewOnboarding(): React.JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));

  // Pass tracked state so playgroundState reads register subscriptions and the modal opens.
  usePlaygroundModalBridges(state);

  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <View className="flex-1 bg-background-default" />;
  }
  return (
    <ScreenProgramPreviewComponent
      navCommon={navCommon}
      dispatch={dispatch}
      settings={untrack(state.storage.settings)}
      selectedProgramId={state.previewProgram.id}
      programs={untrack(state.previewProgram.showCustomPrograms ? state.storage.programs : state.programs)}
      subscription={untrack(state.storage.subscription)}
    />
  );
}
