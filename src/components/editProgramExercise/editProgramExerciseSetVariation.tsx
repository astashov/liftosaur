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
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { useState } from "preact/hooks";
import { UidFactory } from "../../utils/generator";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils } from "../../utils/collection";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";

interface IEditProgramExerciseSetVariationProps {
  name: string;
  areSetVariationsEnabled: boolean;
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
  const [setIds, setSetIds] = useState<string[]>(setVariation.sets.map((set) => UidFactory.generateUid(4)));
  const currentIndex = PlannerProgramExercise.currentEvaluatedSetVariationIndex(props.plannerExercise);
  const additionalFields = [hasMinReps ? 1 : 0, hasWeight ? 1 : 0, hasRpe ? 1 : 0, hasTimer ? 1 : 0].reduce(
    (a, b) => a + b,
    0
  );
  const widthAdd = (4 - additionalFields) * 0.5;

  return (
    <div className="border rounded-lg bg-background-cardpurple border-border-purple">
      <div className="flex items-center gap-4 pt-2 pb-1 pl-4 pr-2">
        <div className="flex-1 font-semibold">{props.name}</div>
        {props.areSetVariationsEnabled && (
          <div className="flex items-center gap-2">
            <div>
              <label className="leading-none">
                <span className="mr-2 text-xs">Is Current?</span>
                <input
                  checked={currentIndex === props.setVariationIndex}
                  className="block align-middle checkbox text-text-link"
                  type="checkbox"
                  onChange={(e) => {
                    EditProgramUiHelpers.changeCurrentInstanceExercise(
                      props.plannerDispatch,
                      props.plannerExercise,
                      props.settings,
                      (ex) => {
                        for (let i = 0; i < ex.evaluatedSetVariations.length; i++) {
                          ex.evaluatedSetVariations[i].isCurrent = i === props.setVariationIndex;
                        }
                      }
                    );
                  }}
                />
              </label>
            </div>
            <button
              className="p-2"
              onClick={() => {
                EditProgramUiHelpers.changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    ex.evaluatedSetVariations = CollectionUtils.removeAt(
                      ex.evaluatedSetVariations,
                      props.setVariationIndex
                    );
                  }
                );
              }}
            >
              <IconTrash />
            </button>
          </div>
        )}
      </div>
      <div className="table w-full overflow-hidden">
        <div className="table-row-group pt-1">
          <div className="table-row text-xs border-b text-text-secondary border-pubplev3-200">
            <div className="table-cell px-2 py-1 font-normal text-left align-bottom border-b border-border-purple">
              Set
            </div>
            {hasMinReps && (
              <>
                <div className="table-cell py-1 font-normal text-center align-bottom border-b border-border-purple">
                  Min
                  <br />
                  Reps
                </div>
                <div className="table-cell py-1 text-center border-b border-border-purple"></div>
              </>
            )}
            <div className="table-cell py-1 font-normal text-center align-bottom border-b border-border-purple">
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
                <div className="table-cell py-1 text-center border-b border-border-purple"></div>
                <div className="table-cell py-1 font-normal text-center align-bottom border-b border-border-purple">
                  Weight
                </div>
              </>
            )}
            {hasRpe && (
              <div className="table-cell py-1 font-normal text-center align-bottom border-b border-border-purple">
                RPE
              </div>
            )}
            {hasTimer && (
              <div className="table-cell py-1 font-normal text-center align-bottom border-b border-border-purple">
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
                widthAdd={widthAdd}
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
          className="flex-1 py-2 m-2 text-xs font-semibold text-center rounded-md bg-background-purpledark text-text-link"
          data-cy="add-set"
          onClick={() => {
            EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                PlannerProgramExercise.addSet(ex, props.setVariationIndex, props.settings);
              }
            );
            setSetIds((prev) => [...prev, UidFactory.generateUid(4)]);
          }}
        >
          <span>
            <IconPlus2 size={10} className="inline-block" color={Tailwind.colors().blue[400]} />
          </span>
          <span className="ml-2">Add Set</span>
        </button>
      </div>
    </div>
  );
}
