import { JSX, h } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { lb } from "lens-shmens";
import { LinkButton } from "../linkButton";

interface IEditProgramExerciseRepeatProps {
  plannerExercise: IPlannerProgramExercise;
  numberOfWeeks: number;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  onRemoveOverride: () => void;
}

export function EditProgramExerciseRepeat(props: IEditProgramExerciseRepeatProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const repeatFrom = plannerExercise.repeating[0] ?? plannerExercise.dayData.week;
  const repeatTo = plannerExercise.repeating[plannerExercise.repeating.length - 1] ?? plannerExercise.dayData.week;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  if (plannerExercise.isRepeat) {
    return (
      <div className="mb-2 text-sm">
        <span>
          Repeating weeks {repeatFrom} - {repeatTo}
        </span>
        <span className="ml-2">
          <LinkButton name="edit-exercise-repeat-remove-override" onClick={props.onRemoveOverride}>
            Remove Override
          </LinkButton>
        </span>
      </div>
    );
  }

  return (
    <label className="flex items-center mb-2">
      <span className="mr-2 text-sm">Repeat from week {repeatFrom} to week: </span>
      <select
        value={repeatTo}
        className="mx-1 border border-border-neutral bg-background-default"
        data-cy="edit-exercise-repeat"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement;
          const value = target.value;
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeRepeating(
                  program,
                  plannerExercise.dayData,
                  numValue,
                  plannerExercise.fullName,
                  props.settings,
                  true
                );
              }),
              "Change repeat week"
            );
          }
        }}
      >
        {Array.from({ length: props.numberOfWeeks }, (_, i) => i + 1).map((w) => {
          return (
            <option value={w} selected={repeatTo === w}>
              {w}
            </option>
          );
        })}
      </select>
    </label>
  );
}
