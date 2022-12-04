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
import { DraggableList } from "../draggableList";
import { IconHandle } from "../icons/iconHandle";
import { MenuItem } from "../menuItem";
import { ModalExercise } from "../modalExercise";
import { Exercise, equipmentName, IExercise } from "../../models/exercise";
import { InternalLink } from "../../internalLink";
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
import { inputClassName, selectInputOnFocus } from "../input";
import { LinkButton } from "../linkButton";
import { IconTrash } from "../icons/iconTrash";
import { IconHelp } from "../icons/iconHelp";

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
    <div className="px-4">
      <MenuItemEditable
        type="text"
        name="Name"
        value={programExercise.name}
        onChange={(newName) => {
          EditProgram.changeExerciseName(props.dispatch, newName);
        }}
      />
      <MenuItem
        name="Exercise"
        onClick={() => setShowModalExercise(true)}
        value={Exercise.get(programExercise.exerciseType, props.settings.exercises).name}
      />
      <LinkButton className="mb-4" onClick={() => setShowModalSubstitute(true)}>
        Substitute Exercise
      </LinkButton>
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={programExercise.exerciseType.equipment || "bodyweight"}
        values={equipmentOptions}
        onChange={(newEquipment) => {
          EditProgram.changeExerciseEquipment(props.dispatch, newEquipment ? (newEquipment as IEquipment) : undefined);
        }}
      />
      <ExerciseImage
        key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
        exerciseType={programExercise.exerciseType}
        customExercises={props.settings.exercises}
        size="large"
      />
      <EditState
        dispatch={props.dispatch}
        programExercise={programExercise}
        onAddStateVariable={() => {
          setShouldShowAddStateVariable(true);
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
      <div className="p-2 mb-4 text-center">
        <Button
          kind="orange"
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
        topPadding={true}
        name="Sets Variations"
        help={
          <span>
            Sets variations allow you to use different <strong>sets x reps x weight</strong> schemes in exercises. It's
            useful in some programs, e.g. in GZCLP program you follow 5x3, and if you fail it, you switch to 6x2 scheme.
            If you don't need anything like that, please ignore it.
          </span>
        }
      />
      <MenuItemEditable
        type="select"
        name="Selected Variation"
        value={variationIndex.toString()}
        values={programExercise.variations.map((_, i) => [i.toString(), `Variation ${i + 1}`])}
        onChange={(newIndex) => {
          props.onChangeVariation(parseInt(newIndex!, 10));
        }}
      />
      <div className="flex justify-between">
        <LinkButton
          onClick={() => {
            EditProgram.addVariation(dispatch);
            props.onChangeVariation(props.variationIndex + 1);
          }}
        >
          Add New Variation
        </LinkButton>
        {programExercise.variations.length > 1 && (
          <LinkButton
            onClick={() => {
              EditProgram.removeVariation(dispatch, props.variationIndex);
              props.onChangeVariation(Math.max(variationIndex - 1, 0));
            }}
          >
            Delete Current Variation
          </LinkButton>
        )}
      </div>
      <div className="p-1"></div>
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
        topPadding={true}
        name={programExercise.variations.length > 1 ? `Sets of Variation ${variationIndex + 1}` : "Sets"}
        help={
          <span>
            Sets, reps and weights
            {programExercise.variations.length > 1 && (
              <span>
                of chosen <strong>Variation</strong>
              </span>
            )}
            . Note that <strong>Reps</strong> and <strong>Weight</strong> fields are Liftoscript scripts, and the
            returning value will be used for reps/weight. <strong>AMRAP</strong> means "As Many Reps As Possible", i.e.
            you do as many reps as you can for it.
          </span>
        }
      />
      <ul className="relative z-10 mt-2 text-sm">
        <DraggableList
          hideBorders={true}
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
      <div>
        <LinkButton onClick={() => EditProgram.addSet(dispatch, variationIndex)}>Add New Set</LinkButton>
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
    <li className="relative pb-2">
      <div className="flex p-1 select-none bg-purplev2-100 rounded-2xl">
        <div className="flex flex-col items-center pt-2">
          <div className="flex items-center justify-center w-6 h-6 font-bold border rounded-full border-grayv2-main text-grayv2-main">
            {props.setIndex + 1}
          </div>
          <div className="p-2 cursor-move" onTouchStart={props.handleTouchStart} onMouseDown={props.handleTouchStart}>
            <IconHandle />
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex">
            <div className="flex-1">
              <OneLineTextEditor
                label="Reps"
                name="reps"
                state={state}
                value={set.repsExpr}
                result={repsResult}
                onChange={(value) => {
                  EditProgram.setReps(
                    props.dispatch,
                    value,
                    propsRef.current.variationIndex,
                    propsRef.current.setIndex
                  );
                }}
              />
            </div>
            <div className="px-4 pt-2">
              <label className="text-center">
                <div>
                  <input
                    checked={set.isAmrap}
                    className="block checkbox text-bluev2"
                    id="variation-0-amrap"
                    type="checkbox"
                    onChange={(e) => {
                      EditProgram.setAmrap(
                        props.dispatch,
                        e.currentTarget.checked,
                        props.variationIndex,
                        props.setIndex
                      );
                    }}
                  />
                </div>
                <div className="text-xs leading-none">
                  <span className="align-middle text-grayv2-main">AMRAP</span>{" "}
                  <button className="align-middle" onClick={() => alert("As Many Reps As Possible.")}>
                    <IconHelp size={12} color="#607284" />
                  </button>
                </div>
              </label>
            </div>
          </div>
          <div className="mt-2">
            <OneLineTextEditor
              label="Weight"
              name="weight"
              state={state}
              value={set.weightExpr}
              result={weightResult}
              onChange={(value) => {
                EditProgram.setWeight(
                  props.dispatch,
                  value,
                  propsRef.current.variationIndex,
                  propsRef.current.setIndex
                );
              }}
            />
          </div>
        </div>
        {props.isDeleteEnabled && (
          <div>
            <button
              className="p-3"
              style={{ top: 0, right: 0 }}
              onClick={() => EditProgram.removeSet(props.dispatch, props.variationIndex, props.setIndex)}
            >
              <IconTrash />
            </button>
          </div>
        )}
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
        topPadding={true}
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
        <LinkButton
          data-cy="edit-warmup-set-add"
          onClick={() => {
            EditProgram.addWarmupSet(props.dispatch, warmupSets || []);
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
          type="tel"
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
          type="tel"
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
        <IconTrash />
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
    <section className="px-4 py-2 mt-2 bg-purple-100 rounded-2xl">
      <GroupHeader
        topPadding={false}
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
            isNameBold={true}
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
        <LinkButton onClick={props.onAddStateVariable}>Add State Variable</LinkButton>
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
        topPadding={true}
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
