import { JSX, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { ScrollView, Gesture, GestureDetector } from "react-native-gesture-handler";
import { WorkoutScrollGestureContext } from "./workoutScrollGestureContext";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings, IStats, ISubscription } from "../types";
import { IState, updateProgress, updateState } from "../models/state";
import { Thunk_postevent, Thunk_pushScreen, Thunk_finishProgramDay } from "../ducks/thunks";
import { IconMuscles2 } from "./icons/iconMuscles2";
import {
  IEvaluatedProgram,
  IEvaluatedProgramDay,
  Program_isEmpty,
  Program_getDayData,
  Program_editAction,
} from "../models/program";
import { lb } from "lens-shmens";
import { ButtonIcon } from "./buttonIcon";
import { IconEdit2 } from "./icons/iconEdit2";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { TextareaAutogrow } from "./textareaAutogrow";
import {
  Progress_lbProgress,
  Progress_isCurrent,
  Progress_editNotes,
  Progress_getColorToSupersetGroup,
  Progress_isFullyFinishedSet,
} from "../models/progress";
import { IconPlus2 } from "./icons/iconPlus2";
import { WorkoutExercise } from "./workoutExercise";
import { Scroller, IScrollerHandle } from "./scroller";
import { WorkoutExerciseThumbnail } from "./workoutExerciseThumbnail";
import { IconShare } from "./icons/iconShare";
import { Markdown } from "./markdown";
import { DraggableList2 } from "./draggableList2";
import { LinkButton } from "./linkButton";
import { Button } from "./button";
import { ImagePreloader_preload, ImagePreloader_dynohappy } from "../utils/imagePreloader";
import { navigationRef } from "../navigation/navigationRef";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { History_calories, History_pauseWorkout } from "../models/history";
import { SendMessage_toIosAndAndroid, SendMessage_isIos } from "../utils/sendMessage";
import { Dialog_confirm } from "../utils/dialog";

interface IWorkoutViewProps {
  history: IHistoryRecord[];
  onShare?: () => void;
  progress: IHistoryRecord;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  helps: string[];
  stats: IStats;
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

export function Workout(props: IWorkoutViewProps): JSX.Element {
  const selectedEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const description = props.programDay?.description;
  const scrollRef = useRef<ScrollView>(null);
  const scrollGesture = useRef(Gesture.Native()).current;
  const forceUpdateEntryIndex = !!props.progress.ui?.forceUpdateEntryIndex;
  const { width: windowWidth } = useWindowDimensions();
  const currentEntryIndex = props.progress.ui?.currentEntryIndex ?? 0;

  const [renderedIndices, setRenderedIndices] = useState<ReadonlySet<number>>(() => {
    const s = new Set<number>();
    for (let i = Math.max(0, currentEntryIndex - 1); i <= currentEntryIndex + 1; i++) {
      s.add(i);
    }
    return s;
  });
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const onPageLayout = useCallback((entryIndex: number, height: number) => {
    setPageHeights((prev) => {
      if (prev[entryIndex] === height) {
        return prev;
      }
      return { ...prev, [entryIndex]: height };
    });
  }, []);
  const pagerHeight = pageHeights[currentEntryIndex];
  useEffect(() => {
    setRenderedIndices((prev) => {
      if (prev.has(currentEntryIndex - 1) && prev.has(currentEntryIndex) && prev.has(currentEntryIndex + 1)) {
        return prev;
      }
      const next = new Set(prev);
      for (let i = Math.max(0, currentEntryIndex - 1); i <= currentEntryIndex + 1; i++) {
        next.add(i);
      }
      return next;
    });
  }, [currentEntryIndex]);

  useEffect(() => {
    ImagePreloader_preload(ImagePreloader_dynohappy);
    if (props.program && Program_isEmpty(props.program) && props.progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [Progress_lbProgress(props.progress.id).pi("ui", {}).p("exercisePicker").record({})],
        "Open exercise picker on empty program"
      );
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: currentEntryIndex * windowWidth, animated: false });
  }, [forceUpdateEntryIndex, windowWidth]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (windowWidth <= 0) {
      return;
    }
    const scrollLeft = e.nativeEvent.contentOffset.x;
    const selectedIndex = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
    if (selectedIndex === currentEntryIndex) {
      return;
    }
    if (!props.progress.ui?.isExternal) {
      updateProgress(
        props.dispatch,
        lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(selectedIndex),
        "scroll-exercise-tab"
      );
    } else {
      updateProgress(
        props.dispatch,
        [
          lb<IHistoryRecord>().pi("ui", {}).p("isExternal").record(false),
          lb<IHistoryRecord>()
            .pi("ui", {})
            .p("forceUpdateEntryIndex")
            .recordModify((v) => !v),
        ],
        "scroll-exercise-tab-external"
      );
    }
  };

  return (
    <View className="pb-8">
      <WorkoutHeader
        description={description}
        progress={props.progress}
        settings={props.settings}
        allPrograms={props.allPrograms}
        dispatch={props.dispatch}
        program={props.program}
        onConvertToProgram={() => {
          navigationRef.navigate("dayFromAdhocModal", { progressId: props.progress.id });
        }}
        onShare={props.onShare}
      />
      <WorkoutListOfExercises
        progress={props.progress}
        dispatch={props.dispatch}
        settings={props.settings}
        onClick={(entryIndex) => {
          updateProgress(
            props.dispatch,
            [
              lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(entryIndex),
              lb<IHistoryRecord>()
                .pi("ui", {})
                .p("forceUpdateEntryIndex")
                .recordModify((v) => !v),
            ],
            "click-exercise-tab"
          );
        }}
      />
      {selectedEntry != null && (
        <WorkoutScrollGestureContext.Provider value={scrollGesture}>
          <View className="mt-2">
            <GestureDetector gesture={scrollGesture}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={pagerHeight != null ? { height: pagerHeight } : undefined}
              >
                {props.progress.entries.map((entry, entryIndex) => {
                  const shouldRender = renderedIndices.has(entryIndex);
                  return (
                    <View key={entry.id} style={{ width: windowWidth }}>
                      <View onLayout={(e: LayoutChangeEvent) => onPageLayout(entryIndex, e.nativeEvent.layout.height)}>
                        {shouldRender ? (
                          <WorkoutExercise
                            day={props.progress.day}
                            stats={props.stats}
                            history={props.history}
                            otherStates={props.program?.states}
                            entryIndex={entryIndex}
                            program={props.program}
                            programDay={props.programDay}
                            progress={props.progress}
                            showHelp={true}
                            helps={props.helps}
                            entry={entry}
                            subscription={props.subscription}
                            settings={props.settings}
                            dispatch={props.dispatch}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </GestureDetector>
          </View>
        </WorkoutScrollGestureContext.Provider>
      )}
    </View>
  );
}

interface IWorkoutHeaderProps {
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
  onShare?: () => void;
  onConvertToProgram?: () => void;
  description?: string;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
}

function WorkoutHeader(props: IWorkoutHeaderProps): JSX.Element {
  const { program } = props;
  const currentProgram = props.allPrograms.find((p) => p.id === props.program?.id);
  const isEligibleForProgramDay =
    !Progress_isCurrent(props.progress) && props.allPrograms.every((p) => p.id !== props.progress.programId);

  const onFinish = async (): Promise<void> => {
    const isFullyFinished = Progress_isCurrent(props.progress) && Progress_isFullyFinishedSet(props.progress);
    if (!isFullyFinished) {
      const confirmed = await Dialog_confirm(
        Progress_isCurrent(props.progress)
          ? "Are you sure you want to FINISH this workout? Some sets are not marked as completed."
          : "Are you sure you want to SAVE this PAST workout?"
      );
      if (!confirmed) {
        return;
      }
    }
    SendMessage_toIosAndAndroid({ type: "pauseWorkout" });
    props.dispatch(Thunk_finishProgramDay());
    if (Progress_isCurrent(props.progress)) {
      props.dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(props.progress) }));
      const healthName = SendMessage_isIos() ? "Apple Health" : "Google Health";
      const isHealthEligible =
        (HealthSync_eligibleForAppleHealth() && props.settings.appleHealthSyncWorkout) ||
        (HealthSync_eligibleForGoogleHealth() && props.settings.googleHealthSyncWorkout);
      const shouldSyncToHealth =
        isHealthEligible &&
        (!props.settings.healthConfirmation ||
          (await Dialog_confirm(`Do you want to sync this workout to ${healthName}?`)));
      SendMessage_toIosAndAndroid({
        type: "finishWorkout",
        healthSync: shouldSyncToHealth ? "true" : "false",
        calories: `${History_calories(props.progress)}`,
        intervals: JSON.stringify(History_pauseWorkout(props.progress.intervals)),
      });
    }
  };

  return (
    <View className="px-4">
      <View className="flex-row gap-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold">{props.progress?.dayName}</Text>
          <Text data-cy="day-name" className="text-sm text-text-secondary">
            {props.progress?.programName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {isEligibleForProgramDay && (
            <Button
              kind="purple"
              buttonSize="md"
              data-cy="save-to-program"
              name="save-to-program"
              onClick={() => props.onConvertToProgram?.()}
            >
              Create Program Day
            </Button>
          )}
          {!Progress_isCurrent(props.progress) && (
            <ButtonIcon name="past-workout-share" onClick={() => props.onShare?.()}>
              <IconShare />
            </ButtonIcon>
          )}
          {program && !Program_isEmpty(program) && (
            <ButtonIcon
              name="workout-day-muscles"
              onClick={() => {
                updateState(
                  props.dispatch,
                  [
                    lb<IState>()
                      .p("muscleView")
                      .record({ type: "day", programId: program.id, day: props.progress.day }),
                  ],
                  "Show muscle view"
                );
                props.dispatch(Thunk_pushScreen("muscles"));
              }}
            >
              <IconMuscles2 />
            </ButtonIcon>
          )}
          {program && currentProgram && !Program_isEmpty(currentProgram) && (
            <ButtonIcon
              name="workout-edit-day"
              onClick={() => {
                const dayData = Program_getDayData(program, props.progress.day);
                Program_editAction(props.dispatch, currentProgram, dayData, undefined, { tab: "program" });
              }}
            >
              <IconEdit2 />
            </ButtonIcon>
          )}
          <Button
            name={Progress_isCurrent(props.progress) ? "finish-workout" : "save-history-record"}
            kind="purple"
            buttonSize="md"
            data-cy="finish-workout"
            onClick={() => {
              onFinish().catch(() => undefined);
            }}
          >
            {Progress_isCurrent(props.progress) ? "Finish" : "Save"}
          </Button>
        </View>
      </View>
      {props.description && (
        <View className={`mt-1 ${props.progress.notes ? "border-b border-background-subtle mb-1 pb-1" : ""}`}>
          <Markdown value={props.description} />
        </View>
      )}
      <View>
        <TextareaAutogrow
          data-cy="workout-notes-input"
          id="workout-notes"
          debounceMs={1000}
          maxLength={4095}
          name="workout-notes"
          placeholder="Add workout notes here..."
          value={props.progress.notes}
          onChangeText={(text) => {
            Progress_editNotes(props.dispatch, props.progress.id, text);
          }}
          className="mt-1"
        />
      </View>
    </View>
  );
}

interface IWorkoutListOfExercisesProps {
  progress: IHistoryRecord;
  onClick: (index: number) => void;
  dispatch: IDispatch;
  settings: ISettings;
}

function WorkoutListOfExercises(props: IWorkoutListOfExercisesProps): JSX.Element {
  const [enableReorder, setEnableReorder] = useState(false);
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  const currentEntryIndex = props.progress.ui?.currentEntryIndex ?? 0;
  const currentSuperset = props.progress.entries[currentEntryIndex]?.superset;
  const thumbScrollerRef = useRef<IScrollerHandle>(null);
  const prevEntriesLengthRef = useRef(props.progress.entries.length);
  useEffect(() => {
    const prev = prevEntriesLengthRef.current;
    const curr = props.progress.entries.length;
    if (curr > prev) {
      thumbScrollerRef.current?.scrollToEnd();
    }
    prevEntriesLengthRef.current = curr;
  }, [props.progress.entries.length]);
  return (
    <>
      <View className="items-end mr-2">
        <LinkButton
          className="px-2 py-1 text-xs"
          name="reorder-workout-exercises"
          onClick={() => setEnableReorder(!enableReorder)}
        >
          {enableReorder ? "Finish Reordering" : "Reorder Exercises"}
        </LinkButton>
      </View>
      <View className="py-1 border-b bg-background-default border-background-subtle">
        <Scroller ref={thumbScrollerRef}>
          <View className="flex-row items-center gap-1 px-4">
            <DraggableList2
              isDisabled={!enableReorder}
              mode="horizontal"
              items={props.progress.entries}
              element={(entry, entryIndex, dragHandle) => {
                const thumbnail = (
                  <WorkoutExerciseThumbnail
                    colorToSupersetGroup={colorToSupersetGroup}
                    onClick={() => {
                      if (!enableReorder) {
                        props.onClick(entryIndex);
                      }
                    }}
                    shouldShowProgress={true}
                    selectedIndex={currentEntryIndex}
                    isCurrent={entryIndex === currentEntryIndex}
                    currentSuperset={currentSuperset}
                    settings={props.settings}
                    entry={entry}
                    entryIndex={entryIndex}
                  />
                );
                return enableReorder ? dragHandle(thumbnail) : thumbnail;
              }}
              onDragEnd={(startIndex, endIndex) => {
                updateProgress(
                  props.dispatch,
                  [
                    lb<IHistoryRecord>()
                      .p("changes")
                      .recordModify((changes) => Array.from(new Set([...(changes || []), "order"]))),
                    lb<IHistoryRecord>()
                      .p("entries")
                      .recordModify((entries) => {
                        const newEntries = [...entries];
                        const [entriesToMove] = newEntries.splice(startIndex, 1);
                        newEntries.splice(endIndex, 0, entriesToMove);
                        return newEntries.map((e, i) => ({ ...e, index: i }));
                      }),
                  ],
                  "drag-exercise-tab"
                );
                setTimeout(() => {
                  props.onClick(endIndex);
                }, 0);
              }}
            />
            <Pressable
              testID="add-exercise-button"
              data-cy="add-exercise-button"
              className="p-2"
              onPress={() => {
                updateState(
                  props.dispatch,
                  [
                    Progress_lbProgress(props.progress.id)
                      .pi("ui", {})
                      .p("exercisePicker")
                      .record({
                        state: {
                          mode: "workout",
                          screenStack: ["exercisePicker"],
                          sort: "name_asc",
                          filters: {},
                          selectedExercises: [],
                        },
                      }),
                  ],
                  "Open exercise picker"
                );
              }}
            >
              <IconPlus2 size={15} color={Tailwind_colors().lightgray[600]} />
            </Pressable>
          </View>
        </Scroller>
      </View>
    </>
  );
}
