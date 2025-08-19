import { h, JSX, Fragment } from "preact";
import { IPlannerExerciseState } from "../../pages/planner/models/types";
import { IDispatch, buildCustomLensDispatch } from "../../ducks/types";
import { IDayData, ISettings } from "../../types";
import { INavCommon, IState, updateState } from "../../models/state";
import { lb, LensBuilder } from "lens-shmens";
import { useCallback, useState } from "preact/hooks";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Footer2View } from "../footer2";
import { NavbarView } from "../navbar";
import { Surface } from "../surface";
import { Program } from "../../models/program";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { EditProgramExerciseWarmups } from "./editProgramExerciseWarmups";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IconKebab } from "../icons/iconKebab";
import { DropdownMenu, DropdownMenuItem } from "../editProgram/editProgramUi/editProgramUiDropdownMenu";
import { EditProgramExerciseProgress } from "./editProgramExerciseProgress";
import { EditProgramExerciseUpdate } from "./editProgramExerciseUpdate";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgramExerciseSets } from "./editProgramExerciseSets";
import { BottomSheetEditProgramExerciseSet } from "./bottomSheetEditProgramExerciseSet";
import { EditProgramExerciseNavbar } from "./editProgramExerciseNavbar";
import { Tailwind } from "../../utils/tailwindConfig";
import { EditProgramBottomSheetPicker } from "../editProgram/editProgramBottomSheetPicker";

interface IProps {
  plannerState: IPlannerExerciseState;
  exerciseKey: string;
  dayData: Required<IDayData>;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function ScreenEditProgramExercise(props: IProps): JSX.Element {
  const { plannerState } = props;

  const plannerDispatch: ILensDispatch<IPlannerExerciseState> = useCallback(
    buildPlannerDispatch(
      props.dispatch,
      (
        lb<IState>().p("screenStack").findBy("name", "editProgramExercise", true).p("params") as LensBuilder<
          IState,
          { plannerState: IPlannerExerciseState },
          {}
        >
      ).pi("plannerState"),
      plannerState
    ),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  const evaluatedProgram = Program.evaluate(plannerState.current.program, props.settings);
  let plannerExercise = evaluatedProgram.weeks[props.dayData.week - 1]?.days[
    props.dayData.dayInWeek - 1
  ].exercises.find((e) => e.key === props.exerciseKey);

  if (!plannerExercise) {
    plannerExercise = Program.getFirstProgramExercise(evaluatedProgram, props.exerciseKey);
  }

  const editProgramScreen = props.navCommon.screenStack.find((s) => s.name === "editProgram");
  const editProgramState = editProgramScreen?.params?.plannerState;
  const ui = plannerState.ui;
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");

  const exercisePickerState = props.plannerState.ui.exercisePickerState;

  if (!plannerExercise) {
    return (
      <Surface
        navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Edit Program Exercise" />}
        footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      >
        No such exercise
      </Surface>
    );
  }

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Edit Program Exercise"
          subtitle={
            plannerExercise.notused ? (
              <div className="pb-1">
                <div className="inline-block px-1 ml-3 text-xs font-bold text-text-alwayswhite rounded bg-grayv2-main">UNUSED</div>
              </div>
            ) : undefined
          }
          rightButtons={[
            <div className="flex items-center gap-4">
              <div className="relative flex items-center">
                <button
                  data-cy="program-exercise-navbar-kebab"
                  className="p-2"
                  onClick={() => {
                    setIsKebabMenuOpen(!isKebabMenuOpen);
                  }}
                >
                  <IconKebab />
                </button>
                {isKebabMenuOpen && (
                  <DropdownMenu
                    bgColor={Tailwind.colors().lightgray[50]}
                    rightOffset="3rem"
                    onClose={() => setIsKebabMenuOpen(false)}
                  >
                    <DropdownMenuItem
                      data-cy="program-exercise-toggle-progress"
                      onClick={() => {
                        setIsKebabMenuOpen(false);
                        plannerDispatch(
                          [
                            lb<IPlannerExerciseState>()
                              .p("ui")
                              .p("isProgressEnabled")
                              .record(!plannerState.ui.isProgressEnabled),
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers.changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  if (plannerState.ui.isProgressEnabled) {
                                    e.progress = undefined;
                                  } else {
                                    const result = PlannerProgramExercise.buildProgress(
                                      "lp",
                                      PlannerProgramExercise.getProgressDefaultArgs("lp")
                                    );
                                    if (result.success) {
                                      e.progress = result.data;
                                    } else {
                                      alert(result.error);
                                    }
                                  }
                                }
                              );
                            }),
                          ],
                          "Toggle progress"
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div>{ui.isProgressEnabled ? "Disable" : "Enable"} Progress</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-cy="program-exercise-toggle-update"
                      onClick={() => {
                        setIsKebabMenuOpen(false);
                        plannerDispatch(
                          [
                            lb<IPlannerExerciseState>()
                              .p("ui")
                              .p("isUpdateEnabled")
                              .record(!plannerState.ui.isUpdateEnabled),
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers.changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  if (plannerState.ui.isUpdateEnabled) {
                                    e.update = undefined;
                                  } else {
                                    e.update = { type: "custom", script: `{~~}` };
                                  }
                                }
                              );
                            }),
                          ],
                          "Toggle update"
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div>{ui.isUpdateEnabled ? "Disable" : "Enable"} Update</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-cy="program-exercise-toggle-used"
                      onClick={() => {
                        setIsKebabMenuOpen(false);
                        plannerDispatch(
                          [
                            lbProgram.recordModify((program) => {
                              const notused = plannerExercise.notused;
                              return EditProgramUiHelpers.changeAllInstances(
                                program,
                                plannerExercise.fullName,
                                props.settings,
                                true,
                                (e) => {
                                  e.notused = !notused;
                                }
                              );
                            }),
                          ],
                          "Toggle used status"
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div>Make {plannerExercise.notused ? "Used" : "Unused"}</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenu>
                )}
              </div>
            </div>,
          ]}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <BottomSheetEditProgramExerciseSet
            evaluatedProgram={evaluatedProgram}
            ui={plannerState.ui}
            plannerDispatch={plannerDispatch}
            settings={props.settings}
          />
          {exercisePickerState && (
            <EditProgramBottomSheetPicker
              program={plannerState.current.program}
              exercisePickerState={exercisePickerState}
              settings={props.settings}
              evaluatedProgram={evaluatedProgram}
              plannerExercise={plannerExercise}
              dayData={props.dayData}
              change="all"
              stopIsUndoing={() => {
                plannerDispatch(
                  [
                    lb<IPlannerExerciseState>()
                      .p("ui")
                      .recordModify((ui) => {
                        return { ...ui, isUndoing: false };
                      }),
                  ],
                  "stop-is-undoing"
                );
              }}
              onClose={() => {
                plannerDispatch(lbUi.p("exercisePickerState").record(undefined), "Close exercise picker");
              }}
              plannerDispatch={buildCustomLensDispatch(plannerDispatch, lbProgram)}
              pickerDispatch={buildCustomLensDispatch(plannerDispatch, lbUi.pi("exercisePickerState"))}
              dispatch={props.dispatch}
              onNewKey={(newKey) => {
                updateState(
                  props.dispatch,
                  [
                    (
                      lb<IState>().p("screenStack").findBy("name", "editProgramExercise").p("params") as LensBuilder<
                        IState,
                        { key: string },
                        {}
                      >
                    )
                      .pi("key")
                      .record(newKey),
                  ],
                  "Update exercise key in screen params"
                );
              }}
            />
          )}
        </>
      }
    >
      <EditProgramExerciseNavbar
        state={plannerState}
        plannerDispatch={plannerDispatch}
        dispatch={props.dispatch}
        editProgramState={editProgramState}
        settings={props.settings}
        plannerExercise={plannerExercise}
      />
      <div className="mb-4">
        <EditProgramExerciseWarmups
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
        />
      </div>
      <div className="mb-4">
        {ui.isProgressEnabled && (
          <EditProgramExerciseProgress
            ui={plannerState.ui}
            program={plannerState.current.program}
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
          />
        )}
      </div>
      <div className="mb-4">
        {ui.isUpdateEnabled && (
          <EditProgramExerciseUpdate
            ui={plannerState.ui}
            program={plannerState.current.program}
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
          />
        )}
      </div>
      <div className="mb-8">
        <EditProgramExerciseSets
          ui={plannerState.ui}
          evaluatedProgram={evaluatedProgram}
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
        />
      </div>
    </Surface>
  );
}
