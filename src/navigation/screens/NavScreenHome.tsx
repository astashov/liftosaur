import { JSX, useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../navigationRef";
import { Text } from "../../components/primitives/text";
import { useRoute } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { ProgramHistoryView } from "../../components/programHistory";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Program_getProgram } from "../../models/program";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { ImagePreloader_preload } from "../../utils/imagePreloader";

const subscriptionImages = ["/images/subscriptionhero.png"];

// Temporary entry point for the native Liftoscript editor prototype; remove when the
// editor gets a real home.
function EditorPlaygroundButton(props: { top: number }): JSX.Element {
  return (
    <Pressable
      className="absolute right-4 z-10 px-3 py-1 rounded-full border border-border-neutral bg-background-subtle"
      style={{ top: props.top }}
      onPress={() => navigationRef.navigate("editorPlayground")}
    >
      <Text className="text-xs text-text-secondary">Editor</Text>
    </Pressable>
  );
}

export function NavScreenMain(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  useScreenPerf("main");

  useEffect(() => {
    for (const path of subscriptionImages) {
      ImagePreloader_preload(path);
    }
  }, []);
  const navCommon = untrack(buildNavCommon(state));
  const route = useRoute<{ key: string; name: "main"; params?: { historyRecordId?: number } }>();
  const ongoingProgress = untrack(state.storage.progress?.[0]);
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  const insets = useSafeAreaInsets();

  if (currentProgram == null) {
    return (
      <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
        <EditorPlaygroundButton top={insets.top + 8} />
        <ChooseProgramView
          navCommon={navCommon}
          settings={untrack(state.storage.settings)}
          dispatch={dispatch}
          progress={ongoingProgress}
          programs={untrack(state.programs || [])}
          programsIndex={untrack(state.programsIndex || [])}
          customPrograms={untrack(state.storage.programs || [])}
          editProgramId={ongoingProgress?.programId}
          hasBottomNav={true}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
      <EditorPlaygroundButton top={insets.top + 8} />
      <ProgramHistoryView
        progress={ongoingProgress}
        navCommon={navCommon}
        program={currentProgram}
        settings={untrack(state.storage.settings)}
        history={untrack(state.storage.history)}
        subscription={untrack(state.storage.subscription)}
        dispatch={dispatch}
        initialHistoryRecordId={route.params?.historyRecordId}
      />
    </View>
  );
}
