import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenWorkout } from "../../components/screenWorkout";
import { ScreenFinishDay as ScreenFinishDayComponent } from "../../components/screenFinishDay";
import { ScreenSubscription as ScreenSubscriptionComponent } from "../../components/screenSubscription";
import { Progress_isCurrent } from "../../models/progress";
import { Program_getFullProgram, Program_getProgram, Program_fullProgram } from "../../models/program";
import { FallbackScreen } from "../../components/fallbackScreen";

export function NavScreenProgress(): JSX.Element {
  const { state, dispatch } = useAppState();
  const route = useRoute<{ key: string; name: string; params?: { id?: number } }>();
  const progressId = route.params?.id ?? 0;
  const navCommon = buildNavCommon(state);
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const program = progress
    ? Progress_isCurrent(progress)
      ? Program_getFullProgram(state, progress.programId) ||
        (currentProgram ? Program_fullProgram(currentProgram, state.storage.settings) : undefined)
      : undefined
    : undefined;

  return (
    <FallbackScreen state={{ progress }} dispatch={dispatch}>
      {({ progress: progress2 }) => (
        <ScreenWorkout
          navCommon={navCommon}
          stats={state.storage.stats}
          helps={state.storage.helps}
          history={state.storage.history}
          subscription={state.storage.subscription}
          userId={state.user?.id}
          progress={progress2}
          allPrograms={state.storage.programs}
          program={program}
          currentProgram={currentProgram}
          dispatch={dispatch}
          settings={state.storage.settings}
        />
      )}
    </FallbackScreen>
  );
}

export function NavScreenFinishDay(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ScreenFinishDayComponent
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        userId={state.user?.id}
      />
    </NavScreenContent>
  );
}

export function NavScreenSubscription(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ScreenSubscriptionComponent
      history={state.storage.history}
      prices={state.prices}
      offers={state.offers}
      appleOffer={state.appleOffer}
      googleOffer={state.googleOffer}
      subscription={state.storage.subscription}
      subscriptionLoading={state.subscriptionLoading}
      dispatch={dispatch}
      navCommon={navCommon}
    />
  );
}
