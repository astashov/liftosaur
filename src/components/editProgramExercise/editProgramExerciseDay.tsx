import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { IExerciseType, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program_getDayNumber } from "../../models/program";
import { EditProgramExerciseDayExercise } from "./editProgramExerciseDayExercise";
import { Button } from "../button";
import { IconKebab } from "../icons/iconKebab";
import { useState } from "preact/hooks";
import { DropdownMenu, DropdownMenuItem } from "../dropdownMenu";
import {
  EditProgramUiHelpers_changeCurrentInstanceExercise,
  EditProgramUiHelpers_deleteCurrentInstance,
  EditProgramUiHelpers_changeRepeating,
  EditProgramUiHelpers_addInstance,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils_clone } from "../../utils/object";
import { lb } from "lens-shmens";

interface IEditProgramExerciseDayProps {
  weekIndex: number;
  dayInWeekIndex: number;
  exerciseKey: string;
  fullName: string;
  exerciseType?: IExerciseType;
  evaluatedProgram: IEvaluatedProgram;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDay(props: IEditProgramExerciseDayProps): JSX.Element {
  const day = props.evaluatedProgram.weeks[props.weekIndex].days[props.dayInWeekIndex];
  const plannerExercise = day?.exercises.find((exercise) => exercise.key === props.exerciseKey);
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const hasSetVariations = (plannerExercise?.evaluatedSetVariations.length ?? 0) > 1;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const areDescriptionsEnabled =
    plannerExercise?.descriptions.reuse != null || (plannerExercise?.descriptions.values.length ?? 0) > 0;
  const [showRepeat, setShowRepeat] = useState((plannerExercise?.repeating.length ?? 0) > 0);
  const [showOrder, setShowOrder] = useState((plannerExercise?.order ?? 0) !== 0);
  const [showSupersets, setShowSupersets] = useState(plannerExercise?.superset != null);

  return (
    <div
      className="py-3 border bg-background-default rounded-2xl border-border-neutral"
      data-cy={`edit-day-${props.weekIndex + 1}-${props.dayInWeekIndex + 1}`}
    >
      <div className="flex items-center gap-4 px-4 pb-2">
        <div className="mr-auto text-base font-bold">{day?.name}</div>
        {plannerExercise && !plannerExercise.isRepeat && (
          <div className="relative flex items-center">
            <button
              data-cy="day-kebab-menu"
              className="p-2"
              onClick={() => {
                setIsKebabMenuOpen(!isKebabMenuOpen);
              }}
            >
              <IconKebab />
            </button>
            {isKebabMenuOpen && (
              <DropdownMenu rightOffset="3rem" onClose={() => setIsKebabMenuOpen(false)}>
                <DropdownMenuItem
                  data-cy="program-exercise-toggle-descriptions"
                  isTop={true}
                  onClick={() => {
                    setIsKebabMenuOpen(false);
                    EditProgramUiHelpers_changeCurrentInstanceExercise(
                      props.plannerDispatch,
                      plannerExercise,
                      props.settings,
                      (ex) => {
                        if (areDescriptionsEnabled) {
                          ex.descriptions = { values: [] };
                        } else {
                          ex.descriptions = { values: [{ isCurrent: true, value: "" }] };
                        }
                      }
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>{areDescriptionsEnabled ? "Disable" : "Enable"} Descriptions</div>
                  </div>
                </DropdownMenuItem>
                {!hasSetVariations && (
                  <DropdownMenuItem
                    data-cy="program-exercise-toggle-set-variations"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      EditProgramUiHelpers_changeCurrentInstanceExercise(
                        props.plannerDispatch,
                        plannerExercise,
                        props.settings,
                        (ex) => {
                          const lastSetVariation = ObjectUtils_clone(ex.evaluatedSetVariations[0]);
                          ex.evaluatedSetVariations.push(lastSetVariation);
                        }
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>Enable Set Variations</div>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-cy="program-exercise-delete-at-this-day"
                  onClick={() => {
                    const dayData = {
                      week: props.weekIndex + 1,
                      dayInWeek: props.dayInWeekIndex + 1,
                      day: Program_getDayNumber(props.evaluatedProgram, props.weekIndex, props.dayInWeekIndex),
                    };
                    props.plannerDispatch(
                      lbProgram.recordModify((program) => {
                        return EditProgramUiHelpers_deleteCurrentInstance(
                          program,
                          dayData,
                          props.fullName,
                          props.settings,
                          true,
                          false
                        );
                      }),
                      "Delete exercise from day"
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>Delete At This Day</div>
                  </div>
                </DropdownMenuItem>
                {props.evaluatedProgram.weeks.length > 1 && (
                  <DropdownMenuItem
                    data-cy="program-exercise-toggle-repeating"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      if (showRepeat) {
                        props.plannerDispatch(
                          lbProgram.recordModify((program) => {
                            return EditProgramUiHelpers_changeRepeating(
                              program,
                              plannerExercise.dayData,
                              plannerExercise.dayData.week,
                              plannerExercise.fullName,
                              props.settings,
                              true
                            );
                          }),
                          "Disable repeating"
                        );
                      }
                      setShowRepeat(!showRepeat);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>{showRepeat ? "Disable" : "Enable"} Repeating</div>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-cy="edit-menu-exercise-toggle-order"
                  onClick={() => {
                    if (showOrder) {
                      EditProgramUiHelpers_changeCurrentInstanceExercise(
                        props.plannerDispatch,
                        plannerExercise,
                        props.settings,
                        (ex) => {
                          ex.order = 0;
                        }
                      );
                    }
                    setShowOrder(!showOrder);
                    setIsKebabMenuOpen(false);
                  }}
                >
                  {plannerExercise.order !== 0 ? "Disable" : "Enable"} Forced Order
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-menu-exercise-toggle-supersets"
                  onClick={() => {
                    if (showSupersets) {
                      EditProgramUiHelpers_changeCurrentInstanceExercise(
                        props.plannerDispatch,
                        plannerExercise,
                        props.settings,
                        (ex) => {
                          ex.superset = undefined;
                        }
                      );
                    }
                    setShowSupersets(!showSupersets);
                    setIsKebabMenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {plannerExercise.superset != null ? "Disable" : "Enable"} Superset
                  </div>
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
      {plannerExercise ? (
        <EditProgramExerciseDayExercise
          ui={props.ui}
          showSupersets={showSupersets}
          showRepeat={showRepeat}
          showOrder={showOrder}
          plannerExercise={plannerExercise}
          evaluatedProgram={props.evaluatedProgram}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
        />
      ) : (
        <div className="px-4 text-sm text-text-secondary">
          <Button
            kind="lightgrayv3"
            className="w-full text-sm"
            name="edit-exercise-add-to-day"
            onClick={() => {
              const dayData = {
                week: props.weekIndex + 1,
                dayInWeek: props.dayInWeekIndex + 1,
                day: Program_getDayNumber(props.evaluatedProgram, props.weekIndex, props.dayInWeekIndex),
              };
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers_addInstance(
                    program,
                    dayData,
                    props.fullName,
                    props.exerciseType,
                    props.settings
                  );
                }),
                "Add exercise to day"
              );
            }}
          >
            + Add exercise
          </Button>
        </div>
      )}
    </div>
  );
}
