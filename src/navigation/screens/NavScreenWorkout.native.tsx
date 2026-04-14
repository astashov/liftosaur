import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenWorkout } from "../../components/screenWorkout";
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
    <NavScreenContent>
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
    </NavScreenContent>
  );
}

export function NavScreenFinishDay(): JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Finish Day</Text>
    </View>
  );
}

export function NavScreenSubscription(): JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Subscription</Text>
    </View>
  );
}
