import { h, JSX, Fragment } from "preact";
import { IDispatch, buildCustomLensDispatch } from "../../ducks/types";
import { INavCommon, IState, updateState } from "../../models/state";
import { useCallback, useEffect, useLayoutEffect, useState } from "preact/hooks";
import { IProgram, ISettings } from "../../types";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { HelpEditProgramV2 } from "../help/helpEditProgramV2";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { IEvaluatedProgram, Program } from "../../models/program";
import { StringUtils } from "../../utils/string";
import { IconCalendarSmall } from "../icons/iconCalendarSmall";
import { TimeUtils } from "../../utils/time";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { EditProgram } from "../../models/editProgram";
import { ScrollableTabs } from "../scrollableTabs";
import { EditProgramView } from "./editProgram";
import { ProgramPreviewPlayground } from "../preview/programPreviewPlayground";
import { Thunk } from "../../ducks/thunks";
import { IconSwap } from "../icons/iconSwap";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { LinkButton } from "../linkButton";
import { ModalProgramNextDay } from "../modalProgramNextDay";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { Button } from "../button";
import { ModalPublishProgram } from "../modalPublishProgram";
import { BottomSheetEditProgramV2 } from "../bottomSheetEditProgramV2";
import { IconKebab } from "../icons/iconKebab";
import { ModalPlannerPictureExport } from "../../pages/planner/components/modalPlannerPictureExport";
import { ModalPlannerProgramRevisions } from "../../pages/planner/modalPlannerProgramRevisions";
import { PlannerWeekStats } from "../../pages/planner/components/plannerWeekStats";
import { Modal } from "../modal";
import { ModalPlannerSettings } from "../../pages/planner/components/modalPlannerSettings";
import { PlannerDayStats } from "../../pages/planner/components/plannerDayStats";
import { PlannerExerciseStats } from "../../pages/planner/components/plannerExerciseStats";
import { UidFactory } from "../../utils/generator";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { UrlUtils } from "../../utils/url";
import { ClipboardUtils } from "../../utils/clipboard";
import { EditProgramBottomSheetPicker } from "./editProgramBottomSheetPicker";
import { pickerStateFromPlannerExercise } from "./editProgramUtils";
import { ProgramPreviewTab } from "../preview/programPreviewTab";
import { Nux } from "../nux";

interface IProps {
  originalProgram: IProgram;
  plannerState: IPlannerState;
  helps: string[];
  client: Window["fetch"];
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  isLoggedIn: boolean;
  revisions: string[];
  navCommon: INavCommon;
}

declare let __HOST__: string;

export function ScreenProgram(props: IProps): JSX.Element {
  const plannerState = props.plannerState;
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);

  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    buildPlannerDispatch(
      props.dispatch,
      (
        lb<IState>().p("screenStack").findBy("name", "editProgram", true).p("params") as LensBuilder<
          IState,
          { plannerState: IPlannerState },
          {}
        >
      ).pi("plannerState"),
      plannerState
    ),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);
  const [showChangeNextDay, setShowChangeNextDay] = useState(false);
  const [shouldShowBottomSheet, setShouldShowBottomSheet] = useState<boolean>(false);
  const [shouldShowGenerateImageModal, setShouldShowGenerateImageModal] = useState<boolean>(false);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState<boolean>(false);
  const [showRevisions, setShowRevisions] = useState<boolean>(false);
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");

  useLayoutEffect(() => {
    if (props.plannerState) {
      for (const week of planner.weeks) {
        week.id = week.id ?? UidFactory.generateUid(8);
        for (const day of week.days) {
          day.id = day.id ?? UidFactory.generateUid(8);
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
  const evaluatedProgram = Program.evaluate(program, props.settings);
  const { evaluatedWeeks, exerciseFullNames } = PlannerProgram.evaluate(planner, props.settings);
  const ui = plannerState.ui;

  const editExerciseModal = ui.editExerciseModal;
  const exercisePickerUi = props.plannerState.ui.exercisePicker;
  const exercisePickerPlannerExercise = exercisePickerUi?.exerciseKey
    ? Program.getProgramExerciseForKeyAndShortDayData(
        evaluatedProgram,
        exercisePickerUi.dayData,
        exercisePickerUi.exerciseKey
      )
    : undefined;

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramV2 />}
          rightButtons={[
            <button
              data-cy="navbar-3-dot"
              className="p-2 nm-edit-program-v2-navbar-kebab"
              onClick={() => setShouldShowBottomSheet(true)}
            >
              <IconKebab />
            </button>,
          ]}
          title="Program"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <BottomSheetEditProgramV2
            isAffiliateEnabled={!!props.settings.affiliateEnabled}
            isLoadingRevisions={isLoadingRevisions}
            isLoggedIn={props.isLoggedIn}
            onExportProgramToLink={() => {
              setShouldShowBottomSheet(false);
              const url = UrlUtils.build(`/user/p/${props.originalProgram.id}`, __HOST__);
              ClipboardUtils.copy(url.toString());
              alert(`Copied link to the clipboard: ${url}`);
            }}
            onShareProgramToLink={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(
                Thunk.generateAndCopyLink(props.originalProgram, props.settings, (url) => {
                  alert(`Copied link to the clipboard: ${url}`);
                })
              );
            }}
            onGenerateProgramImage={() => {
              setShouldShowBottomSheet(false);
              setShouldShowGenerateImageModal(true);
            }}
            onLoadRevisions={() => {
              setIsLoadingRevisions(true);
              props.dispatch(
                Thunk.fetchRevisions(props.originalProgram.id, () => {
                  setIsLoadingRevisions(false);
                  setShowRevisions(true);
                  setShouldShowBottomSheet(false);
                })
              );
            }}
            isHidden={!shouldShowBottomSheet}
            onClose={() => setShouldShowBottomSheet(false)}
          />
          {showChangeNextDay && (
            <ModalProgramNextDay
              onClose={() => setShowChangeNextDay(false)}
              stats={props.navCommon.stats}
              initialCurrentProgramId={program.id}
              onSelect={(_, day) => {
                updateState(
                  props.dispatch,
                  [lb<IState>().p("storage").p("programs").findBy("id", program.id).p("nextDay").record(day)],
                  `Select program day ${program.name} - ${day}`
                );
                plannerDispatch(
                  [lb<IPlannerState>().p("current").p("program").p("nextDay").record(day)],
                  `Select program day ${program.name} - ${day}`
                );
              }}
              allPrograms={[program]}
              settings={props.settings}
            />
          )}
          {shouldShowPublishModal && (
            <ModalPublishProgram
              isHidden={!shouldShowPublishModal}
              program={props.originalProgram}
              dispatch={props.dispatch}
              onClose={() => {
                setShouldShowPublishModal(false);
              }}
            />
          )}
          {shouldShowGenerateImageModal && (
            <ModalPlannerPictureExport
              settings={props.settings}
              userId={props.navCommon.userId}
              client={props.client}
              isChanged={false}
              program={plannerState.current.program}
              onClose={() => {
                setShouldShowGenerateImageModal(false);
              }}
            />
          )}
          {exercisePickerUi && (
            <EditProgramBottomSheetPicker
              isLoggedIn={props.isLoggedIn}
              program={program}
              dayData={exercisePickerUi.dayData}
              plannerExercise={exercisePickerPlannerExercise}
              exercisePickerState={exercisePickerUi.state}
              change={exercisePickerUi.change}
              settings={props.settings}
              evaluatedProgram={evaluatedProgram}
              plannerDispatch={buildCustomLensDispatch(plannerDispatch, lbPlanner)}
              onClose={() => {
                plannerDispatch(lbUi.p("exercisePicker").record(undefined), "Close exercise picker");
              }}
              stopIsUndoing={() => {
                plannerDispatch(
                  [
                    lb<IPlannerState>()
                      .p("ui")
                      .recordModify((ui2) => {
                        return { ...ui2, isUndoing: false };
                      }),
                  ],
                  "stop-is-undoing"
                );
              }}
              pickerDispatch={buildCustomLensDispatch(
                plannerDispatch,
                lb<IPlannerState>().p("ui").pi("exercisePicker").p("state")
              )}
              dispatch={props.dispatch}
            />
          )}
          {showRevisions && props.revisions.length > 0 && (
            <ModalPlannerProgramRevisions
              programId={props.originalProgram.id}
              client={props.client}
              revisions={props.revisions}
              onClose={() => setShowRevisions(false)}
              onRestore={(text) => {
                window.isUndoing = true;
                const weeks = PlannerProgram.evaluateText(text);
                plannerDispatch(lbPlanner.p("weeks").record(weeks), "stop-is-undoing");
                setShowRevisions(false);
              }}
            />
          )}
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
              settings={props.settings}
              onClose={() =>
                plannerDispatch(
                  lb<IPlannerState>().p("ui").p("showSettingsModal").record(false),
                  "Close settings modal"
                )
              }
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
              onClose={() =>
                plannerDispatch(lbUi.p("editExerciseModal").record(undefined), "Close edit exercise modal")
              }
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
                            state: pickerStateFromPlannerExercise(editExerciseModal.plannerExercise),
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
                            state: pickerStateFromPlannerExercise(editExerciseModal.plannerExercise),
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
      }
    >
      <div>
        <EditProgramHeader
          evaluatedProgram={evaluatedProgram}
          settings={props.settings}
          onChangeProgram={() => {
            props.dispatch(Thunk.pushScreen("programs"));
          }}
          onChangeDay={() => {
            setShowChangeNextDay(true);
          }}
          onChangeName={(newValue) => {
            EditProgram.setName(props.dispatch, props.originalProgram, newValue);
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
                  />
                </div>
              ),
            },
          ]}
        />
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              name="publish-program"
              kind="purple"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
          </div>
        )}
      </div>
    </Surface>
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
  const time = Program.dayAverageTimeMs(evaluatedProgram, props.settings);
  const duration = TimeUtils.formatHOrMin(time);
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
              `${evaluatedProgram.weeks.length} ${StringUtils.pluralize("week", evaluatedProgram.weeks.length)}, `}
            {Program.daysRange(evaluatedProgram)}, {Program.exerciseRange(evaluatedProgram)}
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
          {Program.getDayName(evaluatedProgram, evaluatedProgram.nextDay)}
        </LinkButton>
      </div>
    </div>
  );
}
