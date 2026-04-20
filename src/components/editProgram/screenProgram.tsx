import { JSX, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "../primitives/text";
import { IDispatch } from "../../ducks/types";
import { INavCommon, IState } from "../../models/state";
import { IProgram, ISettings } from "../../types";
import { useNavOptions } from "../../navigation/useNavOptions";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
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
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { navigationRef } from "../../navigation/navigationRef";
import { ProgramPreview_buildWeeks, ProgramPreviewWeekContent } from "../preview/programPreviewTab";
import { Nux } from "../nux";
import { programTourConfig } from "../tour/programTourConfig";
import { NavScreenContent } from "../../navigation/NavScreenContent";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

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

export function ScreenProgram(props: IProps): JSX.Element {
  const plannerState = props.plannerState;

  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    buildPlannerDispatch(props.dispatch, lb<IState>().p("editProgramStates").p(props.originalProgram.id), plannerState),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  useLayoutEffect(() => {
    if (props.plannerState) {
      for (const week of planner.weeks) {
        week.id = week.id ?? UidFactory_generateUid(8);
        for (const day of week.days) {
          day.id = day.id ?? UidFactory_generateUid(8);
        }
      }
    }
  });

  const program: IProgram = plannerState.current.program;
  const planner = program.planner!;
  const evaluatedProgram = Program_evaluate(program, props.settings);
  const { evaluatedWeeks, exerciseFullNames } = PlannerProgram_evaluate(planner, props.settings);
  const ui = plannerState.ui;

  const exercisePickerUi = props.plannerState.ui.exercisePicker;
  const prevExercisePickerUi = useRef(exercisePickerUi);
  useEffect(() => {
    if (exercisePickerUi && !prevExercisePickerUi.current) {
      navigationRef.navigate("editProgramExercisePickerModal", {
        context: "editProgram",
        programId: props.originalProgram.id,
        dayData: exercisePickerUi.dayData,
        change: exercisePickerUi.change,
        exerciseKey: exercisePickerUi.exerciseKey,
      });
    }
    prevExercisePickerUi.current = exercisePickerUi;
  }, [exercisePickerUi]);

  useNavOptions({
    navTitle: "Program",
    navHelpTourId: programTourConfig.id,
    navRightButtons: [
      <Pressable
        key="kebab"
        data-cy="navbar-3-dot"
        testID="navbar-3-dot"
        className="p-2 nm-edit-program-v2-navbar-kebab"
        onPress={() => navigationRef.navigate("editProgramMenuModal", { programId: props.originalProgram.id })}
      >
        <IconKebab />
      </Pressable>,
    ],
  });

  const tabLabels = ["Preview", "Edit", "Playground"] as const;
  const tabIndex = plannerState.ui.tabIndex ?? 0;
  const activeTabLabel = tabLabels[tabIndex] ?? "Preview";

  const onChangeTab = (newTabIndex: number): void => {
    plannerDispatch(lb<IPlannerState>().p("ui").p("tabIndex").record(newTabIndex), "Change tab");
  };

  const [previewWeekIndex, setPreviewWeekIndex] = useState(0);
  const [playgroundWeekIndex, setPlaygroundWeekIndex] = useState(0);
  const editWeekIndex = ui.weekIndex ?? 0;
  const setEditWeekIndex = (newIndex: number): void => {
    plannerDispatch(
      lb<IPlannerState>().p("ui").p("weekIndex").record(newIndex),
      `Change week index to ${newIndex}`
    );
  };

  const previewWeeks = ProgramPreview_buildWeeks(program, props.settings, props.navCommon.stats);
  const safePreviewWeekIndex = Math.min(previewWeekIndex, Math.max(0, previewWeeks.length - 1));
  const playgroundWeekNames = evaluatedProgram.weeks.map((w) => w.name);
  const safePlaygroundWeekIndex = Math.min(playgroundWeekIndex, Math.max(0, playgroundWeekNames.length - 1));
  const showEditWeekTabBar =
    activeTabLabel === "Edit" && (ui.mode === "ui" || ui.mode === "perday") && planner.weeks.length > 1;

  let tabContent: JSX.Element;
  if (activeTabLabel === "Preview") {
    const currentWeek = previewWeeks[safePreviewWeekIndex];
    tabContent = currentWeek ? (
      <ProgramPreviewWeekContent
        key="preview"
        week={currentWeek}
        program={program}
        programId={props.originalProgram.id}
        settings={props.settings}
        ui={ui}
        stats={props.navCommon.stats}
        dispatch={props.dispatch}
        plannerDispatch={plannerDispatch}
        totalWeeks={previewWeeks.length}
      />
    ) : (
      <View />
    );
  } else if (activeTabLabel === "Edit") {
    tabContent = (
      <EditProgramView
        hideNavbar
        hideWeekTabBar={showEditWeekTabBar}
        evaluatedWeeks={evaluatedWeeks}
        evaluatedProgram={evaluatedProgram}
        exerciseFullNames={exerciseFullNames}
        dispatch={props.dispatch}
        originalProgram={props.originalProgram}
        programId={props.originalProgram.id}
        settings={props.settings}
        plannerDispatch={plannerDispatch}
        state={plannerState}
      />
    );
  } else {
    tabContent = (
      <View className="pb-4">
        <Nux className="mx-4 my-2" id="Playground" helps={props.helps} dispatch={props.dispatch}>
          <Text className="text-xs">
            Playground lets you test the program logic. You can finish workouts here and see how reps, weights, sets
            change. Everything you do here is ephemeral, and doesn't change any settings, workouts or programs.
          </Text>
        </Nux>
        <ProgramPreviewPlayground
          key="playground"
          scrollableTabsProps={{
            topPadding: "0.25rem",
            className: "gap-2 px-4",
            type: "squares",
          }}
          isPlayground={true}
          program={program}
          settings={props.settings}
          stats={props.navCommon.stats}
          useNavModals={true}
          hideWeekTabBar={true}
          externalWeekIndex={safePlaygroundWeekIndex}
        />
      </View>
    );
  }

  let perTabStickyHeader: JSX.Element;
  if (activeTabLabel === "Edit") {
    perTabStickyHeader = (
      <View className="bg-background-default">
        <EditProgramNavbar
          dispatch={props.dispatch}
          originalProgram={props.originalProgram}
          settings={props.settings}
          state={plannerState}
          plannerDispatch={plannerDispatch}
        />
        {showEditWeekTabBar && (
          <WeekTabBar
            labels={planner.weeks.map((w) => w.name)}
            invalidIndices={planner.weeks.map((_, i) => evaluatedWeeks[i]?.some((day) => !day.success) ?? false)}
            activeIndex={editWeekIndex}
            onChange={setEditWeekIndex}
          />
        )}
      </View>
    );
  } else if (activeTabLabel === "Preview" && previewWeeks.length > 1) {
    perTabStickyHeader = (
      <View className="bg-background-default">
        <WeekTabBar
          labels={previewWeeks.map((w) => w.name)}
          activeIndex={safePreviewWeekIndex}
          onChange={setPreviewWeekIndex}
        />
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
    <NavScreenContent stickyHeaderIndices={[1, 2]}>
      <EditProgramHeader
        evaluatedProgram={evaluatedProgram}
        settings={props.settings}
        onChangeProgram={() => {
          props.dispatch(Thunk_pushScreen("programs"));
        }}
        onChangeDay={() => {
          navigationRef.navigate("programNextDayModal", { programId: props.originalProgram.id });
        }}
        onChangeName={(newValue) => {
          EditProgram_setName(props.dispatch, props.originalProgram, newValue);
          plannerDispatch(
            [
              lb<IPlannerState>().p("current").p("program").p("name").record(newValue),
              lb<IPlannerState>().p("current").p("program").pi("planner").p("name").record(newValue),
            ],
            "Update program name"
          );
        }}
      />
      <OuterTabBar labels={tabLabels as readonly string[]} activeIndex={tabIndex} onChange={onChangeTab} />
      {perTabStickyHeader}
      {tabContent}
    </NavScreenContent>
  );
}

interface IWeekTabBarProps {
  labels: string[];
  activeIndex: number;
  invalidIndices?: boolean[];
  onChange: (index: number) => void;
}

function WeekTabBar(props: IWeekTabBarProps): JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-background-default">
      <View className="flex-row px-4 py-2 gap-2">
        {props.labels.map((label, index) => {
          const isSelected = props.activeIndex === index;
          const isInvalid = props.invalidIndices?.[index] ?? false;
          return (
            <Pressable
              key={`${label}-${index}`}
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
}

interface IOuterTabBarProps {
  labels: readonly string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

function OuterTabBar(props: IOuterTabBarProps): JSX.Element {
  const activeColor = Tailwind_semantic().button.secondarystroke;
  return (
    <View className="flex-row pt-4 pb-2 bg-background-default">
      {props.labels.map((label, index) => {
        const isSelected = props.activeIndex === index;
        const nameClass = `tab-${StringUtils_dashcase(label.toLowerCase())}`;
        return (
          <View key={label} className="items-center flex-1 border-b border-border-neutral">
            <Pressable
              className="px-4 pb-1"
              data-cy={nameClass}
              testID={nameClass}
              style={isSelected ? { borderBottomWidth: 2, borderBottomColor: activeColor } : undefined}
              onPress={() => props.onChange(index)}
            >
              <Text className={`text-base ${isSelected ? "text-text-purple" : ""}`}>{label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

interface IEditProgramHeaderProps {
  evaluatedProgram: IEvaluatedProgram;
  onChangeProgram: () => void;
  onChangeDay: () => void;
  onChangeName: (newValue: string) => void;
  settings: ISettings;
}

function EditProgramHeader(props: IEditProgramHeaderProps): JSX.Element {
  const evaluatedProgram = props.evaluatedProgram;
  const time = Program_dayAverageTimeMs(evaluatedProgram, props.settings);
  const duration = TimeUtils_formatHOrMin(time);
  return (
    <View className="px-4 pb-4">
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
          data-cy="change-program-day"
          name="change-program-day"
          className="text-xs font-bold"
          onClick={() => props.onChangeDay()}
        >
          {Program_getDayName(evaluatedProgram, evaluatedProgram.nextDay)}
        </LinkButton>
      </View>
    </View>
  );
}
