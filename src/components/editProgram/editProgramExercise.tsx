import { h, JSX, Fragment } from "preact";
import { IProgramExercise, Program, IProgramState, IProgramDay } from "../../models/program";
import { GroupHeader } from "../groupHeader";
import { HeaderView } from "../header";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { ObjectUtils } from "../../utils/object";
import { ISettings, Settings } from "../../models/settings";
import { History } from "../../models/history";
import { Weight, IBarKey, IUnit, IWeight } from "../../models/weight";
import { ExerciseView } from "../exercise";
import { IHistoryEntry, IHistoryRecord } from "../../models/history";
import { MultiLineTextEditor } from "./multiLineTextEditor";
import { FooterView } from "../footer";
import { Button } from "../button";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { EditProgram } from "../../models/editProgram";
import { useState, useRef, useEffect } from "preact/hooks";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IProgramSet } from "../../models/set";
import { IEither } from "../../utils/types";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { ModalAmrap } from "../modalAmrap";
import { ModalWeight } from "../modalWeight";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IconDelete } from "../iconDelete";
import { DraggableList } from "../draggableList";
import { IconHandle } from "../iconHandle";
import { SemiButton } from "../semiButton";
import { StringUtils } from "../../utils/string";
import { IconEdit } from "../iconEdit";
import { MenuItem } from "../menuItem";
import { ModalExercise } from "../modalExercise";
import { Exercise } from "../../models/exercise";

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
  variationIndex: number,
  settings: ISettings
): IHistoryRecord | undefined {
  let entry: IHistoryEntry | undefined;
  try {
    entry = Program.nextHistoryEntry(
      programExercise.exerciseType,
      day,
      programExercise.variations[variationIndex].sets,
      programExercise.state,
      settings
    );
  } catch (e) {
    entry = undefined;
  }
  return entry != null ? History.buildFromEntry(entry, day) : undefined;
}

export function EditProgramExercise(props: IProps): JSX.Element {
  const { programExercise } = props;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [variationIndex, setVariationIndex] = useState<number>(0);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    buildProgress(programExercise, 1, variationIndex, props.settings)
  );

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);

  useEffect(() => {
    if (props.programExercise !== prevProps.current.programExercise) {
      setProgress(buildProgress(programExercise, progress?.day || 1, variationIndex, props.settings));
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
          programExercise.finishDayExpr
        )
      : Program.parseExerciseFinishDayScript(day, props.settings, programExercise.state, programExercise.finishDayExpr);
  const finishEditorResult: IEither<number | undefined, string> = finishScriptResult.success
    ? { success: true, data: undefined }
    : finishScriptResult;

  const variationScriptResult = Program.runVariationScript(programExercise, day, props.settings);

  const bars = Settings.bars(props.settings);
  const barOptions: [string, string][] = [
    ["", "No Bar"],
    ...ObjectUtils.keys(bars).map<[string, string]>((b) => [b, b]),
  ];

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program Exercise"
        subtitle={props.programName}
        left={
          <button
            onClick={() => {
              if (confirm("Are you sure? Your changes won't be saved")) {
                props.dispatch({ type: "PullScreen" });
              }
            }}
          >
            Back
          </button>
        }
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MenuItem
          name="Exercise"
          value={
            <Fragment>
              <button
                data-cy="select-exercise"
                className="px-4 align-middle"
                onClick={() => setShowModalExercise(true)}
              >
                <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
              </button>
              <span>{Exercise.get(programExercise.exerciseType).name}</span>
            </Fragment>
          }
        />
        <MenuItemEditable
          type="select"
          name="Bar"
          value={programExercise.exerciseType.bar || ""}
          values={barOptions}
          onChange={(newBar) => {
            EditProgram.changeExerciseBar(props.dispatch, newBar ? (newBar as IBarKey) : undefined);
          }}
        />
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
        {progress && entry && (
          <Fragment>
            <Playground
              programExercise={programExercise}
              progress={progress}
              settings={props.settings}
              dispatch={props.dispatch}
              days={props.days}
              onProgressChange={(p) => setProgress(p)}
            />
            <GroupHeader name="State Changes" />
            <StateChanges
              entry={entry}
              day={day}
              settings={props.settings}
              state={programExercise.state}
              script={programExercise.finishDayExpr}
            />
          </Fragment>
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
      </section>
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType) => {
          EditProgram.addStateVariable(props.dispatch, newName, newType as IUnit | undefined);
          setShouldShowAddStateVariable(false);
        }}
      />
      <ModalExercise
        isHidden={!showModalExercise}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, exerciseId);
          }
        }}
      />
      <FooterView dispatch={props.dispatch} />
    </section>
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
      <GroupHeader name="Variations" />
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
      <GroupHeader name="Sets" />
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
              bar={programExercise.exerciseType.bar}
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
  bar?: IBarKey;
  isDeleteEnabled: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  dispatch: IDispatch;
}

function SetFields(props: ISetFieldsProps): JSX.Element {
  const { set, state, bar, settings } = props;
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
          settings.units
        );
        if (type === "reps") {
          return { success: true, data: scriptRunnerResult.execute(type) };
        } else {
          return {
            success: true,
            data: Weight.roundConvertTo(scriptRunnerResult.execute(type), settings, bar),
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
            Is AMRAP?
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
      <GroupHeader name="Variation Selection Script" />
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

interface IStateProps {
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  onAddStateVariable: () => void;
}

function EditState(props: IStateProps): JSX.Element {
  const state = props.programExercise.state;

  return (
    <section>
      <GroupHeader name="State Variables" />
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

interface IPlaygroundProps {
  progress: IHistoryRecord;
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  settings: ISettings;
  days: IProgramDay[];
  onProgressChange: (p: IHistoryRecord) => void;
}

function Playground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, days, settings, progress } = props;
  const entry = progress.entries[0];

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progress, action as ICardsAction);
    props.onProgressChange(newProgress);
  };

  return (
    <Fragment>
      <GroupHeader name="Playground" />
      <MenuItemEditable
        name="Choose Day"
        type="select"
        value={`${props.progress.day}`}
        values={[...days.map<[string, string]>((d, i) => [(i + 1).toString(), `${i + 1} - ${d.name}`])]}
        onChange={(newValue) => {
          const newDay = parseInt(newValue || "1", 10);
          const nextVariationIndex = Program.nextVariationIndex(programExercise, newDay, settings);
          const newEntry = Program.nextHistoryEntry(
            programExercise.exerciseType,
            newDay,
            programExercise.variations[nextVariationIndex].sets,
            programExercise.state,
            settings
          );
          props.onProgressChange(History.buildFromEntry(newEntry, newDay));
        }}
      />
      <ExerciseView
        entry={entry}
        settings={props.settings}
        dispatch={dispatch}
        onChangeReps={() => undefined}
        isCurrent={true}
      />
      <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={dispatch} />
      <ModalWeight
        isHidden={progress.ui?.weightModal == null}
        units={props.settings.units}
        dispatch={dispatch}
        weight={progress.ui?.weightModal?.weight ?? 0}
      />
    </Fragment>
  );
}

interface IStateChangesProps {
  entry: IHistoryEntry;
  day: number;
  settings: ISettings;
  state: IProgramState;
  script: string;
}

function StateChanges(props: IStateChangesProps): JSX.Element {
  const { entry, settings, state, script, day } = props;
  const { units } = settings;
  const result = Program.runExerciseFinishDayScript(entry, day, settings, state, script);

  if (result.success) {
    const newState = result.data;
    const diffState = ObjectUtils.keys(state).reduce<Record<string, string | undefined>>((memo, key) => {
      const oldValue = state[key];
      const newValue = newState[key];
      if (!Weight.eq(oldValue, newValue)) {
        memo[key] = `${Weight.display(Weight.convertTo(oldValue as number, units))} -> ${Weight.display(
          Weight.convertTo(newValue as number, units)
        )}`;
      }
      return memo;
    }, {});
    return (
      <ul data-cy="state-changes" className="px-6 py-4 text-sm">
        {ObjectUtils.keys(diffState).map((key) => (
          <li data-cy={`state-changes-key-${StringUtils.dashcase(key)}`}>
            {key}: <strong data-cy={`state-changes-value-${StringUtils.dashcase(key)}`}>{diffState[key]}</strong>
          </li>
        ))}
      </ul>
    );
  } else {
    return (
      <ul data-cy="state-changes" className="px-6 py-4 text-sm">
        <li></li>
      </ul>
    );
  }
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
      <GroupHeader name="Finish Day Script" />
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
