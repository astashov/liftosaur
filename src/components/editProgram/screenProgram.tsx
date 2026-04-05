import { JSX, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { IDispatch } from "../../ducks/types";
import { INavCommon, IState, updateState } from "../../models/state";
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
import { Button } from "../button";
import { IconKebab } from "../icons/iconKebab";
import { PlannerWeekStats } from "../../pages/planner/components/plannerWeekStats";
import { Modal } from "../modal";
import { ModalPlannerSettings } from "../../pages/planner/components/modalPlannerSettings";
import { PlannerDayStats } from "../../pages/planner/components/plannerDayStats";
import { PlannerExerciseStats } from "../../pages/planner/components/plannerExerciseStats";
import { UidFactory_generateUid } from "../../utils/generator";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { navigationRef } from "../../navigation/navigationRef";
import { pickerStateFromPlannerExercise } from "./editProgramUtils";
import { ProgramPreviewTab } from "../preview/programPreviewTab";
import { Nux } from "../nux";
import { BottomSheetOrModalMuscleGroupsContent } from "../bottomSheetOrModalMuscleGroupsContent";
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

declare let __HOST__: string;

export function ScreenProgram(props: IProps): JSX.Element {
  const plannerState = props.plannerState;

  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    buildPlannerDispatch(props.dispatch, lb<IState>().p("editProgramStates").p(props.originalProgram.id), plannerState),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);
  const lbUi = lb<IPlannerState>().p("ui");

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

  useEffect(() => {
    const focusedDay = plannerState.ui.focusedDay;
    if (focusedDay) {
      const id = `edit-program-ui-exercise-${focusedDay.week}-${focusedDay.dayInWeek}-${focusedDay.key}`;
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "instant", block: "center" });
      }
    }
  }, []);

  const program: IProgram = plannerState.current.program;
  const planner = program.planner!;
  const evaluatedProgram = Program_evaluate(program, props.settings);
  const { evaluatedWeeks, exerciseFullNames } = PlannerProgram_evaluate(planner, props.settings);
  const ui = plannerState.ui;

  const editExerciseModal = ui.editExerciseModal;
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
      <button
        key="kebab"
        data-cy="navbar-3-dot"
        className="p-2 nm-edit-program-v2-navbar-kebab"
        onClick={() => navigationRef.navigate("editProgramMenuModal", { programId: props.originalProgram.id })}
      >
        <IconKebab />
      </button>,
    ],
  });

  return (
    <>
      <div>
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
                  settings={props.settings}
                  plannerDispatch={plannerDispatch}
                  state={plannerState}
                />
              ),
            },
            {
              label: "Playground",
              children: () => (
                <div className="pb-4">
                  <Nux className="mx-4 my-2" id="Playground" helps={props.helps} dispatch={props.dispatch}>
                    Playground lets you test the program logic. You can finish workouts here and see how reps, weights,
                    sets change. Everything you do here is ephemeral, and doesn't change any settings, workouts or
                    programs.
                  </Nux>
                  <ProgramPreviewPlayground
                    key="playground"
                    scrollableTabsProps={{
                      topPadding: "0.25rem",
                      offsetY: "3.75rem",
                      className: "gap-2 px-4",
                      type: "squares",
                    }}
                    isPlayground={true}
                    program={program}
                    settings={props.settings}
                    stats={props.navCommon.stats}
                    useNavModals={true}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
      {ui.showWeekStats != null && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => {
            plannerDispatch(lbUi.p("showWeekStats").record(undefined), "Close week stats");
          }}
        >
          <PlannerWeekStats
            dispatch={plannerDispatch}
            onEditSettings={() => {
              plannerDispatch(lbUi.p("showSettingsModal").record(true), "Show settings modal");
            }}
            evaluatedDays={evaluatedWeeks[ui.showWeekStats]}
            settings={props.settings}
          />
        </Modal>
      )}
      {ui.showDayStats != null && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => plannerDispatch(lbUi.p("showDayStats").record(undefined), "Close day stats")}
        >
          <PlannerDayStats
            dispatch={plannerDispatch}
            settings={props.settings}
            evaluatedDay={evaluatedWeeks[ui.weekIndex][ui.showDayStats]}
          />
        </Modal>
      )}
      {plannerState.ui.showSettingsModal && (
        <ModalPlannerSettings
          inApp={true}
          onNewSettings={(newSettings) =>
            updateState(
              props.dispatch,
              [lb<IState>().p("storage").p("settings").record(newSettings)],
              "Update planner settings"
            )
          }
          onShowEditMuscleGroups={() => {
            plannerDispatch(lb<IPlannerState>().p("ui").p("showEditMuscleGroups").record(true), "Show muscle groups");
          }}
          settings={props.settings}
          onClose={() =>
            plannerDispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(false), "Close settings modal")
          }
        />
      )}
      {ui.showEditMuscleGroups && (
        <BottomSheetOrModalMuscleGroupsContent
          settings={props.settings}
          onClose={() => plannerDispatch(lbUi.p("showEditMuscleGroups").record(false), "Close muscle groups")}
          onNewSettings={(newSettings) => {
            updateState(
              props.dispatch,
              [lb<IState>().p("storage").p("settings").record(newSettings)],
              "Update planner settings"
            );
          }}
        />
      )}
      {ui.showExerciseStats && ui.focusedExercise && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => plannerDispatch(lbUi.p("showExerciseStats").record(undefined), "Close exercise stats")}
        >
          <PlannerExerciseStats
            dispatch={plannerDispatch}
            settings={props.settings}
            evaluatedWeeks={evaluatedWeeks}
            weekIndex={ui.focusedExercise.weekIndex}
            dayIndex={ui.focusedExercise.dayIndex}
            exerciseLine={ui.focusedExercise.exerciseLine}
            hideSwap={true}
          />
        </Modal>
      )}
      {editExerciseModal && (
        <Modal
          shouldShowClose={true}
          onClose={() => plannerDispatch(lbUi.p("editExerciseModal").record(undefined), "Close edit exercise modal")}
        >
          <h3 className="mb-2 text-lg font-semibold text-center">Change Exercise</h3>
          <div className="flex gap-4">
            <div>
              <Button
                name="edit-exercise-change-one"
                data-cy="edit-exercise-change-one"
                kind="purple"
                onClick={() => {
                  plannerDispatch(
                    [
                      lbUi.p("editExerciseModal").record(undefined),
                      lbUi.p("exercisePicker").record({
                        state: pickerStateFromPlannerExercise(props.settings, editExerciseModal.plannerExercise),
                        exerciseKey: editExerciseModal.plannerExercise.key,
                        dayData: editExerciseModal.plannerExercise.dayData,
                        change: "one",
                      }),
                    ],
                    "Change exercise for one instance"
                  );
                }}
              >
                Change only for this week/day
              </Button>
            </div>
            <div>
              <Button
                name="edit-exercise-change-all"
                data-cy="edit-exercise-change-all"
                kind="purple"
                onClick={() => {
                  plannerDispatch(
                    [
                      lbUi.p("editExerciseModal").record(undefined),
                      lbUi.p("exercisePicker").record({
                        state: pickerStateFromPlannerExercise(props.settings, editExerciseModal.plannerExercise),
                        exerciseKey: editExerciseModal.plannerExercise.key,
                        dayData: editExerciseModal.plannerExercise.dayData,
                        change: "all",
                      }),
                    ],
                    "Change exercise for all instances"
                  );
                }}
              >
                Change across whole program
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
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
    <div className="px-4">
      <div className="flex items-center text-base font-bold">
        <div>
          <ContentGrowingTextarea
            value={evaluatedProgram.name}
            onInput={(newValue) => {
              if (newValue) {
                props.onChangeName(newValue);
              }
            }}
          />
        </div>
        <div className="flex items-center ml-2">
          <button
            className="px-2"
            onClick={() => {
              props.onChangeProgram();
            }}
          >
            <IconSwap size={16} />
          </button>
        </div>
      </div>
      <div>
        <div className="flex mb-1 text-text-secondary">
          <IconCalendarSmall className="block mr-1" />{" "}
          <div className="text-xs">
            {evaluatedProgram.weeks.length > 1 &&
              `${evaluatedProgram.weeks.length} ${StringUtils_pluralize("week", evaluatedProgram.weeks.length)}, `}
            {Program_daysRange(evaluatedProgram)}, {Program_exerciseRange(evaluatedProgram)}
          </div>
        </div>
        <div className="flex text-text-secondary">
          <div>
            <IconTimerSmall />
          </div>
          <div className="pl-1 text-xs align-middle">
            {duration.value} {duration.unit}
          </div>
        </div>
      </div>
      <div className="mt-1 text-xs text-text-secondary">
        <strong>Next Day: </strong>
        <LinkButton data-cy="change-program-day" name="change-program-day" onClick={() => props.onChangeDay()}>
          {Program_getDayName(evaluatedProgram, evaluatedProgram.nextDay)}
        </LinkButton>
      </div>
    </div>
  );
}
