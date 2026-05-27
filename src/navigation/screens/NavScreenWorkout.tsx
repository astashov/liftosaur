import { JSX, useMemo } from "react";
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
import { useEqual } from "../../utils/useEqual";

export function NavScreenProgress(): JSX.Element {
  const { state, dispatch } = useAppState();
  const route = useRoute<{ key: string; name: string; params?: { id?: number } }>();
  const progressId = route.params?.id ?? 0;
  const subscription = useEqual(state.storage.subscription);
  const settings = state.storage.settings;
  const stats = state.storage.stats;
  const helps = state.storage.helps;
  const history = state.storage.history;
  const allPrograms = state.storage.programs;
  const loading = state.loading;
  const userId = state.user?.id;
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const program = progress
    ? Progress_isCurrent(progress)
      ? Program_getFullProgram(state, progress.programId) ||
        (currentProgram ? Program_fullProgram(currentProgram, settings) : undefined)
      : undefined
    : undefined;
  const navCommon = useMemo(
    () => ({
      subscription,
      doesHaveWorkouts: history.length > 0,
      helps,
      loading,
      currentProgram,
      allPrograms,
      settings,
      progress,
      stats,
      userId,
    }),
    [subscription, history, helps, loading, currentProgram, allPrograms, settings, progress, stats, userId]
  );

  return (
    <FallbackScreen state={{ progress }} dispatch={dispatch}>
      {({ progress: progress2 }) => (
        <ScreenWorkout
          navCommon={navCommon}
          stats={stats}
          helps={helps}
          history={history}
          subscription={subscription}
          userId={userId}
          progress={progress2}
          allPrograms={allPrograms}
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
  const { state, dispatch } = useAppState();
  const route = useRoute<{ key: string; name: string; params?: { id?: number } }>();
  const navCommon = buildNavCommon(state);
  return (
    <NavScreenContent>
      <ScreenFinishDayComponent
        navCommon={navCommon}
        settings={state.storage.settings}
        dispatch={dispatch}
        history={state.storage.history}
        historyRecordId={route.params?.id}
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
