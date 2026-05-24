import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenWorkout } from "../../components/screenWorkout";
import { ScreenFinishDay as ScreenFinishDayComponent } from "../../components/screenFinishDay";
import { ScreenSubscription as ScreenSubscriptionComponent } from "../../components/screenSubscription";
import { Progress_isCurrent } from "../../models/progress";
import { Program_getFullProgram, Program_getProgram, Program_fullProgram } from "../../models/program";
import { FallbackScreen } from "../../components/fallbackScreen";
import { useEqual } from "../../utils/useEqual";

export function NavScreenProgress(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const route = useRoute<{ key: string; name: string; params?: { id?: number } }>();
  const progressId = route.params?.id ?? 0;
  const navCommon = untrack(buildNavCommon(state));
  const subscription = useEqual(untrack(state.storage.subscription));
  const settings = untrack(state.storage.settings);
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  const progress = untrack(progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId]);
  const program = untrack(
    progress
      ? Progress_isCurrent(progress)
        ? Program_getFullProgram(state, progress.programId) ||
          (currentProgram ? Program_fullProgram(currentProgram, settings) : undefined)
        : undefined
      : undefined
  );

  return (
    <FallbackScreen state={{ progress }} dispatch={dispatch}>
      {({ progress: progress2 }) => (
        <ScreenWorkout
          navCommon={navCommon}
          stats={untrack(state.storage.stats)}
          helps={untrack(state.storage.helps)}
          history={untrack(state.storage.history)}
          subscription={subscription}
          userId={state.user?.id}
          progress={progress2}
          allPrograms={untrack(state.storage.programs)}
          program={program}
          currentProgram={currentProgram}
          dispatch={dispatch}
          settings={settings}
        />
      )}
    </FallbackScreen>
  );
}

export function NavScreenFinishDay(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <NavScreenContent>
      <ScreenFinishDayComponent
        navCommon={navCommon}
        settings={untrack(state.storage.settings)}
        dispatch={dispatch}
        history={untrack(state.storage.history)}
        userId={state.user?.id}
      />
    </NavScreenContent>
  );
}

export function NavScreenSubscription(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navCommon = untrack(buildNavCommon(state));
  return (
    <ScreenSubscriptionComponent
      history={untrack(state.storage.history)}
      prices={untrack(state.prices)}
      offers={untrack(state.offers)}
      appleOffer={untrack(state.appleOffer)}
      googleOffer={untrack(state.googleOffer)}
      subscription={untrack(state.storage.subscription)}
      subscriptionLoading={state.subscriptionLoading}
      dispatch={dispatch}
      navCommon={navCommon}
    />
  );
}
