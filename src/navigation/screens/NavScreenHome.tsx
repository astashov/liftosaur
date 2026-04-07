import { JSX } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { ProgramHistoryView } from "../../components/programHistory";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Program_getProgram } from "../../models/program";

export function NavScreenMain(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const route = useRoute<{ key: string; name: "main"; params?: { historyRecordId?: number } }>();
  const ongoingProgress = state.storage.progress?.[0];
  const currentProgram =
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined;
  const insets = useSafeAreaInsets();

  if (currentProgram == null) {
    return (
      <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
        <ChooseProgramView
          navCommon={navCommon}
          settings={state.storage.settings}
          dispatch={dispatch}
          progress={ongoingProgress}
          programs={state.programs || []}
          programsIndex={state.programsIndex || []}
          customPrograms={state.storage.programs || []}
          editProgramId={ongoingProgress?.programId}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
      <ProgramHistoryView
        progress={ongoingProgress}
        navCommon={navCommon}
        program={currentProgram}
        settings={state.storage.settings}
        history={state.storage.history}
        subscription={state.storage.subscription}
        dispatch={dispatch}
        initialHistoryRecordId={route.params?.historyRecordId}
      />
    </View>
  );
}
