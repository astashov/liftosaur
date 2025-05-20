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
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";
import { Weight } from "../../models/weight";
import { useState } from "preact/hooks";
import { UidFactory } from "../../utils/generator";

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
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const [setIds, setSetIds] = useState<string[]>(setVariation.sets.map((set) => UidFactory.generateUid(4)));

  return (
    <div className="border rounded-lg bg-purplev3-50 border-purplev3-150">
      <div className="flex items-center gap-4 px-4 pt-2 pb-1">
        <div className="flex-1 font-semibold">{props.name}</div>
      </div>
      <div className="table w-full overflow-hidden">
        <div className="table-row-group pt-1">
          <div className="table-row text-xs border-b text-grayv2-main border-pubplev3-200">
            <div className="table-cell px-2 py-1 font-normal text-left align-bottom border-b border-purplev3-150">
              Set
            </div>
            {hasMinReps && (
              <>
                <div className="table-cell py-1 font-normal text-center align-bottom border-b border-purplev3-150">
                  Min
                  <br />
                  Reps
                </div>
                <div className="table-cell py-1 text-center border-b border-purplev3-150"></div>
              </>
            )}
            <div className="table-cell py-1 font-normal text-center align-bottom border-b border-purplev3-150">
              {hasMinReps ? (
                <>
                  Max
                  <br />
                  Reps
                </>
              ) : (
                <>Reps</>
              )}
            </div>
            {hasWeight && (
              <>
                <div className="table-cell py-1 text-center border-b border-purplev3-150"></div>
                <div className="table-cell py-1 font-normal text-center align-bottom border-b border-purplev3-150">
                  Weight
                </div>
              </>
            )}
            {hasRpe && (
              <div className="table-cell py-1 font-normal text-center align-bottom border-b border-purplev3-150">
                RPE
              </div>
            )}
            {hasTimer && (
              <div className="table-cell py-1 font-normal text-center align-bottom border-b border-purplev3-150">
                Timer
              </div>
            )}
          </div>
        </div>
        <div className="table-row-group">
          {setVariation.sets.map((set, setIndex) => {
            return (
              <EditProgramExerciseSet
                key={setIds[setIndex]}
                ui={props.ui}
                setIds={setIds}
                setSetIds={setSetIds}
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
          onClick={() => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeCurrentInstance2(
                  program,
                  props.plannerExercise,
                  props.plannerExercise.dayData,
                  props.settings,
                  true,
                  (ex) => {
                    const setVariation = ex.evaluatedSetVariations[props.setVariationIndex];
                    const lastSet = setVariation.sets[setVariation.sets.length - 1];
                    if (lastSet) {
                      setVariation.sets = [...setVariation.sets, ObjectUtils.clone(lastSet)];
                    } else {
                      setVariation.sets = [
                        ...setVariation.sets,
                        {
                          maxrep: 5,
                          weight: Weight.build(100, props.settings.units),
                          isAmrap: false,
                          logRpe: false,
                          askWeight: false,
                          isQuickAddSet: false,
                        },
                      ];
                    }
                  }
                );
              })
            );
            setSetIds((prev) => [...prev, UidFactory.generateUid(4)]);
          }}
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
