import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { IExerciseType, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program } from "../../models/program";
import { EditProgramExerciseDayExercise } from "./editProgramExerciseDayExercise";
import { Button } from "../button";
import { IconKebab } from "../icons/iconKebab";
import { useState } from "preact/hooks";
import { DropdownMenu, DropdownMenuItem } from "../editProgram/editProgramUi/editProgramUiDropdownMenu";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";
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

  return (
    <div className="py-3 bg-white border rounded-2xl border-grayv3-200">
      <div className="flex items-center gap-4 px-4 pb-2">
        <div className="mr-auto text-base font-bold">{day?.name}</div>
        {plannerExercise && (
          <div className="relative flex items-center">
            <button
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
                    EditProgramUiHelpers.changeCurrentInstanceExercise(
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
                    data-cy="program-exercise-toggle-update"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      EditProgramUiHelpers.changeCurrentInstanceExercise(
                        props.plannerDispatch,
                        plannerExercise,
                        props.settings,
                        (ex) => {
                          const lastSetVariation = ObjectUtils.clone(ex.evaluatedSetVariations[0]);
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
                      day: Program.getDayNumber(props.evaluatedProgram, props.weekIndex, props.dayInWeekIndex),
                    };
                    props.plannerDispatch(
                      lbProgram.recordModify((program) => {
                        return EditProgramUiHelpers.deleteCurrentInstance(
                          program,
                          dayData,
                          props.fullName,
                          props.settings,
                          true,
                          false
                        );
                      })
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>Delete At This Day</div>
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
          plannerExercise={plannerExercise}
          evaluatedProgram={props.evaluatedProgram}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
        />
      ) : (
        <div className="px-4 text-sm text-grayv3-main">
          <Button
            kind="lightgrayv3"
            className="w-full text-sm"
            name="edit-exercise-add-to-day"
            onClick={() => {
              const dayData = {
                week: props.weekIndex + 1,
                dayInWeek: props.dayInWeekIndex + 1,
                day: Program.getDayNumber(props.evaluatedProgram, props.weekIndex, props.dayInWeekIndex),
              };
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.addInstance(
                    program,
                    dayData,
                    props.fullName,
                    props.exerciseType,
                    props.settings
                  );
                })
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
