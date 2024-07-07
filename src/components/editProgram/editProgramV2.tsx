import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { ILoading, IState, updateSettings, updateState } from "../../models/state";
import { Button } from "../button";
import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { Thunk } from "../../ducks/thunks";
import { ICustomExercise, IExerciseKind, IMuscle, IProgram, ISettings } from "../../types";
import { IScreen, Screen } from "../../models/screen";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { Program } from "../../models/program";
import { LinkButton } from "../linkButton";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramV2PerDay } from "./editProgramV2PerDay";
import { ILensRecordingPayload, lb } from "lens-shmens";
import { IPlannerState } from "../../pages/planner/models/types";
import { EditProgramV2Full } from "./editProgramV2Full";
import { PlannerToProgram } from "../../models/plannerToProgram";
import { CollectionUtils } from "../../utils/collection";
import { ProgramPreviewOrPlayground } from "../programPreviewOrPlayground";
import { Modal } from "../modal";
import { ModalPlannerSettings } from "../../pages/planner/components/modalPlannerSettings";
import { ModalExercise } from "../modalExercise";
import { equipmentName, Exercise } from "../../models/exercise";
import { StringUtils } from "../../utils/string";
import { ObjectUtils } from "../../utils/object";
import { EditProgramV2EditWeekDayModal } from "./editProgramV2EditWeekDayModal";
import { HelpEditProgramV2 } from "../help/helpEditProgramV2";
import { Nux } from "../nux";
import { IconHelp } from "../icons/iconHelp";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { undoRedoMiddleware, useUndoRedo } from "../../pages/builder/utils/undoredo";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";

interface IProps {
  editProgram: IProgram;
  plannerState: IPlannerState;
  programIndex: number;
  helps: string[];
  screenStack: IScreen[];
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  loading: ILoading;
}

export function EditProgramV2(props: IProps): JSX.Element {
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);
  const plannerState = props.plannerState;

  useEffect(() => {
    if (plannerState.ui.focusedDay != null) {
      window.scrollTo(0, programEditorRef.current?.offsetTop || 0);
    }
  }, []);
  const programEditorRef = useRef<HTMLDivElement>(null);
  const plannerDispatch: ILensDispatch<IPlannerState> = useCallback(
    (lensRecording: ILensRecordingPayload<IPlannerState> | ILensRecordingPayload<IPlannerState>[], desc?: string) => {
      const lensRecordings = Array.isArray(lensRecording) ? lensRecording : [lensRecording];
      updateState(
        props.dispatch,
        lensRecordings.map((recording) => recording.prepend(lb<IState>().pi("editProgramV2"))),
        desc
      );
      const changesCurrent = lensRecordings.some((recording) => recording.lens.from.some((f) => f === "current"));
      if (!(desc === "undo") && changesCurrent) {
        undoRedoMiddleware(plannerDispatch, plannerState);
      }
    },
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);
  const modalExerciseUi = plannerState.ui.modalExercise;
  const [isCopied, setIsCopied] = useState<boolean>(false);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramV2 />}
          screenStack={props.screenStack}
          title="Edit Program"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <>
          <ModalPublishProgram
            isHidden={!shouldShowPublishModal}
            program={props.editProgram}
            dispatch={props.dispatch}
            onClose={() => {
              setShouldShowPublishModal(false);
            }}
          />
          {plannerState.ui.showPreview && (
            <Modal
              isFullWidth={true}
              name="program-preview"
              shouldShowClose={true}
              onClose={() => plannerDispatch(lb<IPlannerState>().pi("ui").p("showPreview").record(false))}
            >
              <GroupHeader size="large" name="Program Preview" />
              <ProgramPreviewOrPlayground
                program={new PlannerToProgram(
                  props.editProgram.id,
                  props.editProgram.nextDay,
                  plannerState.current.program,
                  props.settings
                ).convertToProgram()}
                isMobile={true}
                hasNavbar={false}
                settings={props.settings}
              />
            </Modal>
          )}
          {plannerState.ui.showSettingsModal && (
            <ModalPlannerSettings
              inApp={true}
              onNewSettings={(newSettings) =>
                updateState(props.dispatch, [lb<IState>().p("storage").p("settings").record(newSettings)])
              }
              settings={props.settings}
              onClose={() => plannerDispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(false))}
            />
          )}
          {modalExerciseUi && (
            <ModalExercise
              isHidden={!modalExerciseUi}
              onChange={(exerciseType, shouldClose) => {
                window.isUndoing = true;
                if (shouldClose) {
                  plannerDispatch([
                    lb<IPlannerState>().p("ui").p("modalExercise").record(undefined),
                    lb<IPlannerState>().p("ui").p("showDayStats").record(false),
                    lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined),
                  ]);
                }
                if (modalExerciseUi.exerciseType && modalExerciseUi.exerciseKey) {
                  if (!exerciseType) {
                    return;
                  }
                  if (plannerState.fulltext) {
                    const program = {
                      name: plannerState.current.program.name,
                      weeks: PlannerProgram.evaluateText(plannerState.fulltext.text),
                    };
                    const newPlannerProgram = PlannerProgram.replaceExercise(
                      program,
                      modalExerciseUi.exerciseKey,
                      exerciseType,
                      props.settings
                    );
                    const newText = PlannerProgram.generateFullText(newPlannerProgram.weeks);
                    plannerDispatch([lb<IPlannerState>().pi("fulltext").p("text").record(newText)]);
                  } else {
                    if (modalExerciseUi.change === "one") {
                      const focusedExercise = modalExerciseUi.focusedExercise;
                      const exercise = Exercise.find(exerciseType, props.settings.exercises);
                      if (exercise && modalExerciseUi.fullName) {
                        const newShortName = `${exercise.name}${
                          exerciseType.equipment != null && exerciseType.equipment !== exercise?.defaultEquipment
                            ? `, ${equipmentName(exerciseType.equipment)}`
                            : ""
                        }`;
                        const newPlannerProgram = EditProgramUiHelpers.changeCurrentInstance(
                          plannerState.current.program,
                          { week: focusedExercise.weekIndex + 1, dayInWeek: focusedExercise.dayIndex + 1, day: 1 },
                          modalExerciseUi.fullName,
                          props.settings,
                          (e) => {
                            e.fullName = `${e.label ? `${e.label}: ` : ""}${newShortName}`;
                          }
                        );
                        plannerDispatch([lb<IPlannerState>().p("current").p("program").record(newPlannerProgram)]);
                      }
                    } else if (modalExerciseUi.change === "duplicate") {
                      const focusedExercise = modalExerciseUi.focusedExercise;
                      const exercise = Exercise.find(exerciseType, props.settings.exercises);
                      if (exercise && modalExerciseUi.fullName) {
                        const newPlannerProgram = EditProgramUiHelpers.duplicateCurrentInstance(
                          plannerState.current.program,
                          { week: focusedExercise.weekIndex + 1, dayInWeek: focusedExercise.dayIndex + 1, day: 1 },
                          modalExerciseUi.fullName,
                          exerciseType,
                          props.settings
                        );
                        plannerDispatch([lb<IPlannerState>().p("current").p("program").record(newPlannerProgram)]);
                      }
                    } else {
                      const newPlannerProgram = PlannerProgram.replaceExercise(
                        plannerState.current.program,
                        modalExerciseUi.exerciseKey,
                        exerciseType,
                        props.settings
                      );
                      plannerDispatch([lb<IPlannerState>().p("current").p("program").record(newPlannerProgram)]);
                    }
                  }
                } else {
                  plannerDispatch([
                    props.plannerState.fulltext
                      ? lb<IPlannerState>()
                          .pi("fulltext")
                          .p("text")
                          .recordModify((text) => {
                            if (!exerciseType) {
                              return text;
                            }
                            const line = props.plannerState.fulltext?.currentLine;
                            if (line == null) {
                              return text;
                            }
                            const exercise = Exercise.getById(exerciseType.id, props.settings.exercises);
                            const lines = text.split("\n");
                            lines.splice(line, 0, exercise.name);
                            return lines.join("\n");
                          })
                      : lb<IPlannerState>()
                          .p("current")
                          .p("program")
                          .p("weeks")
                          .i(modalExerciseUi.focusedExercise.weekIndex)
                          .p("days")
                          .i(modalExerciseUi.focusedExercise.dayIndex)
                          .p("exerciseText")
                          .recordModify((exerciseText) => {
                            if (!exerciseType) {
                              return exerciseText;
                            }
                            const exercise = Exercise.getById(exerciseType.id, props.settings.exercises);
                            return exerciseText + `\n${exercise.name} / 1x1`;
                          }),
                  ]);
                }
                plannerDispatch(
                  [
                    lb<IPlannerState>()
                      .p("ui")
                      .recordModify((ui) => ui),
                  ],
                  "stop-is-undoing"
                );
              }}
              onCreateOrUpdate={(
                shouldClose: boolean,
                name: string,
                targetMuscles: IMuscle[],
                synergistMuscles: IMuscle[],
                types: IExerciseKind[],
                exercise?: ICustomExercise
              ) => {
                const exercises = Exercise.createOrUpdateCustomExercise(
                  props.settings.exercises,
                  name,
                  targetMuscles,
                  synergistMuscles,
                  types,
                  exercise
                );
                updateSettings(props.dispatch, lb<ISettings>().p("exercises").record(exercises));
                if (shouldClose) {
                  plannerDispatch(lb<IPlannerState>().p("ui").p("modalExercise").record(undefined));
                }
              }}
              onDelete={(id) => {
                updateSettings(
                  props.dispatch,
                  lb<ISettings>()
                    .p("exercises")
                    .recordModify((exercises) => {
                      return ObjectUtils.omit(exercises, [id]);
                    })
                );
              }}
              settings={props.settings}
              customExerciseName={modalExerciseUi.customExerciseName}
              exerciseType={modalExerciseUi.exerciseType}
              initialFilterTypes={[...modalExerciseUi.muscleGroups, ...modalExerciseUi.types].map(
                StringUtils.capitalize
              )}
            />
          )}
          {plannerState.ui.editWeekDayModal && (
            <EditProgramV2EditWeekDayModal
              onSelect={(name: string) => {
                const modal = plannerState.ui.editWeekDayModal;
                if (name && modal != null) {
                  if (modal.dayIndex != null) {
                    plannerDispatch(
                      lb<IPlannerState>()
                        .p("current")
                        .p("program")
                        .p("weeks")
                        .i(modal.weekIndex)
                        .p("days")
                        .i(modal.dayIndex)
                        .p("name")
                        .record(name)
                    );
                  } else {
                    plannerDispatch(
                      lb<IPlannerState>().p("current").p("program").p("weeks").i(modal.weekIndex).p("name").record(name)
                    );
                  }
                }
                plannerDispatch(lb<IPlannerState>().p("ui").p("editWeekDayModal").record(undefined));
              }}
              onClose={() => plannerDispatch(lb<IPlannerState>().p("ui").p("editWeekDayModal").record(undefined))}
              plannerProgram={plannerState.current.program}
              weekIndex={plannerState.ui.editWeekDayModal.weekIndex}
              dayIndex={plannerState.ui.editWeekDayModal.dayIndex}
            />
          )}
        </>
      }
    >
      <section>
        <div className="px-4">
          <div className="mb-2 text-sm text-grayv2-main">
            <div>
              You can use{" "}
              <LinkButton
                name="edit-program-copy-program-link"
                onClick={async () => {
                  props.dispatch(
                    Thunk.generateAndCopyLink(props.editProgram, props.settings, () => {
                      setIsCopied(true);
                      setTimeout(() => {
                        setIsCopied(false);
                      }, 3000);
                    })
                  );
                }}
              >
                this link
              </LinkButton>{" "}
              to edit this program on your laptop
            </div>
            {isCopied && <div className="font-bold">Copied to clipboard!</div>}
          </div>
          <GroupHeader name="Current Program" />
          <MenuItem
            name="Program"
            value={props.editProgram.name}
            expandValue={true}
            shouldShowRightArrow={true}
            onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
          />
          <div className="px-2 mb-2 text-xs text-right">
            <LinkButton onClick={() => props.dispatch(Thunk.pushScreen("programs"))} name="history-change-program">
              Change Program
            </LinkButton>
          </div>
          <GroupHeader name="Program Details" topPadding={true} />
          <MenuItemEditable
            type="text"
            name="Name:"
            value={props.editProgram.name}
            onChange={(newValue) => {
              if (newValue) {
                EditProgram.setName(props.dispatch, props.editProgram, newValue);
                plannerDispatch(lb<IPlannerState>().p("current").p("program").p("name").record(newValue));
              }
            }}
          />
          <MenuItemEditable
            type="select"
            name="Next Day:"
            values={Program.getListOfDays(props.editProgram, props.settings)}
            value={props.editProgram.nextDay.toString()}
            onChange={(newValueStr) => {
              const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
              if (newValue != null && !isNaN(newValue)) {
                const newDay = Math.max(1, Math.min(newValue, Program.numberOfDays(props.editProgram, props.settings)));
                EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
              }
            }}
          />
          <Nux
            className="my-2 bg-orange-100 border border-orange-600 rounded-md"
            id="Rounded Weights"
            helps={props.helps}
            dispatch={props.dispatch}
          >
            If you're first time here, make sure to read the help (
            <IconHelp fill="white" size={20} className="inline-block" /> at the top right corner) to learn how to use
            the <strong>Liftoscript</strong> syntax to write weightlifting programs!
          </Nux>
        </div>
        <div ref={programEditorRef}>
          {props.plannerState.fulltext != null ? (
            <EditProgramV2Full
              plannerProgram={plannerState.current.program}
              ui={plannerState.ui}
              lbUi={lb<IPlannerState>().pi("ui")}
              fulltext={props.plannerState.fulltext}
              settings={props.settings}
              plannerDispatch={plannerDispatch}
            />
          ) : (
            <EditProgramV2PerDay
              state={plannerState}
              plannerProgram={plannerState.current.program}
              ui={plannerState.ui}
              settings={props.settings}
              plannerDispatch={plannerDispatch}
              onSave={() => {
                const newProgram: IProgram = {
                  ...Program.cleanPlannerProgram(props.editProgram),
                  planner: props.plannerState.current.program,
                };
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("storage")
                    .p("programs")
                    .recordModify((programs) => {
                      return CollectionUtils.setBy(programs, "id", props.editProgram.id, newProgram);
                    }),
                  lb<IState>().p("editProgramV2").record(undefined),
                ]);
                props.dispatch(Thunk.pullScreen());
              }}
            />
          )}
        </div>
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              name="publish-program"
              kind="orange"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
          </div>
        )}
      </section>
    </Surface>
  );
}
