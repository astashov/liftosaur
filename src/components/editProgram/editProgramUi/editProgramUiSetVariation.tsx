import { JSX, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Weight } from "../../../models/weight";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";
import {
  IPlannerProgramExercise,
  IPlannerState,
  IPlannerProgramExerciseSet,
} from "../../../pages/planner/models/types";
import { IDayData, IExerciseType, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { DraggableList } from "../../draggableList";
import { GroupHeader } from "../../groupHeader";
import { IconHandle } from "../../icons/iconHandle";
import { IconKebab } from "../../icons/iconKebab";
import { SetNumber } from "../editProgramSets";
import { NumInput, WeightInput } from "./editProgramUiInputs";
import { IconTrash } from "../../icons/iconTrash";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";
import { lb } from "lens-shmens";
import { LinkButton } from "../../linkButton";
import { DropdownMenu, DropdownMenuItem } from "./editProgramUiDropdownMenu";

interface IEditProgramUiSetVariationProps {
  plannerExercise: IPlannerProgramExercise;
  dayData: Required<IDayData>;
  index: number;
  disabled: boolean;
  exerciseLine: number;
  showHeader: boolean;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiSetVariation(props: IEditProgramUiSetVariationProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const sets = PlannerProgramExercise.sets(plannerExercise, props.index);
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");

  function modify(cb: (ex: IPlannerProgramExercise) => void): void {
    if (props.disabled) {
      return;
    }
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance(
          program,
          props.dayData,
          plannerExercise.fullName,
          props.settings,
          cb
        );
      })
    );
  }

  return (
    <div>
      {props.showHeader && (
        <GroupHeader
          highlighted={true}
          name={`Set Variation ${props.index + 1}`}
          rightAddOn={
            <div>
              <button
                className="px-1 py-2 nm-delete-set-variation"
                onClick={() => {
                  modify((ex) => {
                    ex.setVariations.splice(props.index, 1);
                  });
                }}
              >
                <IconTrash />
              </button>
            </div>
          }
        />
      )}
      <DraggableList
        hideBorders={true}
        mode="vertical"
        items={sets}
        element={(set, setIndex, handleTouchStart) => {
          return (
            <SetRow
              disabled={props.disabled}
              handleTouchStart={handleTouchStart}
              exerciseType={PlannerProgramExercise.getExercise(plannerExercise, props.settings)}
              set={set}
              isOnlySet={sets.length === 1}
              onUpdate={(newSet) => {
                modify((ex) => {
                  if (newSet) {
                    ex.setVariations[props.index].sets[setIndex] = newSet;
                  } else {
                    ex.setVariations[props.index].sets.splice(setIndex, 1);
                  }
                });
              }}
              settings={props.settings}
              index={setIndex}
            />
          );
        }}
        onDragEnd={(startIndex, endIndex) => {
          modify((ex) => {
            const set = ex.setVariations[props.index].sets[startIndex];
            ex.setVariations[props.index].sets.splice(startIndex, 1);
            ex.setVariations[props.index].sets.splice(endIndex, 0, set);
          });
        }}
      />
      {!props.disabled && (
        <div>
          <LinkButton
            className="text-xs"
            data-cy="edit-exercise-set-group-add"
            name="add-set-group"
            onClick={() => {
              modify((ex) => {
                ex.setVariations[props.index].sets.push({
                  repRange: { isAmrap: false, isQuickAddSet: false, maxrep: 1, numberOfSets: 1 },
                  weight: Weight.build(100, props.settings.units),
                });
              });
            }}
          >
            Add Set Group
          </LinkButton>
        </div>
      )}
    </div>
  );
}

interface ISetRowProps {
  set: IPlannerProgramExerciseSet;
  disabled?: boolean;
  exerciseType?: IExerciseType;
  index: number;
  isOnlySet: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onUpdate: (newSet: IPlannerProgramExerciseSet | undefined) => void;
  settings: ISettings;
}

function SetRow(props: ISetRowProps): JSX.Element | null {
  const set = props.set;
  const rawWeight = set.percentage || set.weight;
  let weight = typeof rawWeight === "number" ? Weight.buildPct(rawWeight) : rawWeight;
  const isDefaultWeight = weight == null;

  const repRange = set.repRange;
  if (!repRange) {
    return null;
  }
  weight = weight ?? Weight.buildPct(Math.round(Weight.rpeMultiplier(repRange.maxrep ?? 0, set.rpe ?? 10) * 100));
  const [showMinReps, setShowMinReps] = useState(repRange.minrep != null);
  const [showRpe, setShowRpe] = useState(set.rpe != null);
  const [showTimer, setShowTimer] = useState(set.timer != null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLabel, setShowLabel] = useState(!!set.label);

  return (
    <div className={` mb-1 ${props.index ? "pt-1 border-t border-grayv2-100" : ""}`}>
      <div className="flex items-center">
        {!props.isOnlySet && !props.disabled && (
          <div
            className="p-2 cursor-move nm-reorder-set-variations"
            style={{ touchAction: "none", marginLeft: "-0.5rem" }}
          >
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
        )}
        <div>
          <SetNumber setIndex={props.index} size="sm" />
        </div>
        <div className="flex-1 ml-3 text-sm">Set Group</div>
        <div className="flex items-center">
          <div className="relative">
            <button
              className={`px-1 py-2 ${props.disabled ? "opacity-50 cursor-not-allowed nm-set-group-options" : ""}`}
              data-cy="edit-exercise-set-group-more"
              onClick={() => {
                if (!props.disabled) {
                  setShowMenu(true);
                }
              }}
            >
              <IconKebab />
            </button>
            {showMenu && (
              <DropdownMenu onClose={() => setShowMenu(false)}>
                <DropdownMenuItem
                  data-cy="edit-exercise-set-group-more-toggle-label"
                  isTop={true}
                  onClick={() => {
                    props.onUpdate({ ...set, label: showLabel ? undefined : set.label });
                    setShowLabel(!showLabel);
                    setShowMenu(false);
                  }}
                >
                  {showLabel ? "Disable" : "Enable"} Label
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-exercise-set-group-more-toggle-rpe"
                  onClick={() => {
                    props.onUpdate({ ...set, logRpe: showRpe ? false : set.logRpe, rpe: showRpe ? undefined : 8 });
                    setShowRpe(!showRpe);
                    setShowMenu(false);
                  }}
                >
                  {showRpe ? "Disable" : "Enable"} RPE
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-exercise-set-group-more-toggle-timer"
                  onClick={() => {
                    props.onUpdate({ ...set, timer: showTimer ? undefined : 180 });
                    setShowTimer(!showTimer);
                    setShowMenu(false);
                  }}
                >
                  {showTimer ? "Disable" : "Enable"} Timer
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-exercise-set-group-more-toggle-rep-range"
                  onClick={() => {
                    if (showMinReps) {
                      props.onUpdate({ ...set, repRange: { ...repRange, minrep: undefined } });
                    } else {
                      props.onUpdate({ ...set, repRange: { ...repRange, minrep: repRange.maxrep } });
                    }
                    setShowMinReps(!showMinReps);
                    setShowMenu(false);
                  }}
                >
                  {showMinReps ? "Disable" : "Enable"} Rep Ranges
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
          <div className="ml-2">
            <button
              data-cy="edit-exercise-set-delete"
              className={`px-1 py-2 ${props.disabled ? "opacity-50 cursor-not-allowed nm-set-variation-delete" : ""}`}
              onClick={() => {
                props.onUpdate(undefined);
              }}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </div>
      {showLabel && (
        <label className="flex items-center">
          <span className="mr-2 text-sm">Label:</span>
          <input
            className="w-full p-1 text-sm text-center border rounded border-grayv2-200"
            maxLength={8}
            value={set.label}
            type="text"
            data-cy="edit-exercise-set-label"
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              const value = target.value;
              if (!props.disabled) {
                props.onUpdate({ ...set, label: value });
              }
            }}
          />
        </label>
      )}
      <div className="flex gap-1 text-xs">
        <div style={{ flex: 4 }}>Sets</div>
        {!showMinReps && <div style={{ flex: 4 }}>Reps</div>}
        <div style={{ flex: 8 }}>Weight</div>
      </div>
      <div className="flex items-center gap-1">
        <div style={{ flex: 4 }}>
          <NumInput
            name="edit-exercise-numofsets"
            disabled={props.disabled}
            value={repRange.numberOfSets}
            min={0}
            onUpdate={(val) => props.onUpdate({ ...set, repRange: { ...repRange, numberOfSets: val ?? 1 } })}
          />
        </div>
        {!showMinReps && (
          <div style={{ flex: 4 }}>
            <NumInput
              name="edit-exercise-minreps"
              disabled={props.disabled}
              min={0}
              value={repRange.maxrep}
              onUpdate={(val) => props.onUpdate({ ...set, repRange: { ...repRange, maxrep: val ?? 1 } })}
            />
          </div>
        )}
        <div style={{ flex: 8 }}>
          <WeightInput
            name="edit-exercise-set-weight"
            disabled={props.disabled}
            dimmed={isDefaultWeight}
            value={weight}
            settings={props.settings}
            exerciseType={props.exerciseType}
            onUpdate={(val) => {
              const newWeight = Weight.isPct(val) ? { ...set, percentage: val.value } : { ...set, weight: val };
              props.onUpdate(newWeight);
            }}
          />
        </div>
      </div>
      {showMinReps && (
        <>
          <div className="flex gap-1 text-xs">
            <div style={{ flex: 4 }}>Min Reps</div>
            <div style={{ flex: 4 }}>Max Reps</div>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ flex: 4 }}>
              <NumInput
                name="edit-exercise-set-minreps"
                disabled={props.disabled}
                min={0}
                value={repRange.minrep}
                onUpdate={(val) => props.onUpdate({ ...set, repRange: { ...repRange, minrep: val ?? 1 } })}
              />
            </div>
            <div style={{ flex: 4 }}>
              <NumInput
                name="edit-exercise-set-maxreps"
                disabled={props.disabled}
                min={0}
                value={repRange.maxrep}
                onUpdate={(val) => props.onUpdate({ ...set, repRange: { ...repRange, maxrep: val ?? 1 } })}
              />
            </div>
          </div>
        </>
      )}
      {(showRpe || showTimer) && (
        <>
          <div className="flex gap-1 text-xs">
            {showRpe && <div style={{ flex: 5 }}>Rpe</div>}
            {showTimer && <div style={{ flex: 5 }}>Timer, s</div>}
          </div>
          <div className="flex items-center gap-1">
            {showRpe && set.rpe != null && (
              <div style={{ flex: 5 }}>
                <NumInput
                  name="edit-exercise-set-rpe"
                  disabled={props.disabled}
                  min={0}
                  max={10}
                  step={0.5}
                  value={set.rpe}
                  onUpdate={(val) => props.onUpdate({ ...set, rpe: val })}
                />
              </div>
            )}
            {showTimer && set.timer != null && (
              <div style={{ flex: 5 }}>
                <NumInput
                  name="edit-exercise-set-timer"
                  min={0}
                  step={5}
                  disabled={props.disabled}
                  value={set.timer}
                  onUpdate={(val) => props.onUpdate({ ...set, timer: val })}
                />
              </div>
            )}
          </div>
        </>
      )}
      <div className={`text-xs flex items-center gap-4 mt-2 ${props.disabled ? "opacity-50" : ""}`}>
        <label className="flex items-center">
          <div className="leading-none">
            <input
              disabled={props.disabled}
              checked={repRange.isAmrap}
              data-cy="edit-exercise-set-group-amrap"
              className="block align-middle checkbox text-bluev2"
              type="checkbox"
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                props.onUpdate({ ...set, repRange: { ...repRange, isAmrap: target.checked } });
              }}
            />
          </div>
          <div className="ml-1 leading-none">AMRAP?</div>
        </label>
        <label className="flex items-center">
          <div className="leading-none">
            <input
              disabled={props.disabled}
              checked={set.askWeight}
              data-cy="edit-exercise-set-group-ask-weight"
              className="block align-middle checkbox text-bluev2"
              type="checkbox"
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                props.onUpdate({ ...set, askWeight: target.checked });
              }}
            />
          </div>
          <div className="ml-1 leading-none">Ask Weight?</div>
        </label>
        {set.rpe != null && (
          <label className="flex items-center">
            <div className="leading-none">
              <input
                disabled={props.disabled}
                data-cy="edit-exercise-set-group-log-rpe"
                checked={set.logRpe}
                className="block align-middle checkbox text-bluev2"
                type="checkbox"
                onChange={(e) => {
                  const target = e.target as HTMLInputElement;
                  props.onUpdate({ ...set, logRpe: target.checked });
                }}
              />
            </div>
            <div className="ml-1 leading-none">Log RPE?</div>
          </label>
        )}
      </div>
    </div>
  );
}
