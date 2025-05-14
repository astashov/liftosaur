import { h, JSX, Fragment } from "preact";
import {
  IPlannerExerciseState,
  IPlannerExerciseUi,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSetVariation,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind } from "../../utils/tailwindConfig";
import { EditProgramExerciseSet } from "./editProgramExerciseSet";

interface IEditProgramExerciseSetVariationProps {
  name: string;
  plannerExercise: IPlannerProgramExercise;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  setVariationIndex: number;
  setVariation: IPlannerProgramExerciseEvaluatedSetVariation;
  settings: ISettings;
}

export function EditProgramExerciseSetVariation(props: IEditProgramExerciseSetVariationProps): JSX.Element {
  const { setVariation } = props;
  const hasRpe = props.setVariation.sets.some((set) => set.rpe != null);
  const hasWeight = props.setVariation.sets.some((set) => set.weight != null);
  const hasMinReps = props.setVariation.sets.some((set) => set.minrep != null);
  const hasTimer = props.setVariation.sets.some((set) => set.timer != null);

  return (
    <div className="border rounded-lg bg-purplev3-50 border-purplev3-150">
      <div className="flex items-center gap-4 px-4 pt-2 pb-1">
        <div className="flex-1 font-semibold">{props.name}</div>
      </div>
      <div className="table w-full overflow-hidden">
        <div className="table-row-group pt-1">
          <div className="table-row text-xs border-b text-grayv2-main border-pubplev3-200">
            <div className="table-cell px-2 py-1 font-normal text-left border-b border-purplev3-150">Set</div>
            {hasMinReps && (
              <div className="table-cell py-1 font-normal text-center border-b border-purplev3-150">Min Reps</div>
            )}
            <div className="table-cell py-1 font-normal text-center border-b border-purplev3-150">
              {hasMinReps ? "Max Reps" : "Reps"}
            </div>
            {hasWeight && (
              <>
                <div className="table-cell py-1 text-center border-b border-purplev3-150"></div>
                <div className="table-cell py-1 pr-4 font-normal text-center border-b border-purplev3-150">Weight</div>
              </>
            )}
            {hasRpe && <div className="table-cell py-1 font-normal text-center border-b border-purplev3-150">RPE</div>}
            {hasTimer && (
              <div className="table-cell py-1 font-normal text-center border-b border-purplev3-150">Timer</div>
            )}
          </div>
        </div>
        <div className="table-row-group">
          {setVariation.sets.map((set, setIndex) => {
            return (
              <EditProgramExerciseSet
                key={setIndex}
                ui={props.ui}
                set={set}
                setIndex={setIndex}
                setVariationIndex={props.setVariationIndex}
                plannerExercise={props.plannerExercise}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
                opts={{
                  hasMinReps: hasMinReps,
                  hasWeight: hasWeight,
                  hasRpe: hasRpe,
                  hasTimer: hasTimer,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex">
        <button
          className="flex-1 py-2 m-2 text-xs font-semibold text-center rounded-md bg-purplev3-100 text-bluev3-main"
          data-cy="add-set"
          onClick={() => {}}
        >
          <span>
            <IconPlus2 size={10} className="inline-block" color={Tailwind.colors().bluev3.main} />
          </span>
          <span className="ml-2">Add Set</span>
        </button>
      </div>
    </div>
  );
}
