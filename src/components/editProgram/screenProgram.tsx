import { JSX, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView } from "react-native";
import { Pressable } from "../primitives/pressable";
import { Text } from "../primitives/text";
import { IDispatch } from "../../ducks/types";
import { INavCommon, IState, updateState } from "../../models/state";
import { IProgram, ISettings } from "../../types";
import { useNavOptions } from "../../navigation/useNavOptions";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { undoRedoMiddleware, useUndoRedo } from "../../pages/builder/utils/undoredo";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_dayAverageTimeMs,
  Program_daysRange,
  Program_exerciseRange,
  Program_getDayName,
} from "../../models/program";
import { StringUtils_dashcase, StringUtils_pluralize } from "../../utils/string";
import { IconCalendarSmall } from "../icons/iconCalendarSmall";
import { TimeUtils_formatHOrMin } from "../../utils/time";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { EditProgram_setName } from "../../models/editProgram";
import { EditProgramNavbar, EditProgramView } from "./editProgram";
import { ProgramPreviewPlayground } from "../preview/programPreviewPlayground";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { IconSwap } from "../icons/iconSwap";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { LinkButton } from "../linkButton";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import { IconKebab } from "../icons/iconKebab";
import { UidFactory_generateUid } from "../../utils/generator";
import { useIsFocused } from "@react-navigation/native";
import { navigateToModal, getCurrentRouteName } from "../../navigation/navigationService";
import { ProgramPreview_buildWeeks, ProgramPreviewWeekContent } from "../preview/programPreviewTab";
import { Nux } from "../nux";
import { programTourConfig } from "../tour/programTourConfig";
import { NavScreenContent } from "../../navigation/NavScreenContent";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useTimedMemo } from "../../utils/useTimedMemo";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";
import { usePerfRenderTrace } from "../../utils/usePerfRenderTrace";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "../../utils/perfTracker";
import { PerfEnabled_tier2 } from "../../utils/perfEnabled";
import { PerfProfiler } from "../../utils/perfProfiler";

function onProfile(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number
): void {
  if (!PerfEnabled_tier2()) {
    return;
  }
  if (actualDuration < 1) {
    return;
  }
  PerfTracker_recordEvent({
    type: "profile",
    session: PerfTracker_getSessionId(),
    id,
    phase,
    actual_ms: actualDuration,
    base_ms: baseDuration,
    ts: Date.now(),
  });
}

const TAB_LABELS = ["Preview", "Edit", "Playground"] as const;
const EMPTY_EVAL: ReturnType<typeof PlannerProgram_evaluate> = { evaluatedWeeks: [], exerciseFullNames: [] };
const TAB_LABELS_RO: readonly string[] = TAB_LABELS;
const PLAYGROUND_TABS_PROPS = {
  topPadding: "0.25rem",
  className: "gap-2 px-4",
  type: "squares",
} as const;

interface IProps {
  originalProgram: IProgram;
  plannerState: IPlannerState;
  helps: string[];
  client: Window["fetch"];
  dispatch: IDispatch;
  settings: ISettings;
  isLoggedIn: boolean;
  revisions: string[];
  navCommon: INavCommon;
}

export const ScreenProgram = memo(function ScreenProgram(props: IProps): JSX.Element {
  usePerfRenderCount("ScreenProgram");
  usePerfRenderTrace("ScreenProgram");
  const plannerState = props.plannerState;
  const dispatch = props.dispatch;
  const programId = props.originalProgram.id;

  const plannerStateRef = useRef(plannerState);
  plannerStateRef.current = plannerState;

  const lbBuilder = useMemo(() => lb<IState>().p("editProgramStates").p(programId), [programId]);

  const plannerDispatch = useMemo<ILensDispatch<IPlannerState>>(() => {
    const fn: ILensDispatch<IPlannerState> = (lensRecording, desc) => {
      const recordings = Array.isArray(lensRecording)
        ? (lensRecording as ILensRecordingPayload<IPlannerState>[])
        : [lensRecording as ILensRecordingPayload<IPlannerState>];
      updateState(
        dispatch,
        recordings.map((r) => r.prepend(lbBuilder)),
        desc || "Update state"
      );
      const changesCurrent = recordings.some((r) => r.lens.from.some((f) => f === "current"));
      const current = plannerStateRef.current;
      if (desc !== "undo" && changesCurrent && current != null) {
        undoRedoMiddleware(fn, current);
      }
    };
    return fn;
  }, [dispatch, lbBuilder]);

  useUndoRedo(plannerState, plannerDispatch);

  const program: IProgram = plannerState.current.program;
  const planner = program.planner!;
  const evaluatedProgram = useTimedMemo(
    "editProgram.evaluatedProgram",
    () => Program_evaluate(program, props.settings),
    [program, props.settings]
  );
  const ui = plannerState.ui;

  useLayoutEffect(() => {
    for (const week of planner.weeks) {
      week.id = week.id ?? UidFactory_generateUid(8);
      for (const day of week.days) {
        day.id = day.id ?? UidFactory_generateUid(8);
      }
    }
  }, [planner]);

  const exercisePickerUi = props.plannerState.ui.exercisePicker;
  // Open the picker modal whenever a request is set but the picker isn't actually
  // open. The route check makes this a no-op while the picker is up (so `.state`
  // mutations don't re-push), but lets us re-open if a navigation was dropped.
  const openPickerIfNeeded = useCallback(() => {
    const picker = plannerStateRef.current.ui.exercisePicker;
    if (!picker || getCurrentRouteName() === "editProgramExercisePickerModal") {
      return;
    }
    navigateToModal("editProgramExercisePickerModal", {
      context: "editProgram",
      programId,
      dayData: picker.dayData,
      change: picker.change,
      exerciseKey: picker.exerciseKey,
    });
  }, [programId]);
  const navigatedPickerRef = useRef(exercisePickerUi);
  useEffect(() => {
    if (exercisePickerUi && navigatedPickerRef.current !== exercisePickerUi) {
      openPickerIfNeeded();
    }
    navigatedPickerRef.current = exercisePickerUi;
  }, [exercisePickerUi, openPickerIfNeeded]);
  // Recover a dropped navigation: when this screen regains focus (e.g. a competing
  // modal that stole the navigation closed) and a picker request is still pending,
  // re-assert it instead of waiting for the user to tap again.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      openPickerIfNeeded();
    }
  }, [isFocused, openPickerIfNeeded]);

  const navRightButtons = useMemo(
    () => [
      <Pressable
        key="kebab"
        data-testid="navbar-3-dot"
        testID="navbar-3-dot"
        className="p-2 nm-edit-program-v2-navbar-kebab"
        onPress={() => navigateToModal("editProgramMenuModal", { programId })}
      >
        <IconKebab />
      </Pressable>,
    ],
    [programId]
  );

  const navOptions = useMemo(
    () => ({
      navTitle: "Program",
      navHelpTourId: programTourConfig.id,
      navRightButtons,
    }),
    [navRightButtons]
  );
  useNavOptions(navOptions);

  const tabIndex = plannerState.ui.tabIndex ?? 0;
  const activeTabLabel = TAB_LABELS[tabIndex] ?? "Preview";

  const plannerEval = useTimedMemo(
    "editProgram.plannerEval",
    () => (activeTabLabel === "Edit" ? PlannerProgram_evaluate(planner, props.settings) : EMPTY_EVAL),
    [activeTabLabel, planner, props.settings]
  );
  const { evaluatedWeeks, exerciseFullNames } = plannerEval;

  const onChangeTab = useCallback(
    (newTabIndex: number): void => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("tabIndex").record(newTabIndex), "Change tab");
    },
    [plannerDispatch]
  );

  const [previewWeekIndex, setPreviewWeekIndex] = useState(0);
  const [playgroundWeekIndex, setPlaygroundWeekIndex] = useState(0);
  const editWeekIndex = ui.weekIndex ?? 0;
  const setEditWeekIndex = useCallback(
    (newIndex: number): void => {
      plannerDispatch(lb<IPlannerState>().p("ui").p("weekIndex").record(newIndex), `Change week index to ${newIndex}`);
    },
    [plannerDispatch]
  );

  const previewWeeks = useTimedMemo(
    "editProgram.previewWeeks",
    () =>
      activeTabLabel === "Preview" ? ProgramPreview_buildWeeks(program, props.settings, props.navCommon.stats) : [],
    [activeTabLabel, program, props.settings, props.navCommon.stats]
  );
  const safePreviewWeekIndex = Math.min(previewWeekIndex, Math.max(0, previewWeeks.length - 1));
  const playgroundWeekNames = useMemo(
    () => (activeTabLabel === "Playground" ? evaluatedProgram.weeks.map((w) => w.name) : []),
    [activeTabLabel, evaluatedProgram]
  );
  const safePlaygroundWeekIndex = Math.min(playgroundWeekIndex, Math.max(0, playgroundWeekNames.length - 1));
  const showEditWeekTabBar =
    activeTabLabel === "Edit" && (ui.mode === "ui" || ui.mode === "perday") && planner.weeks.length > 1;

  const onChangeProgram = useCallback(() => {
    dispatch(Thunk_pushScreen("programs"));
  }, [dispatch]);
  const onChangeDay = useCallback(() => {
    navigateToModal("programNextDayModal", { programId });
  }, [programId]);
  const onChangeName = useCallback(
    (newValue: string) => {
      EditProgram_setName(dispatch, props.originalProgram, newValue);
      plannerDispatch(
        [
          lb<IPlannerState>().p("current").p("program").p("name").record(newValue),
          lb<IPlannerState>().p("current").p("program").pi("planner").p("name").record(newValue),
        ],
        "Update program name"
      );
    },
    [dispatch, plannerDispatch, props.originalProgram]
  );

  let tabContent: JSX.Element;
  if (activeTabLabel === "Preview") {
    const currentWeek = previewWeeks[safePreviewWeekIndex];
    tabContent = currentWeek ? (
      <PerfProfiler id="tab.Preview" onRender={onProfile}>
        <ProgramPreviewWeekContent
          key="preview"
          week={currentWeek}
          weekIndex={safePreviewWeekIndex}
          program={program}
          programId={programId}
          settings={props.settings}
          ui={ui}
          stats={props.navCommon.stats}
          dispatch={dispatch}
          plannerDispatch={plannerDispatch}
          totalWeeks={previewWeeks.length}
        />
      </PerfProfiler>
    ) : (
      <View />
    );
  } else if (activeTabLabel === "Edit") {
    tabContent = (
      <PerfProfiler id="tab.Edit" onRender={onProfile}>
        <EditProgramView
          hideNavbar
          hideWeekTabBar={showEditWeekTabBar}
          evaluatedWeeks={evaluatedWeeks}
          evaluatedProgram={evaluatedProgram}
          exerciseFullNames={exerciseFullNames}
          dispatch={dispatch}
          originalProgram={props.originalProgram}
          programId={programId}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
          state={plannerState}
        />
      </PerfProfiler>
    );
  } else {
    tabContent = (
      <PerfProfiler id="tab.Playground" onRender={onProfile}>
        <View className="pb-4">
          <Nux className="mx-4 my-2" id="Playground" helps={props.helps} dispatch={dispatch}>
            <Text className="text-xs">
              Playground lets you test the program logic. You can finish workouts here and see how reps, weights, sets
              change. Everything you do here is ephemeral, and doesn't change any settings, workouts or programs.
            </Text>
          </Nux>
          <ProgramPreviewPlayground
            key="playground"
            scrollableTabsProps={PLAYGROUND_TABS_PROPS}
            isPlayground={true}
            program={program}
            settings={props.settings}
            stats={props.navCommon.stats}
            useNavModals={true}
            hideWeekTabBar={true}
            externalWeekIndex={safePlaygroundWeekIndex}
          />
        </View>
      </PerfProfiler>
    );
  }

  const editWeekLabels = useMemo(() => planner.weeks.map((w) => w.name), [planner.weeks]);
  const editWeekInvalidIndices = useMemo(
    () => planner.weeks.map((_, i) => evaluatedWeeks[i]?.some((day) => !day.success) ?? false),
    [planner.weeks, evaluatedWeeks]
  );
  const previewWeekLabels = useMemo(() => previewWeeks.map((w) => w.name), [previewWeeks]);

  let perTabStickyHeader: JSX.Element;
  if (activeTabLabel === "Edit") {
    perTabStickyHeader = (
      <View className="bg-background-default">
        <EditProgramNavbar
          dispatch={dispatch}
          originalProgram={props.originalProgram}
          settings={props.settings}
          state={plannerState}
          evaluatedWeeks={evaluatedWeeks}
          plannerDispatch={plannerDispatch}
        />
        {showEditWeekTabBar && (
          <WeekTabBar
            labels={editWeekLabels}
            invalidIndices={editWeekInvalidIndices}
            activeIndex={editWeekIndex}
            onChange={setEditWeekIndex}
          />
        )}
      </View>
    );
  } else if (activeTabLabel === "Preview" && previewWeeks.length > 1) {
    perTabStickyHeader = (
      <View className="bg-background-default">
        <WeekTabBar labels={previewWeekLabels} activeIndex={safePreviewWeekIndex} onChange={setPreviewWeekIndex} />
      </View>
    );
  } else if (activeTabLabel === "Playground" && playgroundWeekNames.length > 1) {
    perTabStickyHeader = (
      <View className="bg-background-default">
        <WeekTabBar
          labels={playgroundWeekNames}
          activeIndex={safePlaygroundWeekIndex}
          onChange={setPlaygroundWeekIndex}
        />
      </View>
    );
  } else {
    perTabStickyHeader = <View className="bg-background-default" />;
  }

  return (
    <PerfProfiler id="ScreenProgram.shell" onRender={onProfile}>
      <NavScreenContent stickyHeaderIndices={STICKY_INDICES}>
        <PerfProfiler id="ScreenProgram.header" onRender={onProfile}>
          <EditProgramHeader
            evaluatedProgram={evaluatedProgram}
            settings={props.settings}
            onChangeProgram={onChangeProgram}
            onChangeDay={onChangeDay}
            onChangeName={onChangeName}
          />
        </PerfProfiler>
        <OuterTabBar labels={TAB_LABELS_RO} activeIndex={tabIndex} onChange={onChangeTab} />
        <PerfProfiler id="ScreenProgram.stickyHeader" onRender={onProfile}>
          {perTabStickyHeader}
        </PerfProfiler>
        {tabContent}
      </NavScreenContent>
    </PerfProfiler>
  );
});

const STICKY_INDICES = [1, 2];

interface IWeekTabBarProps {
  labels: string[];
  activeIndex: number;
  invalidIndices?: boolean[];
  onChange: (index: number) => void;
}

const WeekTabBar = memo(function WeekTabBar(props: IWeekTabBarProps): JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-background-default">
      <View className="flex-row gap-2 px-4 py-2">
        {props.labels.map((label, index) => {
          const isSelected = props.activeIndex === index;
          const isInvalid = props.invalidIndices?.[index] ?? false;
          return (
            <Pressable
              key={`${label}-${index}`}
              testID={`tab-${StringUtils_dashcase(label.toLowerCase())}`}
              data-testid={`tab-${StringUtils_dashcase(label.toLowerCase())}`}
              className={`px-3 py-2 rounded mr-2 ${
                isSelected
                  ? "bg-background-default border border-button-primarybackground"
                  : "bg-background-subtle border border-background-default"
              }`}
              onPress={() => props.onChange(index)}
            >
              <Text className={`text-sm ${isSelected ? "text-text-purple" : "text-text-secondary"}`}>
                {isInvalid ? "⚠️ " : ""}
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
});

interface IOuterTabBarProps {
  labels: readonly string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

const OuterTabBar = memo(function OuterTabBar(props: IOuterTabBarProps): JSX.Element {
  const activeColor = Tailwind_semantic().button.secondarystroke;
  return (
    <View className="flex-row justify-between pt-4 px-4 bg-background-default border-b border-border-neutral">
      {props.labels.map((label, index) => {
        const isSelected = props.activeIndex === index;
        const nameClass = `tab-${StringUtils_dashcase(label.toLowerCase())}`;
        return (
          <Pressable
            key={label}
            className="px-2 pb-1"
            data-testid={nameClass}
            testID={nameClass}
            style={isSelected ? { borderBottomWidth: 2, borderBottomColor: activeColor } : undefined}
            onPress={() => props.onChange(index)}
          >
            <Text className={`text-base ${isSelected ? "text-text-purple" : ""}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

interface IEditProgramHeaderProps {
  evaluatedProgram: IEvaluatedProgram;
  onChangeProgram: () => void;
  onChangeDay: () => void;
  onChangeName: (newValue: string) => void;
  settings: ISettings;
}

const EditProgramHeader = memo(function EditProgramHeader(props: IEditProgramHeaderProps): JSX.Element {
  const evaluatedProgram = props.evaluatedProgram;
  const time = Program_dayAverageTimeMs(evaluatedProgram, props.settings);
  const duration = TimeUtils_formatHOrMin(time);
  return (
    <View className="px-4">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <ContentGrowingTextarea
            className="text-base font-bold"
            value={evaluatedProgram.name}
            onInput={(newValue) => {
              if (newValue) {
                props.onChangeName(newValue);
              }
            }}
          />
        </View>
        <View className="flex-row items-center">
          <Pressable
            className="px-2"
            onPress={() => {
              props.onChangeProgram();
            }}
          >
            <IconSwap size={16} />
          </Pressable>
        </View>
      </View>
      <View>
        <View className="flex-row items-center my-1">
          <IconCalendarSmall className="mr-1" />
          <Text className="text-xs text-text-secondary">
            {evaluatedProgram.weeks.length > 1 &&
              `${evaluatedProgram.weeks.length} ${StringUtils_pluralize("week", evaluatedProgram.weeks.length)}, `}
            {Program_daysRange(evaluatedProgram)}, {Program_exerciseRange(evaluatedProgram)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View>
            <IconTimerSmall />
          </View>
          <Text className="pl-1 text-xs text-text-secondary">
            {duration.value} {duration.unit}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center mt-1">
        <Text className="text-xs font-bold text-text-secondary">Next Day: </Text>
        <LinkButton
          data-testid="change-program-day"
          testID="change-program-day"
          name="change-program-day"
          className="text-xs font-bold"
          onClick={() => props.onChangeDay()}
        >
          {Program_getDayName(evaluatedProgram, evaluatedProgram.nextDay)}
        </LinkButton>
      </View>
    </View>
  );
});
