import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LayoutChangeEvent } from "react-native";
import { Program_nextHistoryRecord, Program_isEmpty, Program_getProgram, emptyProgramId } from "@shared/models/program";
import type { IHistoryRecord } from "@shared/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStoreState } from "../context/StoreContext";
import { useWebViewPool } from "../screens/WebViewPool";
import { HistoryEntryView } from "@crossplatform/components/HistoryEntryView";

export function NextWorkoutScreen(): React.ReactElement {
  const navigation = useNavigation();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const appState = useStoreState();
  const pool = useWebViewPool();

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const contentHeight = e.nativeEvent.layout.height;
      const headerHeight = 56;
      const fraction = Math.min((contentHeight + headerHeight + insets.bottom) / screenHeight, 0.9);
      navigation.setOptions({ sheetAllowedDetents: [fraction, 1.0] });
    },
    [screenHeight, navigation, insets.bottom]
  );

  const hasOngoingProgress = (appState.storage.progress?.length ?? 0) > 0;
  const currentProgram = appState.storage.currentProgramId
    ? Program_getProgram(appState, appState.storage.currentProgramId)
    : undefined;
  const settings = appState.storage.settings;
  const stats = appState.storage.stats;

  let nextHistoryRecord: IHistoryRecord | undefined;
  if (currentProgram && !Program_isEmpty(currentProgram)) {
    try {
      nextHistoryRecord = Program_nextHistoryRecord(currentProgram, settings, stats);
    } catch {
      // Program evaluation can fail
    }
  }

  const doesProgressNotMatchProgram =
    nextHistoryRecord &&
    hasOngoingProgress &&
    (nextHistoryRecord.programId !== currentProgram?.id || nextHistoryRecord.day !== currentProgram?.nextDay);

  const onStartWorkout = (): void => {
    navigation.goBack();
    pool.sendCommand({ type: "command", command: "startProgramDay" });
  };

  const onStartAdHoc = (): void => {
    navigation.goBack();
    pool.sendCommand({ type: "command", command: "startProgramDay", programId: emptyProgramId });
  };

  const onChangeNextDay = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).replace("ChangeNextDaySheet");
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default" onLayout={onContentLayout}>
      {doesProgressNotMatchProgram && (
        <Text className="mx-4 mb-2 text-xs text-center text-text-secondary">
          You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
        </Text>
      )}

      {Program_isEmpty(currentProgram) && (
        <Text className="mx-4 mb-2 text-xs text-center text-text-secondary">No program currently selected.</Text>
      )}

      {nextHistoryRecord && (
        <ScrollView className="flex-1">
          <View className="p-4 mx-4 mb-2 border rounded-2xl bg-background-subtlecardpurple border-border-cardpurple">
            <Text className="text-lg font-bold text-text-primary">{nextHistoryRecord.dayName}</Text>
            <Text className="mb-2 text-sm text-text-secondary">{nextHistoryRecord.programName}</Text>
            {nextHistoryRecord.entries.map((entry, i) => (
              <HistoryEntryView
                key={entry.id}
                entry={entry}
                isNext={true}
                isLast={i === nextHistoryRecord!.entries.length - 1}
                settings={settings}
                showNotes={false}
              />
            ))}
            <Pressable
              onPress={onStartWorkout}
              className="items-center py-3 mt-4 rounded-xl bg-button-primarybackground"
            >
              <Text className="text-base font-bold text-button-primarylabel">Start</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <View className="flex-row justify-between px-4 pt-3 pb-6 bg-background-default">
        <Pressable onPress={onChangeNextDay} className="p-1">
          <Text className="text-base font-semibold underline text-text-link">Change next workout</Text>
        </Pressable>
        <Pressable onPress={onStartAdHoc} className="p-1">
          <Text className="text-base font-semibold underline text-text-link">Ad-Hoc Workout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
