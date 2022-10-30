import { h, JSX, Fragment } from "preact";
import { Program } from "../../models/program";
import { GroupHeader } from "../groupHeader";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { ObjectUtils } from "../../utils/object";
import { History } from "../../models/history";
import { Weight } from "../../models/weight";
import { MultiLineTextEditor } from "./multiLineTextEditor";
import { Button } from "../button";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { EditProgram } from "../../models/editProgram";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IEither } from "../../utils/types";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { IconDelete } from "../icons/iconDelete";
import { DraggableList } from "../draggableList";
import { IconHandle } from "../icons/iconHandle";
import { SemiButton } from "../semiButton";
import { IconEdit } from "../icons/iconEdit";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { ModalExercise } from "../modalExercise";
import { Exercise, equipmentName, IExercise } from "../../models/exercise";
import { InternalLink } from "../../internalLink";
import { IconQuestion } from "../icons/iconQuestion";
import { ExerciseImage } from "../exerciseImage";
import { ModalSubstitute } from "../modalSubstitute";
import {
  ISettings,
  IProgramDay,
  IProgramExercise,
  IHistoryRecord,
  IHistoryEntry,
  IEquipment,
  IUnit,
  IProgramSet,
  IProgramState,
  IWeight,
  IProgramExerciseWarmupSet,
} from "../../types";
import { Playground } from "../playground";
import { inputClassName } from "../input";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  programName: string;
  dispatch: IDispatch;
}

function buildProgress(
  programExercise: IProgramExercise,
  day: number,
  settings: ISettings
): IHistoryRecord | undefined {
  let entry: IHistoryEntry | undefined;
  let variationIndex = 0;
  try {
    variationIndex = Program.nextVariationIndex(programExercise, day, settings);
  } catch (_) {}
  try {
    entry = Program.nextHistoryEntry(
      programExercise.exerciseType,
      day,
      programExercise.variations[variationIndex].sets,
      programExercise.state,
      settings,
      programExercise.warmupSets
    );
  } catch (e) {
    entry = undefined;
  }
  return entry != null ? History.buildFromEntry(entry, day) : undefined;
}

export function EditProgramExerciseAdvanced(props: IProps): JSX.Element {
  const { programExercise } = props;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [variationIndex, setVariationIndex] = useState<number>(0);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    buildProgress(programExercise, 1, props.settings)
  );

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [showModalSubstitute, setShowModalSubstitute] = useState<boolean>(false);

  useEffect(() => {
    if (props.programExercise !== prevProps.current.programExercise) {
      setProgress(buildProgress(programExercise, progress?.day || 1, props.settings));
    }
    prevProps.current = props;
  });
  const entry = progress?.entries[0];
  const day = progress?.day ?? 1;

  const finishScriptResult =
    entry != null
      ? Program.runExerciseFinishDayScript(
          entry,
          day,
          props.settings,
          programExercise.state,
          programExercise.finishDayExpr,
          entry?.exercise?.equipment
        )
      : Program.parseExerciseFinishDayScript(day, props.settings, programExercise.state, programExercise.finishDayExpr);
  const finishEditorResult: IEither<number | undefined, string> = finishScriptResult.success
    ? { success: true, data: undefined }
    : finishScriptResult;

  const variationScriptResult = Program.runVariationScript(programExercise, day, props.settings);

  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments(
    programExercise.exerciseType.id
  ).map((e) => [e, equipmentName(e)]);

  return (
    <div>
      <p className="px-6 py-1 text-xs italic">
        This is advanced exercise editing screen. It is very flexible, but you may want to read{" "}
        <InternalLink href="/docs/docs.html" className="text-blue-700 underline">
          Documentation
        </InternalLink>{" "}
        first to get familiar with the <strong>state variables</strong>, <strong>variations</strong> and{" "}
        <strong>Liftoscript scripting language</strong>.
      </p>
      <MenuItem
        name="Exercise"
        value={
          <Fragment>
            <button data-cy="select-exercise" className="px-4 align-middle" onClick={() => setShowModalExercise(true)}>
              <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
            </button>
            <span>{Exercise.get(programExercise.exerciseType, props.settings.exercises).name}</span>
            <div className="text-xs text-blue-700 underline" onClick={() => setShowModalSubstitute(true)}>
              Substitute
            </div>
          </Fragment>
        }
      />
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={programExercise.exerciseType.equipment || ""}
        values={equipmentOptions}
        onChange={(newEquipment) => {
          EditProgram.changeExerciseEquipment(props.dispatch, newEquipment ? (newEquipment as IEquipment) : undefined);
        }}
      />
      <MenuItemWrapper name="exercise-image">
        <ExerciseImage
          key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
          exerciseType={programExercise.exerciseType}
          customExercises={props.settings.exercises}
          size="large"
        />
      </MenuItemWrapper>
      <MenuItemEditable
        type="text"
        name="Name"
        value={programExercise.name}
        onChange={(newName) => {
          EditProgram.changeExerciseName(props.dispatch, newName);
        }}
      />
      <Variations
        variationIndex={variationIndex}
        programExercise={programExercise}
        dispatch={props.dispatch}
        onChangeVariation={(i) => setVariationIndex(i)}
      />
      {programExercise.variations.length > 1 && (
        <VariationsEditor
          programExercise={programExercise}
          editorResult={variationScriptResult}
          dispatch={props.dispatch}
        />
      )}
      <EditState
        dispatch={props.dispatch}
        programExercise={programExercise}
        onAddStateVariable={() => {
          setShouldShowAddStateVariable(true);
        }}
      />
      <Sets
        variationIndex={variationIndex}
        settings={props.settings}
        day={day}
        programExercise={programExercise}
        onRemoveVariation={() => {
          setVariationIndex(Math.max(variationIndex - 1, 0));
        }}
        dispatch={props.dispatch}
      />
      <EditWarmupSets dispatch={props.dispatch} programExercise={programExercise} settings={props.settings} />
      {progress && entry && (
        <Playground
          day={day}
          programExercise={programExercise}
          progress={progress}
          settings={props.settings}
          days={props.days}
          onProgressChange={(p) => setProgress(p)}
        />
      )}
      <FinishDayScriptEditor
        programExercise={programExercise}
        editorResult={finishEditorResult}
        dispatch={props.dispatch}
      />
      <div className="p-2 text-center">
        <Button
          kind="green"
          disabled={!entry || !finishEditorResult.success || !variationScriptResult.success}
          onClick={() => EditProgram.saveExercise(props.dispatch, props.programIndex)}
        >
          Save
        </Button>
      </div>
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType) => {
          EditProgram.addStateVariable(props.dispatch, newName, newType as IUnit | undefined);
          setShouldShowAddStateVariable(false);
        }}
      />
      {showModalSubstitute && (
        <ModalSubstitute
          exerciseType={programExercise.exerciseType}
          settings={props.settings}
          onChange={(exerciseId) => {
            setShowModalSubstitute(false);
            if (exerciseId != null) {
              EditProgram.changeExerciseId(props.dispatch, props.settings, exerciseId);
            }
          }}
        />
      )}
      <ModalExercise
        isHidden={!showModalExercise}
        settings={props.settings}
        dispatch={props.dispatch}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, props.settings, exerciseId);
          }
        }}
      />
    </div>
  );
}

interface IVariationsProps {
  programExercise: IProgramExercise;
  variationIndex: number;
  dispatch: IDispatch;
  onChangeVariation: (newIndex: number) => void;
}

function Variations(props: IVariationsProps): JSX.Element {
  const { programExercise, variationIndex, dispatch } = props;

  return (
    <Fragment>
      <GroupHeader
        name="Variations"
        help={
          <span>
            Variations allow you to use various <strong>sets x reps x weight</strong> schemes in exercises. It's useful
            in some programs, e.g. in GZCLP program you follow 5x3, and if you fail it, you switch to 6x2 scheme. If you
            don't need anything like that, please ignore it.
          </span>
        }
      />
      <MenuItemEditable
        type="select"
        name="Variation"
        value={variationIndex.toString()}
        values={programExercise.variations.map((_, i) => [i.toString(), `Variation ${i + 1}`])}
        onChange={(newIndex) => {
          props.onChangeVariation(parseInt(newIndex!, 10));
        }}
      />
      <div className="p-1">
        <SemiButton
          onClick={() => {
            EditProgram.addVariation(dispatch);
            props.onChangeVariation(props.variationIndex + 1);
          }}
        >
          Add Variation +
        </SemiButton>
      </div>
    </Fragment>
  );
}

interface ISetsProps {
  programExercise: IProgramExercise;
  day: number;
  variationIndex: number;
  dispatch: IDispatch;
  settings: ISettings;
  onRemoveVariation: () => void;
}

function Sets(props: ISetsProps): JSX.Element {
  const { programExercise, day, settings, variationIndex, dispatch } = props;
  const variation = programExercise.variations[variationIndex];
  const [resetCounter, setResetCounter] = useState(0);
  return (
    <Fragment>
      <GroupHeader
        name="Sets"
        help={
          <span>
            Sets, reps and weights of chosen <strong>Variation</strong>. Note that <strong>Reps</strong> and{" "}
            <strong>Weight</strong> fields are Liftoscript scripts, and the returning value will be used for
            reps/weight. <strong>AMRAP</strong> means "As Many Reps As Possible", i.e. you do as many reps as you can
            for it.
          </span>
        }
      />
      {programExercise.variations.length > 1 && (
        <div className="px-1 pt-1 text-xs text-right bg-gray-100">
          <Button
            kind="red"
            onClick={() => {
              EditProgram.removeVariation(dispatch, variationIndex);
              props.onRemoveVariation();
            }}
          >
            Remove Variation
          </Button>
        </div>
      )}
      <ul className="relative z-10 p-1 text-sm bg-gray-100">
        <DraggableList
          items={variation.sets}
          element={(set, setIndex, handleTouchStart) => (
            <SetFields
              key={`${resetCounter}_${variation.sets.length}_${programExercise.variations.length}_${variationIndex}`}
              equipment={programExercise.exerciseType.equipment}
              settings={settings}
              handleTouchStart={handleTouchStart}
              day={day}
              set={set}
              state={programExercise.state}
              variationIndex={variationIndex}
              setIndex={setIndex}
              isDeleteEnabled={variation.sets.length > 1}
              dispatch={dispatch}
            />
          )}
          onDragEnd={(startIndex, endIndex) => {
            setResetCounter(resetCounter + 1);
            EditProgram.reorderSets(dispatch, variationIndex, startIndex, endIndex);
          }}
        />
      </ul>
      <div className="px-1 pb-1 text-sm bg-gray-100">
        <SemiButton onClick={() => EditProgram.addSet(dispatch, variationIndex)}>Add Set +</SemiButton>
      </div>
    </Fragment>
  );
}

interface ISetFieldsProps {
  state: IProgramState;
  set: IProgramSet;
  day: number;
  settings: ISettings;
  variationIndex: number;
  setIndex: number;
  equipment?: IEquipment;
  isDeleteEnabled: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  dispatch: IDispatch;
}

function SetFields(props: ISetFieldsProps): JSX.Element {
  const { set, state, equipment, settings } = props;
  const propsRef = useRef<ISetFieldsProps>(props);
  propsRef.current = props;

  function validate(
    script: string | undefined,
    type: "reps" | "weight"
  ): IEither<number | IWeight | undefined, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          propsRef.current.state,
          Progress.createEmptyScriptBindings(propsRef.current.day),
          Progress.createScriptFunctions(settings),
          settings.units,
          { equipment }
        );
        if (type === "reps") {
          return { success: true, data: scriptRunnerResult.execute(type) };
        } else {
          return {
            success: true,
            data: Weight.roundConvertTo(scriptRunnerResult.execute(type), settings, equipment),
          };
        }
      } else {
        return { success: false, error: "Empty expression" };
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  const repsResult = validate(set.repsExpr.trim(), "reps");
  const weightResult = validate(set.weightExpr.trim(), "weight");

  return (
    <li className="relative px-12 py-1 mb-1 bg-white border border-gray-400 rounded-md">
      <div className="absolute" style={{ touchAction: "none", top: 12, left: 12 }}>
        <span className="p-2 cursor-move" onTouchStart={props.handleTouchStart} onMouseDown={props.handleTouchStart}>
          <IconHandle />
        </span>
      </div>
      <div className="flex">
        {props.isDeleteEnabled && (
          <button
            className="absolute p-3"
            style={{ top: 0, right: 0 }}
            onClick={() => EditProgram.removeSet(props.dispatch, props.variationIndex, props.setIndex)}
          >
            <IconDelete />
          </button>
        )}
        <div className="flex-1 pr-4 overflow-x-auto">
          <label for="variation-0-reps" className="font-bold">
            Reps
          </label>
          <OneLineTextEditor
            name="reps"
            state={state}
            value={set.repsExpr}
            result={repsResult}
            onChange={(value) => {
              EditProgram.setReps(props.dispatch, value, propsRef.current.variationIndex, propsRef.current.setIndex);
            }}
          />
        </div>
        <div>
          <label className="font-bold" for="variation-0-amrap">
            AMRAP{" "}
            <button onClick={() => alert("As Many Reps As Possible.")}>
              <IconQuestion width={12} height={12} />
            </button>
          </label>
          <input
            checked={set.isAmrap}
            className="block"
            id="variation-0-amrap"
            type="checkbox"
            onChange={(e) => {
              EditProgram.setAmrap(props.dispatch, e.currentTarget.checked, props.variationIndex, props.setIndex);
            }}
          />
        </div>
      </div>
      <div className="mt-2">
        <label for="variation-0-weight" className="font-bold">
          Weight
        </label>
        <OneLineTextEditor
          name="weight"
          state={state}
          value={set.weightExpr}
          result={weightResult}
          onChange={(value) => {
            EditProgram.setWeight(props.dispatch, value, propsRef.current.variationIndex, propsRef.current.setIndex);
          }}
        />
      </div>
    </li>
  );
}

interface IVariationsEditorProps {
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  editorResult: IEither<number, string>;
}

function VariationsEditor(props: IVariationsEditorProps): JSX.Element {
  const { programExercise } = props;

  return (
    <Fragment>
      <GroupHeader
        name="Variation Selection Script"
        help={
          <span>
            Liftoscript script, it should return Variation number (e.g. <strong>1</strong> or <strong>2</strong>), and
            that variation will be used in the workout.
          </span>
        }
      />
      <MultiLineTextEditor
        name="variation"
        state={programExercise.state}
        result={props.editorResult}
        value={programExercise.variationExpr}
        height={4}
        onChange={(value) => {
          EditProgram.setExerciseVariationExpr(props.dispatch, value);
        }}
      />
    </Fragment>
  );
}

interface IEditWarmupSetsProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  dispatch: IDispatch;
}

function EditWarmupSets(props: IEditWarmupSetsProps): JSX.Element {
  const exercise = Exercise.get(props.programExercise.exerciseType, props.settings.exercises);
  const warmupSets = props.programExercise.warmupSets;
  useEffect(() => {
    if (warmupSets == null) {
      EditProgram.setDefaultWarmupSets(props.dispatch, exercise);
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
            dispatch={props.dispatch}
          />
        );
      })}
      <div className="p-1">
        <SemiButton
          data-cy="edit-warmup-set-add"
          onClick={() => {
            EditProgram.addWarmupSet(props.dispatch, warmupSets || []);
          }}
        >
          Add Warmup Set +
        </SemiButton>
      </div>
    </section>
  );
}

interface IEditWarmupSetProps {
  exercise: IExercise;
  warmupSets: IProgramExerciseWarmupSet[];
  index: number;
  settings: ISettings;
  dispatch: IDispatch;
}

function EditWarmupSet(props: IEditWarmupSetProps): JSX.Element {
  const warmupSet = props.warmupSets[props.index];
  const isPercent = typeof warmupSet.value === "number";
  const weightValue = typeof warmupSet.value === "number" ? warmupSet.value : warmupSet.value.value;
  const unit = typeof warmupSet.value !== "number" ? warmupSet.value.unit : props.settings.units;
  const threshold = Weight.roundConvertTo(warmupSet.threshold, props.settings, props.exercise.equipment);

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
      EditProgram.updateWarmupSet(props.dispatch, props.warmupSets, props.index, newWarmupSet);
    }
  }, [props.dispatch, props.warmupSets, props.index]);

  return (
    <div className="flex items-center p-2" data-cy="edit-warmup-set">
      <div>
        <input
          data-cy="edit-warmup-set-reps"
          ref={repsRef}
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type="number"
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
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type="number"
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
          onBlur={onUpdate}
          ref={thresholdRef}
          className={inputClassName.replace(" px-4 ", " px-2 ")}
          type="number"
          value={threshold.value}
        />
      </div>
      <div className="px-2">{threshold.unit}</div>
      <button
        className="p-4"
        data-cy="edit-warmup-set-delete"
        onClick={() => {
          EditProgram.removeWarmupSet(props.dispatch, props.warmupSets || [], props.index);
        }}
      >
        <IconDelete />
      </button>
    </div>
  );
}

interface IStateProps {
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  onAddStateVariable: () => void;
}

function EditState(props: IStateProps): JSX.Element {
  const state = props.programExercise.state;

  return (
    <section>
      <GroupHeader
        name="State Variables"
        help={
          <span>
            Variables you can use in all Liftoscript scripts of this exercise. They will preserve their values between
            workouts, allowing to use them for progressive overload, for tracking failures, or for anything really.
          </span>
        }
      />
      {ObjectUtils.keys(state).map((stateKey) => {
        const value = state[stateKey];
        const displayValue = Weight.is(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight.is(value) ? value.unit : undefined}
            hasClear={true}
            onChange={(newValue) => {
              EditProgram.editStateVariable(props.dispatch, stateKey, newValue);
            }}
          />
        );
      })}
      <div className="p-1">
        <SemiButton onClick={props.onAddStateVariable}>Add Variable +</SemiButton>
      </div>
    </section>
  );
}

export interface IFinishDayScriptEditorProps {
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  editorResult: IEither<number | undefined, string>;
}

function FinishDayScriptEditor(props: IFinishDayScriptEditorProps): JSX.Element {
  const { programExercise } = props;

  return (
    <Fragment>
      <GroupHeader
        name="Finish Day Script"
        help={
          <span>
            Liftoscript script, that's run after finishing a day. You should update <strong>State Variables</strong>{" "}
            here. You also have access to weights, completed reps, etc from the workout. Refer to the{" "}
            <InternalLink href="/docs/docs.html" className="text-blue-700 underline">
              documentation
            </InternalLink>{" "}
            to learn how to write the scripts.
          </span>
        }
      />
      <MultiLineTextEditor
        name="finish-day"
        state={programExercise.state}
        result={props.editorResult}
        value={programExercise.finishDayExpr}
        onChange={(value) => {
          EditProgram.setExerciseFinishDayExpr(props.dispatch, value);
        }}
      />
    </Fragment>
  );
}
