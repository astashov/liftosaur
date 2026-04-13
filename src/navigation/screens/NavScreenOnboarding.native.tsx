import React from "react";
import { View } from "react-native";
import { useAppState } from "../StateContext";
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
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenSetupEquipmentComponent
      stats={state.storage.stats}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
  );
}

export function NavScreenSetupPlates(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenSetupPlatesComponent
      stats={state.storage.stats}
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
    />
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

export function NavScreenProgramPreviewOnboarding(): React.JSX.Element {
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
