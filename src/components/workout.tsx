import { JSX, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, LayoutChangeEvent, Platform, useWindowDimensions } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryEntry, IHistoryRecord, IProgram, IProgramState, ISettings, IStats, ISubscription } from "../types";
import { IState, updateProgress, updateState } from "../models/state";
import { Thunk_postevent, Thunk_pushScreen, Thunk_finishProgramDay, Thunk_saveWorkoutToHealth } from "../ducks/thunks";
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
  Progress_getNextSupersetEntry,
} from "../models/progress";
import { IconPlus2 } from "./icons/iconPlus2";
import { WorkoutExercise } from "./workoutExercise";
import { WorkoutExercisePager } from "./workoutExercisePager";
import { Scroller, IScrollerHandle } from "./scroller";
import { WorkoutExerciseThumbnail } from "./workoutExerciseThumbnail";
import { IconShare } from "./icons/iconShare";
import { Markdown } from "./markdown";
import { DraggableList2 } from "./draggableList2";
import { LinkButton } from "./linkButton";
import { Button } from "./button";
import { navigationRef } from "../navigation/navigationRef";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../lib/healthSync";
import { SendMessage_isIos } from "../utils/sendMessage";
import { History_calories, History_pauseWorkout } from "../models/history";
import { NativeWorkoutBridge_finishWorkout, NativeWorkoutBridge_pauseWorkout } from "../utils/nativeWorkoutBridge";
import { NativeWatchBridge_sendFinishWorkoutToWatch } from "../utils/nativeWatchBridge";
import { NativeWorkoutMirroring_resetWatchWorkoutState } from "../utils/nativeWorkoutMirroringBridge";
import { Dialog_confirm } from "../utils/dialog";
import { useEqual } from "../utils/useEqual";
import { NavScreenContent } from "../navigation/NavScreenContent";

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

function WorkoutInner(props: IWorkoutViewProps): JSX.Element {
  const selectedEntry = props.progress.entries[props.progress.ui?.currentEntryIndex ?? 0];
  const description = props.programDay?.description;
  const forceUpdateEntryIndex = !!props.progress.ui?.forceUpdateEntryIndex;
  const { width: windowWidth } = useWindowDimensions();
  const currentEntryIndex = props.progress.ui?.currentEntryIndex ?? 0;
  const [enableReorder, setEnableReorder] = useState(false);

  const [renderedIndices, setRenderedIndices] = useState<ReadonlySet<number>>(() => {
    const s = new Set<number>();
    for (let i = Math.max(0, currentEntryIndex - 1); i <= currentEntryIndex + 1; i++) {
      s.add(i);
    }
    return s;
  });
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const onPageLayout = useCallback((entryIndex: number, height: number) => {
    if (height <= 0) {
      return;
    }
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
    if (props.program && Program_isEmpty(props.program) && props.progress.entries.length === 0) {
      updateState(
        props.dispatch,
        [Progress_lbProgress(props.progress.id).pi("ui", {}).p("exercisePicker").record({})],
        "Open exercise picker on empty program"
      );
    }
  }, []);

  const dispatch = props.dispatch;
  const isExternal = !!props.progress.ui?.isExternal;

  const onPagerIndexChange = useCallback(
    (selectedIndex: number): void => {
      if (selectedIndex === currentEntryIndex) {
        return;
      }
      if (!isExternal) {
        updateProgress(
          dispatch,
          lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(selectedIndex),
          "scroll-exercise-tab"
        );
      } else {
        updateProgress(
          dispatch,
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
    },
    [dispatch, currentEntryIndex, isExternal]
  );

  const onClickThumbnail = useCallback(
    (entryIndex: number) => {
      updateProgress(
        dispatch,
        [
          lb<IHistoryRecord>().pi("ui", {}).p("currentEntryIndex").record(entryIndex),
          lb<IHistoryRecord>()
            .pi("ui", {})
            .p("forceUpdateEntryIndex")
            .recordModify((v) => !v),
        ],
        "click-exercise-tab"
      );
    },
    [dispatch]
  );

  const progressId = props.progress.id;
  const onConvertToProgram = useCallback(() => {
    navigationRef.navigate("dayFromAdhocModal", { progressId });
  }, [progressId]);

  const onToggleReorder = useCallback(() => {
    setEnableReorder((v) => !v);
  }, []);

  const otherStates = props.program?.states;
  const progressEntries = props.progress.entries;
  const supersetByEntryId = useMemo(() => {
    const map = new Map<string, IHistoryEntry | undefined>();
    for (const entry of progressEntries) {
      map.set(entry.id, Progress_getNextSupersetEntry(progressEntries, entry));
    }
    return map;
  }, [progressEntries]);
  const isCurrentProgress = Progress_isCurrent(props.progress);
  const progressStartTime = props.progress.startTime;
  const progressUserPromptedStateVars = props.progress.userPromptedStateVars;
  const progressDay = props.progress.day;

  return (
    <NavScreenContent stickyHeaderIndices={[2]}>
      <WorkoutHeader
        description={description}
        progress={props.progress}
        settings={props.settings}
        allPrograms={props.allPrograms}
        dispatch={props.dispatch}
        program={props.program}
        onConvertToProgram={onConvertToProgram}
        onShare={props.onShare}
      />
      <View className="items-end mr-2">
        <LinkButton className="px-2 py-1 text-xs" name="reorder-workout-exercises" onClick={onToggleReorder}>
          {enableReorder ? "Finish Reordering" : "Reorder Exercises"}
        </LinkButton>
      </View>
      <WorkoutThumbnailsStrip
        progress={props.progress}
        dispatch={props.dispatch}
        settings={props.settings}
        enableReorder={enableReorder}
        onClick={onClickThumbnail}
      />
      <View className="pb-8">
        {selectedEntry != null && (
          <View className="mt-2">
            <WorkoutExercisePager
              currentEntryIndex={currentEntryIndex}
              entryCount={progressEntries.length}
              windowWidth={windowWidth}
              pageHeight={pagerHeight}
              forceUpdateEntryIndex={forceUpdateEntryIndex}
              onIndexChange={onPagerIndexChange}
            >
              {progressEntries.map((entry, entryIndex) => (
                <WorkoutExercisePage
                  key={entry.id}
                  entry={entry}
                  entryIndex={entryIndex}
                  shouldRender={renderedIndices.has(entryIndex)}
                  windowWidth={windowWidth}
                  onPageLayout={onPageLayout}
                  day={progressDay}
                  stats={props.stats}
                  history={props.history}
                  otherStates={otherStates}
                  program={props.program}
                  programDay={props.programDay}
                  progressId={progressId}
                  progressStartTime={progressStartTime}
                  userPromptedStateVars={progressUserPromptedStateVars}
                  supersetEntry={supersetByEntryId.get(entry.id)}
                  isCurrentProgress={isCurrentProgress}
                  helps={props.helps}
                  subscription={props.subscription}
                  settings={props.settings}
                  dispatch={dispatch}
                />
              ))}
            </WorkoutExercisePager>
          </View>
        )}
      </View>
    </NavScreenContent>
  );
}

export const Workout = memo(WorkoutInner);

interface IWorkoutExercisePageProps {
  entry: IHistoryEntry;
  entryIndex: number;
  shouldRender: boolean;
  windowWidth: number;
  onPageLayout: (entryIndex: number, height: number) => void;
  day: number;
  stats: IStats;
  history: IHistoryRecord[];
  otherStates: IEvaluatedProgram["states"] | undefined;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  progressId: number;
  progressStartTime: number;
  userPromptedStateVars?: Partial<Record<string, IProgramState>>;
  supersetEntry?: IHistoryEntry;
  isCurrentProgress: boolean;
  helps: string[];
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

function WorkoutExercisePageInner(props: IWorkoutExercisePageProps): JSX.Element {
  const { entryIndex, onPageLayout } = props;
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => onPageLayout(entryIndex, e.nativeEvent.layout.height),
    [entryIndex, onPageLayout]
  );
  const pageStyle =
    Platform.OS === "web"
      ? ({ width: props.windowWidth, transform: "translateZ(0)" } as object)
      : { width: props.windowWidth };
  return (
    <View style={pageStyle}>
      <View onLayout={onLayout}>
        {props.shouldRender ? (
          <WorkoutExercise
            day={props.day}
            stats={props.stats}
            history={props.history}
            otherStates={props.otherStates}
            entryIndex={props.entryIndex}
            program={props.program}
            programDay={props.programDay}
            progressId={props.progressId}
            progressStartTime={props.progressStartTime}
            userPromptedStateVars={props.userPromptedStateVars}
            supersetEntry={props.supersetEntry}
            isCurrentProgress={props.isCurrentProgress}
            showHelp={true}
            helps={props.helps}
            entry={props.entry}
            subscription={props.subscription}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        ) : null}
      </View>
    </View>
  );
}

const WorkoutExercisePage = memo(WorkoutExercisePageInner);

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

function WorkoutHeaderInner(props: IWorkoutHeaderProps): JSX.Element {
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
    NativeWorkoutBridge_pauseWorkout();
    props.dispatch(Thunk_finishProgramDay());
    if (Progress_isCurrent(props.progress)) {
      props.dispatch(Thunk_postevent("finish-workout", { workout: JSON.stringify(props.progress) }));
      const isIos = Platform.OS === "ios" || SendMessage_isIos();
      const healthName = isIos ? "Apple Health" : "Google Health";
      const isHealthEligible =
        (HealthSync_eligibleForAppleHealth() && props.settings.appleHealthSyncWorkout) ||
        (HealthSync_eligibleForGoogleHealth() && props.settings.googleHealthSyncWorkout);
      const shouldSyncToHealth =
        isHealthEligible &&
        (!props.settings.healthConfirmation ||
          (await Dialog_confirm(`Do you want to sync this workout to ${healthName}?`)));
      const rawIntervals = History_pauseWorkout(props.progress.intervals) ?? [];
      const intervals: [number, number | null][] = rawIntervals.map(([s, e]) => [s, e ?? null]);
      NativeWorkoutBridge_finishWorkout({
        healthSync: !!shouldSyncToHealth,
        calories: History_calories(props.progress),
        intervals: JSON.stringify(intervals),
      });
      const watchSaved = shouldSyncToHealth ? await NativeWatchBridge_sendFinishWorkoutToWatch() : false;
      NativeWorkoutMirroring_resetWatchWorkoutState();
      if (shouldSyncToHealth && !watchSaved) {
        const validIntervals = intervals.filter((i): i is [number, number] => i[1] != null);
        const startMs = validIntervals[0]?.[0] ?? props.progress.startTime;
        const endMs = validIntervals[validIntervals.length - 1]?.[1] ?? Date.now();
        props.dispatch(
          Thunk_saveWorkoutToHealth({
            startMs,
            endMs,
            calories: History_calories(props.progress),
            intervals,
          })
        );
      } else if (watchSaved) {
        props.dispatch(Thunk_postevent("skipped-phone-health-sync-watch-saved"));
      }
    }
  };

  return (
    <View className="px-4">
      <View className="flex-row gap-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold">{props.progress?.dayName}</Text>
          <Text data-testid="day-name" testID="day-name" className="text-sm text-text-secondary">
            {props.progress?.programName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {isEligibleForProgramDay && (
            <Button
              kind="purple"
              buttonSize="md"
              data-testid="save-to-program"
              testID="save-to-program"
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
            data-testid="finish-workout"
            testID="finish-workout"
            className={Progress_isCurrent(props.progress) ? "ls-finish-workout" : "ls-save-history-record"}
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
          data-testid="workout-notes-input"
          testID="workout-notes-input"
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

const WorkoutHeader = memo(WorkoutHeaderInner);

interface IWorkoutThumbnailsStripProps {
  progress: IHistoryRecord;
  onClick: (index: number) => void;
  dispatch: IDispatch;
  settings: ISettings;
  enableReorder: boolean;
}

function WorkoutThumbnailsStripInner(props: IWorkoutThumbnailsStripProps): JSX.Element {
  const { enableReorder, onClick, dispatch } = props;
  const progressId = props.progress.id;
  const colorToSupersetGroup = useEqual(
    useMemo(() => Progress_getColorToSupersetGroup(props.progress), [props.progress])
  );
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

  const onAddExercise = useCallback(() => {
    updateState(
      dispatch,
      [
        Progress_lbProgress(progressId)
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
  }, [dispatch, progressId]);

  const onDragEnd = useCallback(
    (startIndex: number, endIndex: number) => {
      updateProgress(
        dispatch,
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
        onClick(endIndex);
      }, 0);
    },
    [dispatch, onClick]
  );
  return (
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
                  onSelect={onClick}
                  disabled={enableReorder}
                  shouldShowProgress={true}
                  isCurrent={entryIndex === currentEntryIndex}
                  currentSuperset={currentSuperset}
                  settings={props.settings}
                  entry={entry}
                  entryIndex={entryIndex}
                />
              );
              return enableReorder ? dragHandle(thumbnail) : thumbnail;
            }}
            onDragEnd={onDragEnd}
          />
          <Pressable
            testID="add-exercise-button"
            data-testid="add-exercise-button"
            className="p-2"
            onPress={onAddExercise}
          >
            <IconPlus2 size={15} color={Tailwind_colors().lightgray[600]} />
          </Pressable>
        </View>
      </Scroller>
    </View>
  );
}

const WorkoutThumbnailsStrip = memo(WorkoutThumbnailsStripInner);
