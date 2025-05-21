import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseDayExercise } from "./editProgramExerciseDayExercise";
import { Button } from "../button";
import { IconKebab } from "../icons/iconKebab";
import { useState } from "preact/hooks";
import { DropdownMenu, DropdownMenuItem } from "../editProgram/editProgramUi/editProgramUiDropdownMenu";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";

interface IEditProgramExerciseDayProps {
  weekIndex: number;
  dayInWeekIndex: number;
  exerciseKey: string;
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

  return (
    <div className="py-3 bg-white border rounded-2xl border-grayv3-200">
      <div className="flex items-center gap-4 px-4 pb-2">
        <div className="mr-auto text-base font-bold">{day?.name}</div>
        {plannerExercise && !hasSetVariations && (
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
                  isTop={true}
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
          <Button kind="lightgrayv3" className="w-full text-sm" name="edit-exercise-add-to-day">
            + Add exercise
          </Button>
        </div>
      )}
    </div>
  );
}
