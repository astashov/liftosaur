import React, { useMemo, useCallback, useRef } from "react";
import { View, FlatList, Text, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoreState } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { Program_getProgram, Program_evaluate, Program_getProgramDay } from "@shared/models/program";
import { Progress_lbProgress } from "@shared/models/progress";
import { updateProgress, updateState } from "@shared/models/state";
import { lb } from "lens-shmens";
import type { IHistoryRecord, IHistoryEntry } from "@shared/types";
import { WorkoutHeader } from "@crossplatform/components/WorkoutHeader";
import { WorkoutThumbnailStrip } from "@crossplatform/components/WorkoutThumbnailStrip";
import { WorkoutExercise } from "@crossplatform/components/WorkoutExercise";
import { WorkoutModalAmrap } from "@crossplatform/components/WorkoutModalAmrap";
import { Program_getProgramExercise, Program_getFirstProgramExercise } from "@shared/models/program";
import { Progress_forceUpdateEntryIndex } from "@shared/models/progress";

export function WorkoutScreen(): React.ReactElement {
  const state = useStoreState();
  const dispatch = useDispatch();
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);

  const progress = state.storage.progress?.[0];
  const settings = state.storage.settings;
  const history = state.storage.history;
  const stats = state.storage.stats;
  const subscription = state.storage.subscription;

  const program = progress?.programId ? Program_getProgram(state, progress.programId) : undefined;

  const evaluatedProgram = useMemo(
    () => (program ? Program_evaluate(program, settings) : undefined),
    [program, settings]
  );
  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, progress?.day ?? 1) : undefined;

  const forceUpdateEntryIndex = !!progress?.ui?.forceUpdateEntryIndex;
  const currentEntryIndex = progress?.ui?.currentEntryIndex ?? 0;

  React.useEffect(() => {
    if (progress && flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: currentEntryIndex * screenWidth,
        animated: false,
      });
    }
  }, [forceUpdateEntryIndex]);

  const onPageChange = useCallback(
    (index: number) => {
      if (progress && index !== (progress.ui?.currentEntryIndex ?? 0)) {
        updateProgress(
          dispatch,
          lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index),
          "scroll-exercise-tab"
        );
      }
    },
    [dispatch, progress]
  );

  const onClickThumbnail = useCallback(
    (index: number) => {
      if (progress) {
        updateProgress(
          dispatch,
          [
            lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index),
            lb<IHistoryRecord>()
              .pi("ui")
              .p("forceUpdateEntryIndex")
              .recordModify((v) => !v),
          ],
          "click-exercise-tab"
        );
      }
    },
    [dispatch, progress]
  );

  const onAddExercise = useCallback(() => {
    if (progress) {
      updateState(
        dispatch,
        [
          Progress_lbProgress(progress.id)
            .pi("ui")
            .p("exercisePicker")
            .record({
              state: {
                mode: "workout" as const,
                screenStack: ["exercisePicker"],
                sort: "name_asc" as const,
                filters: {},
                selectedExercises: [],
              },
            }),
        ],
        "Open exercise picker"
      );
    }
  }, [dispatch, progress]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  );

  const renderExercise = useCallback(
    ({ item, index }: { item: IHistoryEntry; index: number }) => (
      <View style={{ width: screenWidth }}>
        <WorkoutExercise
          day={progress?.day ?? 1}
          stats={stats}
          history={history}
          otherStates={evaluatedProgram?.states}
          entryIndex={index}
          program={evaluatedProgram}
          programDay={programDay}
          progress={progress!}
          entry={item}
          subscription={subscription}
          settings={settings}
          dispatch={dispatch}
        />
      </View>
    ),
    [screenWidth, progress, stats, history, evaluatedProgram, programDay, subscription, settings, dispatch]
  );

  if (!progress) {
    return (
      <SafeAreaView edges={["top"]} className="items-center justify-center flex-1 bg-background-default">
        <Text className="text-text-secondary">No active workout</Text>
      </SafeAreaView>
    );
  }

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
      <WorkoutThumbnailStrip
        progress={progress}
        settings={settings}
        onClickThumbnail={onClickThumbnail}
        onAddExercise={onAddExercise}
      />
      {progress.entries.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={progress.entries}
          renderItem={renderExercise}
          keyExtractor={(item) => item.id}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const pageIndex = Math.round(offsetX / screenWidth);
            onPageChange(pageIndex);
          }}
          initialScrollIndex={currentEntryIndex}
        />
      )}
      {progress.ui?.amrapModal && (
        <WorkoutModalAmrap
          isPlayground={false}
          settings={settings}
          dispatch={dispatch}
          programExercise={
            Program_getProgramExercise(
              progress.day,
              evaluatedProgram,
              progress.entries[progress.ui.amrapModal.entryIndex || 0]?.programExerciseId
            ) ||
            Program_getFirstProgramExercise(
              evaluatedProgram,
              progress.entries[progress.ui.amrapModal.entryIndex || 0]?.programExerciseId
            )
          }
          progress={progress}
          onDone={() => {
            Progress_forceUpdateEntryIndex(dispatch);
          }}
        />
      )}
    </SafeAreaView>
  );
}
