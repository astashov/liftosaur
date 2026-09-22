import {
  JSX,
  ReactNode,
  memo,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  useWindowDimensions,
  Animated as RNAnimated,
} from "react-native";
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Pressable as StickyPressable } from "./primitives/pressable";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  IHistoryEntry,
  IHistoryRecord,
  IHistoryRecordChange,
  IProgram,
  IProgramState,
  ISettings,
  IStats,
  ISubscription,
} from "../types";
import { updateProgress, updateState } from "../models/state";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program_isEmpty } from "../models/program";
import { lb } from "lens-shmens";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { TextareaAutogrow } from "./textareaAutogrow";
import {
  Progress_lbProgress,
  Progress_isCurrent,
  Progress_editNotes,
  Progress_getColorToSupersetGroup,
  Progress_getNextSupersetEntry,
} from "../models/progress";
import { IconPlus2 } from "./icons/iconPlus2";
import { History_buildPrevExerciseData, IPrevExerciseData } from "../models/history";
import { Exercise_get, Exercise_nameWithEquipment, Exercise_toKey } from "../models/exercise";
import {
  IWorkoutStripLabelFadeRange,
  WorkoutStripLabel_fadeRange,
  WorkoutStripLabel_shadowRange,
} from "../utils/workoutStripLabel";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";
import { WorkoutExercise } from "./workoutExercise";
import { WorkoutExercisePager } from "./workoutExercisePager";
import { Scroller, IScrollerHandle } from "./scroller";
import { WorkoutExerciseThumbnail } from "./workoutExerciseThumbnail";
import { Markdown } from "./markdown";
import { GridDragHandle } from "./editProgram/editProgramGrid/gridDragHandle";
import { IGridDragSession, useGridDragSession } from "./editProgram/editProgramGrid/useGridDragSession";
import { useGridDragAutoScroll } from "./editProgram/editProgramGrid/gridDragAutoScroll";
import {
  WorkoutStripReorder_apply,
  WorkoutStripReorder_dropIndex,
  WorkoutStripReorder_shift,
  WorkoutStripReorder_slots,
} from "../utils/workoutStripReorder";
import { WorkoutHints_isLearned } from "../utils/workoutHints";
import { WorkoutHints_recordUseInState } from "../utils/workoutHintsDispatch";
import { useRem } from "../utils/useRem";
import { useEqual } from "../utils/useEqual";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { PerfProbeSubtree } from "../utils/perfProbeSubtree";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useTrackClick } from "../utils/clickTracking";
import { WorkoutTabStopContext } from "./workoutTabStopContext";
import { IWorkoutProgressView } from "../utils/workoutProgressView";
import { WorkoutPagerHeightContext } from "./workoutPagerHeightContext";
import {
  useFocusExpandedSet,
  WorkoutCenterExpandedRow,
  WorkoutExpandedRowsContext,
  WorkoutFocusExpandedSetContext,
} from "./workoutCenterExpandedRow";

interface IWorkoutViewProps {
  history: IHistoryRecord[];
  progress: IWorkoutProgressView;
  allPrograms: IProgram[];
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  helps: string[];
  stats: IStats;
  isTimerShown: boolean;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  renderHeaderMenu?: (onOpenChange: (isOpen: boolean) => void) => ReactNode;
}

function WorkoutInner(props: IWorkoutViewProps): JSX.Element {
  usePerfRenderCount("Workout");
  const selectedEntry = props.progress.entries[props.progress.currentEntryIndex ?? 0];
  const description = props.programDay?.description;
  const forceUpdateEntryIndex = props.progress.forceUpdateEntryIndex;
  const { width: windowWidth } = useWindowDimensions();
  const currentEntryIndex = props.progress.currentEntryIndex ?? 0;
  const trackClick = useTrackClick();

  const [renderedIndices, setRenderedIndices] = useState<ReadonlySet<number>>(() => {
    const s = new Set<number>();
    for (let i = Math.max(0, currentEntryIndex - 1); i <= currentEntryIndex + 1; i++) {
      s.add(i);
    }
    return s;
  });
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
  const isExternal = props.progress.isExternal;

  const onPagerIndexChange = useCallback(
    (selectedIndex: number): void => {
      if (selectedIndex === currentEntryIndex) {
        return;
      }
      if (!isExternal) {
        updateProgress(
          dispatch,
          lb<IHistoryRecord>().p("currentEntryIndex").record(selectedIndex),
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
      trackClick("workout-tab-thumbnail", undefined, { from: currentEntryIndex, to: entryIndex });
      updateProgress(
        dispatch,
        [
          lb<IHistoryRecord>().p("currentEntryIndex").record(entryIndex),
          lb<IHistoryRecord>()
            .pi("ui", {})
            .p("forceUpdateEntryIndex")
            .recordModify((v) => !v),
        ],
        "click-exercise-tab"
      );
    },
    [dispatch, trackClick, currentEntryIndex]
  );

  const onPagerSettled = useCallback(
    (settledIndex: number) => {
      trackClick("workout-swipe-exercise", undefined, { to: settledIndex });
    },
    [trackClick]
  );

  const impressionsSeenRef = useRef<Set<string>>(new Set());
  const [expandedRows] = useState(() => new Map<number, View>());
  const focusExpandedSet = useFocusExpandedSet(expandedRows, currentEntryIndex);

  const progressId = props.progress.id;
  const otherStates = props.program?.states;
  const progressEntries = props.progress.entries;
  const supersetByEntryId = useMemo(() => {
    const map = new Map<string, IHistoryEntry | undefined>();
    for (const entry of progressEntries) {
      map.set(entry.id, Progress_getNextSupersetEntry(progressEntries, entry));
    }
    return map;
  }, [progressEntries]);
  // Build the "previous workout" lookup for every exercise once, here, instead of letting each
  // exercise card scan the whole history on its own mount frame (the dominant workout-screen mount
  // jank for large histories). Keyed on history identity, so it survives set completions.
  const { programId, day, week, dayInWeek } = props.progress;
  const sameDay = useMemo(() => ({ programId, day, week, dayInWeek }), [programId, day, week, dayInWeek]);
  // A string keeps its identity when a set completion rebuilds `entries` with the same exercises.
  const exerciseKeysJoined = progressEntries.map((entry) => Exercise_toKey(entry.exercise)).join("\n");
  const exerciseKeys = useMemo(() => new Set(exerciseKeysJoined.split("\n")), [exerciseKeysJoined]);
  const prevExerciseData = useMemo(
    () => History_buildPrevExerciseData(props.history, props.progress.startTime, sameDay, exerciseKeys),
    [props.history, props.progress.startTime, sameDay, exerciseKeys]
  );
  const isCurrentProgress = Progress_isCurrent(props.progress);
  const titleNodeRef = useRef<View | null>(null);
  const [titleLayoutNonce, setTitleLayoutNonce] = useState(0);
  const onTitleLayout = useCallback((title: View) => {
    titleNodeRef.current = title;
    setTitleLayoutNonce((n) => n + 1);
  }, []);
  const [pagerContainerTop, setPagerContainerTop] = useState(0);
  const pagerContainerTopRef = useRef(0);
  const onPagerContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const top = e.nativeEvent.layout.y;
    if (pagerContainerTopRef.current === top) {
      return;
    }
    pagerContainerTopRef.current = top;
    setPagerContainerTop(top);
    setTitleLayoutNonce((n) => n + 1);
  }, []);
  const selectedExerciseName =
    selectedEntry != null
      ? Exercise_nameWithEquipment(Exercise_get(selectedEntry.exercise, props.settings.exercises), props.settings)
      : "";
  const progressStartTime = props.progress.startTime;
  const progressUserPromptedStateVars = props.progress.userPromptedStateVars;
  const progressDay = props.progress.day;
  const showReorderHint = props.progress.entries.length > 1 && !WorkoutHints_isLearned(props.helps, "workout-reorder");

  return (
    <WorkoutExpandedRowsContext.Provider value={expandedRows}>
      <WorkoutFocusExpandedSetContext.Provider value={focusExpandedSet}>
        <NavScreenContent stickyHeaderIndices={[2]}>
          <WorkoutHeader
            description={description}
            progress={props.progress}
            dispatch={props.dispatch}
            showNotes={!!props.settings.workoutSettings.showWorkoutNotes}
            renderMenu={props.renderHeaderMenu}
          />
          <View>
            {showReorderHint && (
              <Text className="px-4 pt-1 text-xs text-text-secondary" testID="workout-reorder-hint">
                Long-tap a thumbnail to reorder
              </Text>
            )}
          </View>
          <WorkoutThumbnailsStrip
            progress={props.progress}
            dispatch={props.dispatch}
            settings={props.settings}
            subscription={props.subscription}
            helps={props.helps}
            onClick={onClickThumbnail}
            label={selectedExerciseName}
            titleNodeRef={titleNodeRef}
            titleLayoutNonce={titleLayoutNonce}
            pagerContainerTop={pagerContainerTop}
          />
          <View className="pb-8" onLayout={onPagerContainerLayout}>
            <WorkoutCenterExpandedRow
              pageChangeToggle={forceUpdateEntryIndex}
              entryIndex={currentEntryIndex}
              entryId={selectedEntry?.id}
            />
            {selectedEntry != null && (
              <View className="mt-2">
                <PerfProbeSubtree id="workout-list">
                  <WorkoutExercisePager
                    currentEntryIndex={currentEntryIndex}
                    currentEntryId={selectedEntry.id}
                    entryCount={progressEntries.length}
                    windowWidth={windowWidth}
                    forceUpdateEntryIndex={forceUpdateEntryIndex}
                    onIndexChange={onPagerIndexChange}
                    onSettledIndex={onPagerSettled}
                  >
                    {progressEntries.map((entry, entryIndex) => (
                      <WorkoutExercisePage
                        key={entry.id}
                        entry={entry}
                        entryIndex={entryIndex}
                        isCurrentPage={entryIndex === currentEntryIndex}
                        tabStopIndex={entryIndex < currentEntryIndex ? -1 : 0}
                        impressionsSeenRef={impressionsSeenRef}
                        shouldRender={renderedIndices.has(entryIndex)}
                        windowWidth={windowWidth}
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
                        prevData={prevExerciseData[Exercise_toKey(entry.exercise)]}
                        isCurrentProgress={isCurrentProgress}
                        helps={props.helps}
                        subscription={props.subscription}
                        settings={props.settings}
                        dispatch={dispatch}
                        onTitleLayout={onTitleLayout}
                      />
                    ))}
                  </WorkoutExercisePager>
                </PerfProbeSubtree>
              </View>
            )}
          </View>
        </NavScreenContent>
      </WorkoutFocusExpandedSetContext.Provider>
    </WorkoutExpandedRowsContext.Provider>
  );
}

export const Workout = memo(WorkoutInner);

interface IWorkoutExercisePageProps {
  entry: IHistoryEntry;
  entryIndex: number;
  isCurrentPage: boolean;
  tabStopIndex: 0 | -1;
  impressionsSeenRef: MutableRefObject<Set<string>>;
  shouldRender: boolean;
  windowWidth: number;
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
  prevData?: IPrevExerciseData;
  isCurrentProgress: boolean;
  helps: string[];
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  onTitleLayout?: (title: View) => void;
}

function WorkoutExercisePageInner(props: IWorkoutExercisePageProps): JSX.Element {
  usePerfRenderCount("WorkoutExercisePage");
  const { entryIndex } = props;
  const reportPageHeight = useContext(WorkoutPagerHeightContext);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => reportPageHeight?.(entryIndex, e.nativeEvent.layout.height),
    [entryIndex, reportPageHeight]
  );
  const pageStyle =
    Platform.OS === "web"
      ? ({ width: props.windowWidth, transform: "translateZ(0)" } as object)
      : { width: props.windowWidth };
  return (
    <View style={pageStyle}>
      <View onLayout={reportPageHeight ? onLayout : undefined}>
        {props.shouldRender ? (
          <WorkoutTabStopContext.Provider value={props.tabStopIndex}>
            <WorkoutExercise
              day={props.day}
              stats={props.stats}
              history={props.history}
              otherStates={props.otherStates}
              entryIndex={props.entryIndex}
              isCurrentPage={props.isCurrentPage}
              impressionsSeenRef={props.impressionsSeenRef}
              program={props.program}
              programDay={props.programDay}
              progressId={props.progressId}
              progressStartTime={props.progressStartTime}
              userPromptedStateVars={props.userPromptedStateVars}
              supersetEntry={props.supersetEntry}
              prevData={props.prevData}
              isCurrentProgress={props.isCurrentProgress}
              showHelp={true}
              helps={props.helps}
              entry={props.entry}
              subscription={props.subscription}
              settings={props.settings}
              dispatch={props.dispatch}
              onTitleLayout={props.isCurrentPage ? props.onTitleLayout : undefined}
            />
          </WorkoutTabStopContext.Provider>
        ) : null}
      </View>
    </View>
  );
}

const WorkoutExercisePage = memo(WorkoutExercisePageInner);

interface IWorkoutHeaderProps {
  progress: IWorkoutProgressView;
  dispatch: IDispatch;
  description?: string;
  showNotes: boolean;
  renderMenu?: (onOpenChange: (isOpen: boolean) => void) => ReactNode;
}

function WorkoutHeaderInner(props: IWorkoutHeaderProps): JSX.Element {
  usePerfRenderCount("WorkoutHeader");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menu = props.renderMenu?.(setIsMenuOpen);
  return (
    <View className="px-4" style={Platform.OS === "web" && isMenuOpen ? { zIndex: 50 } : undefined}>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-semibold">{props.progress?.dayName}</Text>
          <Text data-testid="day-name" testID="day-name" className="text-sm text-text-secondary">
            {props.progress?.programName}
          </Text>
        </View>
        {menu != null && <View className="-mr-2">{menu}</View>}
      </View>
      {props.description && (
        <View className={`mt-1 ${props.progress.notes ? "border-b border-background-subtle mb-1 pb-1" : ""}`}>
          <Markdown value={props.description} />
        </View>
      )}
      {props.showNotes && (
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
      )}
    </View>
  );
}

const WorkoutHeader = memo(WorkoutHeaderInner);

interface IWorkoutThumbnailsStripProps {
  progress: IWorkoutProgressView;
  onClick: (index: number) => void;
  dispatch: IDispatch;
  settings: ISettings;
  subscription: ISubscription;
  helps: string[];
  label: string;
  titleNodeRef: MutableRefObject<View | null>;
  titleLayoutNonce: number;
  pagerContainerTop: number;
}

interface IWorkoutStripTileProps {
  index: number;
  entry: IHistoryEntry;
  colorToSupersetGroup: Partial<Record<string, IHistoryEntry[]>>;
  isCurrent: boolean;
  currentSuperset?: string;
  settings: ISettings;
  onSelect: (index: number) => void;
  session: IGridDragSession;
  originRef: MutableRefObject<number>;
  slots: SharedValue<Record<string, number>>;
  dragId: SharedValue<string>;
  originSlot: SharedValue<number>;
  dropSlot: SharedValue<number>;
  dragTranslation: SharedValue<number>;
  isSettling: SharedValue<boolean>;
  pitch: number;
  isDragging: boolean;
  onMeasure: (e: LayoutChangeEvent) => void;
}

const DRAGGING_TILE_SCALE = 1.12;
const TILE_MOVE_MS = 120;

// Why tiles are absolutely positioned from a slot map: lambda/scripts/archdocs/workout-screen.md,
// "Strip reorder".
function WorkoutStripTileInner(props: IWorkoutStripTileProps): JSX.Element {
  const { index, session, originRef, slots, dragId, originSlot, dropSlot, dragTranslation, pitch, onSelect } = props;
  const { isSettling } = props;
  const id = props.entry.id;
  const onDragStart = useCallback(
    (absolute: number) => {
      originRef.current = index;
      originSlot.value = index;
      dragId.value = id;
      session.onDragStart(absolute);
    },
    [index, id, session, originRef, originSlot, dragId]
  );
  const onTap = useCallback(() => onSelect(index), [onSelect, index]);
  const style = useAnimatedStyle(() => {
    const isActive = dragId.value === id;
    const slot = slots.value[id] ?? index;
    const rest = slot * pitch + WorkoutStripReorder_shift(slot, originSlot.value, dropSlot.value, pitch);
    const isMoving = dragId.value !== "" || isSettling.value;
    let translateX: number;
    if (isActive) {
      translateX = originSlot.value * pitch + dragTranslation.value;
    } else if (isMoving) {
      translateX = withTiming(rest, { duration: TILE_MOVE_MS }, (finished) => {
        if (finished) {
          isSettling.value = false;
        }
      });
    } else {
      translateX = rest;
    }
    return {
      transform: [
        { translateX },
        { scale: withTiming(isActive ? DRAGGING_TILE_SCALE : 1, { duration: TILE_MOVE_MS }) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, zIndex: props.isDragging ? 10 : 0 }, style]}>
      <GridDragHandle
        axis="x"
        onDragStart={onDragStart}
        onDragMove={session.onDragMove}
        onDragEnd={session.onDragEnd}
        onTap={onTap}
      >
        <View onLayout={props.onMeasure}>
          <WorkoutExerciseThumbnail
            colorToSupersetGroup={props.colorToSupersetGroup}
            shouldShowProgress={true}
            isCurrent={props.isCurrent}
            currentSuperset={props.currentSuperset}
            settings={props.settings}
            entry={props.entry}
            entryIndex={index}
          />
        </View>
      </GridDragHandle>
    </Animated.View>
  );
}

const WorkoutStripTile = memo(WorkoutStripTileInner);

function WorkoutThumbnailsStripInner(props: IWorkoutThumbnailsStripProps): JSX.Element {
  usePerfRenderCount("WorkoutThumbnailsStrip");
  const trackClick = useTrackClick();
  const { onClick, dispatch, helps, titleNodeRef, titleLayoutNonce } = props;
  const scrollCtx = useContext(NavScreenScrollContext);
  const scrollAnimatedY = scrollCtx?.scrollAnimatedY;
  const stickyHeaderHeight = scrollCtx?.stickyHeaderHeight ?? 0;
  const currentEntryIndexForLabel = props.progress.currentEntryIndex ?? 0;
  const [labelFadeRange, setLabelFadeRange] = useState<IWorkoutStripLabelFadeRange | undefined>(undefined);
  useEffect(() => {
    const title = titleNodeRef.current;
    const viewport = scrollCtx?.viewportRef.current;
    if (title == null || viewport == null) {
      return;
    }
    title.measureInWindow((_tx, titleWindowTop, _tw, titleHeight) => {
      viewport.measureInWindow((_vx, viewportWindowTop) => {
        setLabelFadeRange(
          WorkoutStripLabel_fadeRange({
            titleWindowTop,
            titleHeight,
            viewportWindowTop,
            scrollY: scrollCtx?.scrollYRef.current ?? 0,
            stripHeight: stickyHeaderHeight,
          })
        );
      });
    });
  }, [scrollCtx, titleNodeRef, titleLayoutNonce, currentEntryIndexForLabel, stickyHeaderHeight]);
  const labelOpacity = useMemo(
    () =>
      scrollAnimatedY != null && labelFadeRange != null
        ? scrollAnimatedY.interpolate({
            inputRange: [labelFadeRange.start, labelFadeRange.end],
            outputRange: [0, 1],
            extrapolate: "clamp",
          })
        : 0,
    [scrollAnimatedY, labelFadeRange]
  );
  const shadowRange = WorkoutStripLabel_shadowRange(props.pagerContainerTop, stickyHeaderHeight);
  const shadowOpacity = useMemo(
    () =>
      scrollAnimatedY != null
        ? scrollAnimatedY.interpolate({
            inputRange: [shadowRange.start, shadowRange.end],
            outputRange: [0, 1],
            extrapolate: "clamp",
          })
        : 0,
    [scrollAnimatedY, shadowRange.start, shadowRange.end]
  );
  const progressId = props.progress.id;
  const colorToSupersetGroup = useEqual(
    useMemo(() => Progress_getColorToSupersetGroup(props.progress), [props.progress])
  );
  const currentEntryIndex = props.progress.currentEntryIndex ?? 0;
  const currentEntry = props.progress.entries[currentEntryIndex];
  const currentSuperset = currentEntry?.superset;
  const thumbScrollerRef = useRef<IScrollerHandle>(null);
  const remValue = useRem();

  const scrollViewRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const horizontalOffsetRef = useRef(0);
  const contentWidthRef = useRef(0);
  const viewportWidthRef = useRef(0);
  const maxHorizontalScroll = useCallback(() => Math.max(0, contentWidthRef.current - viewportWidthRef.current), []);
  const autoScroll = useGridDragAutoScroll({
    horizontalRef: scrollViewRef,
    horizontalViewportRef: viewportRef,
    horizontalOffsetRef,
    maxHorizontalScroll,
  });
  const slots = useSharedValue<Record<string, number>>({});
  const dragId = useSharedValue("");
  const originSlot = useSharedValue(-1);
  const dropSlot = useSharedValue(-1);
  const dragTranslation = useSharedValue(0);
  const isSettling = useSharedValue(false);
  const originRef = useRef(-1);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [tileBox, setTileBox] = useState<{ width: number; height: number } | undefined>(undefined);
  const gap = Math.round(remValue / 4);
  const pitch = (tileBox?.width ?? 4 * remValue + 2) + gap;
  const stripHeight = tileBox?.height ?? 4 * remValue + 2;
  const pitchRef = useRef(pitch);
  pitchRef.current = pitch;
  const entryIds = props.progress.entries.map((e) => e.id);
  const entryIdsRef = useRef(entryIds);
  entryIdsRef.current = entryIds;
  const entryOrderKey = entryIds.join(",");
  useEffect(() => {
    slots.value = WorkoutStripReorder_slots(entryIdsRef.current);
  }, [entryOrderKey, slots]);
  const countRef = useRef(props.progress.entries.length);
  countRef.current = props.progress.entries.length;
  const onMeasureTile = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTileBox((prev) =>
      prev != null && prev.width === width && prev.height >= height
        ? prev
        : { width, height: Math.max(prev?.height ?? 0, height) }
    );
  }, []);

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
    trackClick("workout-add-exercise-button");
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
  }, [dispatch, progressId, trackClick]);

  const commitReorder = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex < 0 || startIndex === endIndex) {
        return;
      }
      trackClick("workout-reorder-drag");
      updateProgress(
        dispatch,
        [
          lb<IHistoryRecord>().recordModify((progress) => {
            const moved = WorkoutStripReorder_apply(
              progress.entries,
              progress.currentEntryIndex ?? 0,
              startIndex,
              endIndex
            );
            if (moved == null) {
              return progress;
            }
            const changes: IHistoryRecordChange[] = Array.from(
              new Set([...(progress.changes || []), "order" as const])
            );
            return {
              ...progress,
              entries: moved.entries,
              currentEntryIndex: moved.currentEntryIndex,
              changes,
              ui: { ...progress.ui, forceUpdateEntryIndex: !progress.ui?.forceUpdateEntryIndex },
            };
          }),
        ],
        "drag-exercise-tab"
      );
      WorkoutHints_recordUseInState(dispatch, helps, "workout-reorder");
    },
    [dispatch, trackClick, helps]
  );
  const session = useGridDragSession<number>({
    axis: "x",
    autoScroll,
    resolve: (translation) =>
      WorkoutStripReorder_dropIndex(originRef.current, translation, pitchRef.current, countRef.current),
    show: (target, translation) => {
      if (target != null) {
        dropSlot.value = target;
        dragTranslation.value = translation;
      }
    },
    commit: (target) => {
      slots.value = WorkoutStripReorder_slots(entryIdsRef.current, originRef.current, target);
      commitReorder(originRef.current, target);
    },
    onActive: (active) => {
      setDraggingIndex(active ? originRef.current : -1);
      if (!active) {
        isSettling.value = true;
        dragId.value = "";
        originSlot.value = -1;
        dropSlot.value = -1;
        dragTranslation.value = 0;
      }
    },
  });
  return (
    <View collapsable={false} className="bg-background-default">
      <Scroller
        ref={thumbScrollerRef}
        scrollViewRef={scrollViewRef}
        viewportRef={viewportRef}
        onScroll={(e) => {
          horizontalOffsetRef.current = e.nativeEvent.contentOffset.x;
        }}
        onContentSizeChange={(width) => {
          contentWidthRef.current = width;
        }}
        onLayout={(e) => {
          viewportWidthRef.current = e.nativeEvent.layout.width;
        }}
      >
        <View className="flex-row items-center px-4 py-1" style={{ gap }}>
          <View style={{ width: Math.max(0, props.progress.entries.length * pitch - gap), height: stripHeight }}>
            {props.progress.entries.map((entry, entryIndex) => (
              <WorkoutStripTile
                key={entry.id}
                index={entryIndex}
                entry={entry}
                colorToSupersetGroup={colorToSupersetGroup}
                isCurrent={entryIndex === currentEntryIndex}
                isDragging={entryIndex === draggingIndex}
                currentSuperset={currentSuperset}
                settings={props.settings}
                onSelect={onClick}
                session={session}
                originRef={originRef}
                slots={slots}
                dragId={dragId}
                originSlot={originSlot}
                dropSlot={dropSlot}
                dragTranslation={dragTranslation}
                isSettling={isSettling}
                pitch={pitch}
                onMeasure={onMeasureTile}
              />
            ))}
          </View>
          <StickyPressable
            testID="add-exercise-button"
            data-testid="add-exercise-button"
            className="p-2"
            onPress={onAddExercise}
          >
            <IconPlus2 size={15} color={Tailwind_colors().lightgray[600]} />
          </StickyPressable>
        </View>
      </Scroller>
      <RNAnimated.View
        pointerEvents="none"
        style={{
          height: Math.round(1.25 * remValue) + 4,
          paddingBottom: 4,
          justifyContent: "flex-start",
          opacity: labelOpacity,
        }}
      >
        <Text numberOfLines={1} className="px-4 text-sm font-bold text-center" testID="strip-current-exercise">
          {props.label}
        </Text>
      </RNAnimated.View>
      <RNAnimated.View
        pointerEvents="none"
        style={[
          { position: "absolute", left: 0, right: 0, bottom: 0, height: 1, opacity: shadowOpacity },
          Platform.select({
            ios: {
              backgroundColor: Tailwind_semantic().background.default,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              shadowOpacity: 0.15,
            },
            android: { backgroundColor: Tailwind_semantic().background.default, elevation: 4 },
            default: { boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)" } as object,
          }),
        ]}
      />
    </View>
  );
}

const WorkoutThumbnailsStrip = memo(WorkoutThumbnailsStripInner);
