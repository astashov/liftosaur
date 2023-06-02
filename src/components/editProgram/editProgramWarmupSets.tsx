import { IProgramExercise, ISettings, IProgramExerciseWarmupSet } from "../../types";
import { h, JSX } from "preact";
import { Exercise, IExercise } from "../../models/exercise";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { GroupHeader } from "../groupHeader";
import { LinkButton } from "../linkButton";
import { Weight } from "../../models/weight";
import { inputClassName, selectInputOnFocus } from "../input";
import { IconTrash } from "../icons/iconTrash";
import { SendMessage } from "../../utils/sendMessage";

interface IEditProgramWarmupSetsProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  onSetDefaultWarmupSets: (exercise: IExercise) => void;
  onAddWarmupSet: (warmupSets: IProgramExerciseWarmupSet[]) => void;
  onUpdateWarmupSet: (
    warmupSets: IProgramExerciseWarmupSet[],
    index: number,
    newWarmupSet: IProgramExerciseWarmupSet
  ) => void;
  onRemoveWarmupSet: (warmupSets: IProgramExerciseWarmupSet[], index: number) => void;
}

export function EditProgramWarmupSets(props: IEditProgramWarmupSetsProps): JSX.Element {
  const exercise = Exercise.get(props.programExercise.exerciseType, props.settings.exercises);
  const warmupSets = props.programExercise.warmupSets;
  useEffect(() => {
    if (warmupSets == null) {
      props.onSetDefaultWarmupSets(exercise);
    }
  });
  return (
    <section>
      <GroupHeader
        name="Warmup Sets"
        help={
          <p>
            You can configure warmup sets for exercise either as percentage of weight of first set, or just as a number
            of lb/kg. For each warmup set, you can configure condition - after what first weight set it will appear.
            E.g. <strong>3 x 50% if &gt; 95 lb</strong> means 3 reps with half of the weight of the first set, and it
            will only appear if the weight of the first set is more than <strong>95 lb</strong>.
          </p>
        }
      />
      {(warmupSets || []).map((_, index) => {
        return (
          <EditWarmupSet
            exercise={exercise}
            warmupSets={warmupSets || []}
            index={index}
            settings={props.settings}
            onRemoveWarmupSet={props.onRemoveWarmupSet}
            onUpdateWarmupSet={props.onUpdateWarmupSet}
          />
        );
      })}
      <div>
        <LinkButton
          data-cy="edit-warmup-set-add"
          onClick={() => {
            props.onAddWarmupSet(warmupSets || []);
          }}
        >
          Add Warmup Set
        </LinkButton>
      </div>
    </section>
  );
}

interface IEditWarmupSetProps {
  exercise: IExercise;
  warmupSets: IProgramExerciseWarmupSet[];
  index: number;
  settings: ISettings;
  onUpdateWarmupSet: (
    warmupSets: IProgramExerciseWarmupSet[],
    index: number,
    newWarmupSet: IProgramExerciseWarmupSet
  ) => void;
  onRemoveWarmupSet: (warmupSets: IProgramExerciseWarmupSet[], index: number) => void;
}

function EditWarmupSet(props: IEditWarmupSetProps): JSX.Element {
  const warmupSet = props.warmupSets[props.index];
  const isPercent = typeof warmupSet.value === "number";
  const weightValue = typeof warmupSet.value === "number" ? warmupSet.value : warmupSet.value.value;
  const unit = typeof warmupSet.value !== "number" ? warmupSet.value.unit : props.settings.units;
  const threshold = warmupSet.threshold;

  const repsRef = useRef<HTMLInputElement>();
  const valueRef = useRef<HTMLInputElement>();
  const valueUnitRef = useRef<HTMLSelectElement>();
  const thresholdRef = useRef<HTMLInputElement>();

  const onUpdate = useCallback(() => {
    const newUnit = valueUnitRef.current.value as "%" | "kg" | "lb";
    const newReps = parseInt(repsRef.current.value, 10);
    const numValue = parseInt(valueRef.current.value, 10);
    const thresholdValue = parseFloat(thresholdRef.current.value);
    if (!isNaN(numValue) && !isNaN(thresholdValue) && !isNaN(newReps)) {
      const value = newUnit === "%" ? numValue / 100 : Weight.build(numValue, newUnit);
      const newWarmupSet: IProgramExerciseWarmupSet = {
        reps: newReps,
        value,
        threshold: Weight.build(thresholdValue, props.settings.units),
      };
      props.onUpdateWarmupSet(props.warmupSets, props.index, newWarmupSet);
    }
  }, [props.warmupSets, props.index]);

  return (
    <div className="flex items-center" data-cy="edit-warmup-set">
      <div>
        <input
          data-cy="edit-warmup-set-reps"
          ref={repsRef}
          onFocus={selectInputOnFocus}
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type="tel"
          min="0"
          value={warmupSet.reps}
          onBlur={onUpdate}
        />
      </div>
      <div className="px-2">x</div>
      <div>
        <input
          data-cy="edit-warmup-set-value"
          ref={valueRef}
          onFocus={selectInputOnFocus}
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type={SendMessage.isIos() ? "number" : "tel"}
          min="0"
          value={isPercent ? weightValue * 100 : weightValue}
          onBlur={onUpdate}
        />
      </div>
      <div>
        <select ref={valueUnitRef} onChange={onUpdate} data-cy="edit-warmup-set-value-unit">
          {["%", unit].map((u) => (
            <option value={u} selected={isPercent ? u === "%" : u === unit}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="px-2 whitespace-no-wrap">if &gt;</div>
      <div>
        <input
          data-cy="edit-warmup-set-threshold"
          min="0"
          step="0.01"
          onFocus={selectInputOnFocus}
          onBlur={onUpdate}
          ref={thresholdRef}
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type={SendMessage.isIos() ? "number" : "tel"}
          value={threshold.value}
        />
      </div>
      <div className="px-2">{threshold.unit}</div>
      <button
        className="p-4"
        data-cy="edit-warmup-set-delete"
        onClick={() => {
          props.onRemoveWarmupSet(props.warmupSets || [], props.index);
        }}
      >
        <IconTrash />
      </button>
    </div>
  );
}
