import { JSX, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { View, Pressable } from "react-native";
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
import { StringUtils_pluralize } from "../../utils/string";
import { IconCalendarSmall } from "../icons/iconCalendarSmall";
import { TimeUtils_formatHOrMin } from "../../utils/time";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { EditProgram_setName } from "../../models/editProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { EditProgramView } from "./editProgram";
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
import { ProgramPreviewTab } from "../preview/programPreviewTab";
import { Nux } from "../nux";
import { programTourConfig } from "../tour/programTourConfig";

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

  return (
    <View>
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
      <ScrollableTabs
        topPadding="1rem"
        shouldNotExpand={true}
        nonSticky={true}
        onChange={(newTabIndex) => {
          plannerDispatch(lb<IPlannerState>().p("ui").p("tabIndex").record(newTabIndex), "Change tab");
        }}
        defaultIndex={plannerState.ui.tabIndex}
        color="purple"
        tabs={[
          {
            label: "Preview",
            children: () => (
              <ProgramPreviewTab
                key="preview"
                ui={ui}
                program={program}
                programId={props.originalProgram.id}
                settings={props.settings}
                stats={props.navCommon.stats}
                dispatch={props.dispatch}
                plannerDispatch={plannerDispatch}
              />
            ),
          },
          {
            label: "Edit",
            children: () => (
              <EditProgramView
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
            ),
          },
          {
            label: "Playground",
            children: () => (
              <View className="pb-4">
                <Nux className="mx-4 my-2" id="Playground" helps={props.helps} dispatch={props.dispatch}>
                  <Text className="text-xs">
                    Playground lets you test the program logic. You can finish workouts here and see how reps, weights,
                    sets change. Everything you do here is ephemeral, and doesn't change any settings, workouts or
                    programs.
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
                />
              </View>
            ),
          },
        ]}
      />
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
    <View className="px-4">
      <View className="flex-row items-center">
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
        <View className="flex-row items-center ml-2">
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
        <View className="flex-row items-center mb-1">
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
          className="text-xs font-normal"
          onClick={() => props.onChangeDay()}
        >
          {Program_getDayName(evaluatedProgram, evaluatedProgram.nextDay)}
        </LinkButton>
      </View>
    </View>
  );
}
