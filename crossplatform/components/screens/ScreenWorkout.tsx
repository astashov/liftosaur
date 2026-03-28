import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, ScrollView, Text, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Program_getProgram, Program_evaluate, Program_getProgramDay } from "@shared/models/program";
import { Progress_isCurrent, Progress_getNextSupersetEntry } from "@shared/models/progress";
import type { IHistoryRecord, IHistoryEntry } from "@shared/types";
import type { IState } from "@shared/models/state";
import type { IDispatch } from "@shared/ducks/types";
import {
  WorkoutActions_pageChange,
  WorkoutActions_clickThumbnail,
  WorkoutActions_addExercise,
  WorkoutActions_moveExercise,
} from "@shared/actions/workoutActions";
import { WorkoutHeader } from "../WorkoutHeader";
import { WorkoutThumbnailStrip } from "../WorkoutThumbnailStrip";
import { WorkoutExercise } from "../WorkoutExercise";

interface IProps {
  state: IState;
  dispatch: IDispatch;
  onOpenAmrapSheet: () => void;
}

export function ScreenWorkout(props: IProps): React.ReactElement {
  const { state, dispatch } = props;
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [enableReorder, setEnableReorder] = useState(false);

  const t0Screen = Date.now();

  const progress = state.storage.progress?.[0];
  if (progress == null) {
    return (
      <SafeAreaView edges={["top"]} className="items-center justify-center flex-1 bg-background-default">
        <Text className="text-text-secondary">No active workout</Text>
      </SafeAreaView>
    );
  }
  const settings = state.storage.settings;
  const history = state.storage.history;
  const stats = state.storage.stats;
  const subscription = state.storage.subscription;

  const program = progress.programId ? Program_getProgram(state, progress.programId) : undefined;
  const evaluatedProgram = useMemo(
    () => (program ? Program_evaluate(program, settings) : undefined),
    [program, settings]
  );
  const programDay = useMemo(
    () => (evaluatedProgram ? Program_getProgramDay(evaluatedProgram, progress?.day ?? 1) : undefined),
    [evaluatedProgram, progress?.day]
  );

  const isCurrentProgress = Progress_isCurrent(progress);
  const currentEntryIndex = progress.ui?.currentEntryIndex ?? 0;

  const scrollToIndex = (index: number): void => {
    flatListRef.current?.scrollToOffset({ offset: index * screenWidth, animated: false });
  };

  const prevAmrapModal = useRef(progress.ui?.amrapModal);
  useEffect(() => {
    const current = progress.ui?.amrapModal;
    const prev = prevAmrapModal.current;
    prevAmrapModal.current = current;
    if (current && !prev) {
      props.onOpenAmrapSheet();
    }
  }, [progress.ui?.amrapModal]);

  const getItemLayout = useCallback(
    (_: unknown, index: number): { length: number; offset: number; index: number } => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  );

  const supersetEntries = useMemo(
    () => progress.entries.map((entry) => Progress_getNextSupersetEntry(progress.entries, entry)),
    [progress.entries]
  );

  const progressDay = progress.day ?? 1;
  const progressStartTime = progress.startTime;
  const userPromptedStateVars = progress.userPromptedStateVars;

  const renderExercise = useCallback(
    ({ item, index }: { item: IHistoryEntry; index: number }) => (
      <ScrollView style={{ width: screenWidth }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}>
        <WorkoutExercise
          day={progressDay}
          stats={stats}
          history={history}
          otherStates={evaluatedProgram?.states}
          entryIndex={index}
          program={evaluatedProgram}
          programDay={programDay}
          isCurrentProgress={isCurrentProgress}
          startTime={progressStartTime}
          supersetEntry={supersetEntries[index]}
          userPromptedStateVars={userPromptedStateVars}
          entry={item}
          subscription={subscription}
          settings={settings}
          dispatch={dispatch}
          screenWidth={screenWidth}
        />
      </ScrollView>
    ),
    [screenWidth, progressDay, progressStartTime, userPromptedStateVars, supersetEntries, stats, history, evaluatedProgram, programDay, isCurrentProgress, subscription, settings, dispatch]
  );

  console.log(`[PERF] ScreenWorkout render: ${Date.now() - t0Screen}ms`);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-default">
      <WorkoutHeader
        progress={progress}
        settings={settings}
        subscription={subscription}
        dispatch={dispatch}
        program={evaluatedProgram}
        programDay={programDay}
        allPrograms={state.storage.programs}
        setIsShareShown={() => {}}
      />
      <View className="flex-row items-center justify-end px-4 py-2" style={{ zIndex: 1 }}>
        <Pressable
          accessibilityLabel={enableReorder ? "Finish Reordering" : "Reorder Exercises"}
          accessibilityRole="button"
          className="px-3 py-2"
          onPress={() => setEnableReorder(!enableReorder)}
        >
          <Text className="text-xs font-bold underline text-text-link">
            {enableReorder ? "Finish Reordering" : "Reorder Exercises"}
          </Text>
        </Pressable>
      </View>
      <WorkoutThumbnailStrip
        progress={progress}
        settings={settings}
        enableReorder={enableReorder}
        onClickThumbnail={(index) => {
          WorkoutActions_clickThumbnail(dispatch, index);
          scrollToIndex(index);
        }}
        onAddExercise={() => WorkoutActions_addExercise(dispatch, progress.id)}
        onMoveExercise={(from, to) => {
          const newIndex = WorkoutActions_moveExercise(dispatch, progress, from, to);
          scrollToIndex(newIndex);
        }}
      />
      {progress.entries.length > 0 && (
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={progress.entries}
          renderItem={renderExercise}
          keyExtractor={(item) => item.id}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={1}
          onMomentumScrollEnd={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const pageIndex = Math.round(offsetX / screenWidth);
            WorkoutActions_pageChange(dispatch, progress, pageIndex);
          }}
          initialScrollIndex={currentEntryIndex}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 100);
          }}
        />
      )}
    </SafeAreaView>
  );
}
