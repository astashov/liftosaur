import { JSX } from "react";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenFirst as ScreenFirstComponent } from "../../components/screenFirst";
import { ScreenUnitSelector } from "../../components/screenUnitSelector";
import {
  ScreenSetupEquipment as ScreenSetupEquipmentComponent,
  ScreenSetupPlates as ScreenSetupPlatesComponent,
} from "../../components/screenSetupEquipment";
import { ScreenProgramSelect as ScreenProgramSelectComponent } from "../../components/screenProgramSelect";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { Account_getFromStorage } from "../../models/account";
import { useAppContext } from "../../components/appContext";

export function NavScreenFirst(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const userId = state.user?.id;
  const userEmail = state.user?.email;
  const account = userId && userEmail ? Account_getFromStorage(userId, userEmail, state.storage) : undefined;
  return (
    <NavScreenContent>
      <ScreenFirstComponent account={account} client={service.client} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenUnits(): JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenUnitSelector settings={state.storage.settings} dispatch={dispatch} />
    </NavScreenContent>
  );
}

export function NavScreenSetupEquipment(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ScreenSetupEquipmentComponent
        stats={state.storage.stats}
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        programSelectScreen="onboarding/programselect"
      />
    </NavScreenContent>
  );
}

export function NavScreenSetupPlates(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ScreenSetupPlatesComponent
        stats={state.storage.stats}
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        programSelectScreen="onboarding/programselect"
      />
    </NavScreenContent>
  );
}

export function NavScreenProgramSelectOnboarding(): JSX.Element {
  const { state, dispatch } = useAppState();
  return (
    <NavScreenContent>
      <ScreenProgramSelectComponent
        dispatch={dispatch}
        settings={state.storage.settings}
        programsScreen="onboarding/programs"
      />
    </NavScreenContent>
  );
}

export function NavScreenProgramsOnboarding(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ChooseProgramView
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        progress={Progress_getCurrentProgress(state)}
        programs={state.programs || []}
        programsIndex={state.programsIndex || []}
        customPrograms={state.storage.programs || []}
        editProgramId={Progress_getCurrentProgress(state)?.programId}
        previewScreen="onboarding/programPreview"
      />
    </NavScreenContent>
  );
}

export function NavScreenProgramPreviewOnboarding(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return (
      <NavScreenContent>
        <></>
      </NavScreenContent>
    );
  }
  return (
    <NavScreenContent>
      <ScreenProgramPreviewComponent
        navCommon={navCommon}
        dispatch={dispatch}
        settings={state.storage.settings}
        selectedProgramId={state.previewProgram.id}
        programs={state.previewProgram.showCustomPrograms ? state.storage.programs : state.programs}
        subscription={state.storage.subscription}
      />
    </NavScreenContent>
  );
}
