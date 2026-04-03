import { JSX, useCallback, useState } from "react";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { IDispatch, buildCustomLensDispatch } from "../../ducks/types";
import { IDayData, ISettings } from "../../types";
import { INavCommon, IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "../../navigation/navigationRef";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useNavOptions } from "../../navigation/useNavOptions";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import {
  PlannerProgramExercise_buildProgress,
  PlannerProgramExercise_getProgressDefaultArgs,
} from "../../pages/planner/models/plannerProgramExercise";
import { EditProgramExerciseWarmups } from "./editProgramExerciseWarmups";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IconKebab } from "../icons/iconKebab";
import { DropdownMenu, DropdownMenuItem } from "../dropdownMenu";
import { EditProgramExerciseProgress } from "./editProgramExerciseProgress";
import { EditProgramExerciseUpdate } from "./editProgramExerciseUpdate";
import {
  EditProgramUiHelpers_changeFirstInstance,
  EditProgramUiHelpers_changeAllInstances,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgramExerciseSets } from "./editProgramExerciseSets";
import { BottomSheetEditProgramExerciseSet } from "./bottomSheetEditProgramExerciseSet";
import { EditProgramExerciseNavbar } from "./editProgramExerciseNavbar";
import { EditProgramBottomSheetPicker } from "../editProgram/editProgramBottomSheetPicker";
import { editProgramExerciseTourConfig } from "../tour/editProgramExerciseTourConfig";

interface IProps {
  plannerState: IPlannerExerciseState;
  exerciseKey: string;
  exerciseStateKey: string;
  programId: string;
  dayData: Required<IDayData>;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
  editProgramState: IPlannerState;
}

export function ScreenEditProgramExercise(props: IProps): JSX.Element {
  const { plannerState } = props;

  const plannerDispatch: ILensDispatch<IPlannerExerciseState> = useCallback(
    buildPlannerDispatch(props.dispatch, lb<IState>().p("editProgramExerciseStates").p(props.exerciseStateKey), plannerState),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  const evaluatedProgram = Program_evaluate(plannerState.current.program, props.settings);
  let plannerExercise = evaluatedProgram.weeks[props.dayData.week - 1]?.days[
    props.dayData.dayInWeek - 1
  ].exercises.find((e) => e.key === props.exerciseKey);

  if (!plannerExercise) {
    plannerExercise = Program_getFirstProgramExercise(evaluatedProgram, props.exerciseKey);
  }

  const editProgramState = props.editProgramState;
  const ui = plannerState.ui;
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");

  const exercisePickerState = props.plannerState.ui.exercisePickerState;

  useNavOptions({
    navTitle: "Edit Program Exercise",
    navHelpTourId: editProgramExerciseTourConfig.id,
    navSubtitle: plannerExercise?.notused ? (
      <div className="pb-1">
        <div className="inline-block px-1 ml-3 text-xs font-bold rounded text-text-alwayswhite bg-background-darkgray">
          UNUSED
        </div>
      </div>
    ) : undefined,
    navRightButtons: [
      <div key="kebab" className="flex items-center gap-4">
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
          {isKebabMenuOpen && plannerExercise && (
            <DropdownMenu rightOffset="3rem" onClose={() => setIsKebabMenuOpen(false)}>
              <DropdownMenuItem
                isTop={true}
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
                        return EditProgramUiHelpers_changeFirstInstance(
                          program,
                          plannerExercise,
                          props.settings,
                          true,
                          (e) => {
                            if (plannerState.ui.isProgressEnabled) {
                              e.progress = undefined;
                            } else {
                              const result = PlannerProgramExercise_buildProgress(
                                "lp",
                                PlannerProgramExercise_getProgressDefaultArgs("lp")
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
                      lb<IPlannerExerciseState>().p("ui").p("isUpdateEnabled").record(!plannerState.ui.isUpdateEnabled),
                      lbProgram.recordModify((program) => {
                        return EditProgramUiHelpers_changeFirstInstance(
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
                        return EditProgramUiHelpers_changeAllInstances(
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
    ],
  });

  if (!plannerExercise) {
    return <>No such exercise</>;
  }

  return (
    <>
      <EditProgramExerciseNavbar
        state={plannerState}
        plannerDispatch={plannerDispatch}
        dispatch={props.dispatch}
        editProgramState={editProgramState}
        programId={props.programId}
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
      <BottomSheetEditProgramExerciseSet
        evaluatedProgram={evaluatedProgram}
        ui={plannerState.ui}
        plannerDispatch={plannerDispatch}
        settings={props.settings}
      />
      {exercisePickerState && (
        <EditProgramBottomSheetPicker
          program={plannerState.current.program}
          isLoggedIn={!!props.navCommon.userId}
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
                  .recordModify((ui2) => {
                    return { ...ui2, isUndoing: false };
                  }),
              ],
              "stop-is-undoing"
            );
          }}
          onClose={() => {
            updateState(
              props.dispatch,
              [
                lb<IState>()
                  .p("editProgramExerciseStates")
                  .recordModify((states) => {
                    const current = states[props.exerciseStateKey];
                    if (!current) return states;
                    return { ...states, [props.exerciseStateKey]: { ...current, ui: { ...current.ui, exercisePickerState: undefined } } };
                  }),
              ],
              "Close exercise picker"
            );
          }}
          plannerDispatch={buildCustomLensDispatch(plannerDispatch, lbProgram)}
          pickerDispatch={buildCustomLensDispatch(plannerDispatch, lbUi.pi("exercisePickerState"))}
          dispatch={props.dispatch}
          onNewKey={(newKey) => {
            const oldStateKey = props.exerciseStateKey;
            const newStateKey = `${props.programId}_${newKey}`;
            updateState(
              props.dispatch,
              [
                lb<IState>()
                  .p("editProgramExerciseStates")
                  .recordModify((states) => {
                    const currentState = states[oldStateKey];
                    if (!currentState) return states;
                    const { [oldStateKey]: _, ...rest } = states;
                    return { ...rest, [newStateKey]: { ...currentState, ui: { ...currentState.ui, exercisePickerState: undefined } } };
                  }),
              ],
              "Update exercise key"
            );
            if (navigationRef.isReady()) {
              navigationRef.dispatch(CommonActions.setParams({ key: newKey }));
            }
          }}
        />
      )}
    </>
  );
}
