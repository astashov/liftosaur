import { h, JSX, Fragment } from "preact";
import { IProgramExcercise, Program, IProgramState, IProgramDay } from "../../models/program";
import { GroupHeader } from "../groupHeader";
import { HeaderView } from "../header";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { ObjectUtils } from "../../utils/object";
import { excercises, IExcerciseId } from "../../models/excercise";
import { ISettings, Settings } from "../../models/settings";
import { History } from "../../models/history";
import { Weight, IBarKey, IUnit, IWeight } from "../../models/weight";
import { JSXInternal } from "preact/src/jsx";
import { ExcerciseView } from "../excercise";
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

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programExcercise: IProgramExcercise;
  dispatch: IDispatch;
}

function buildProgress(
  programExcercise: IProgramExcercise,
  day: number,
  variationIndex: number,
  settings: ISettings
): IHistoryRecord | undefined {
  let entry: IHistoryEntry | undefined;
  try {
    entry = Program.nextHistoryEntry(
      programExcercise.excerciseType,
      day,
      programExcercise.variations[variationIndex].sets,
      programExcercise.state,
      settings
    );
  } catch (e) {
    entry = undefined;
  }
  return entry != null ? History.buildFromEntry(entry, day) : undefined;
}

export function EditProgramExcercise(props: IProps): JSX.Element {
  const { programExcercise } = props;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [variationIndex, setVariationIndex] = useState<number>(0);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    buildProgress(programExcercise, 1, variationIndex, props.settings)
  );

  useEffect(() => {
    if (props.programExcercise !== prevProps.current.programExcercise) {
      setProgress(buildProgress(programExcercise, progress?.day || 1, variationIndex, props.settings));
    }
    prevProps.current = props;
  });
  const entry = progress?.entries[0];
  const day = progress?.day ?? 1;

  const excerciseOptions = ObjectUtils.keys(excercises).map<[string, string]>((e) => [
    excercises[e].id,
    excercises[e].name,
  ]);
  const bars = Settings.bars(props.settings);
  const barOptions: [string, string][] = [
    ["", "No Bar"],
    ...ObjectUtils.keys(bars).map<[string, string]>((b) => [b, b]),
  ];

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program Excercise"
        subtitle={"Edit it"}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MenuItemEditable
          type="select"
          name="Excercise"
          value={programExcercise.excerciseType.id}
          values={excerciseOptions}
          onChange={(newId) => {
            EditProgram.changeExcerciseId(props.dispatch, newId as IExcerciseId);
          }}
        />
        <MenuItemEditable
          type="select"
          name="Bar"
          value={programExcercise.excerciseType.bar || ""}
          values={barOptions}
          onChange={(newBar) => {
            EditProgram.changeExcerciseBar(props.dispatch, newBar ? (newBar as IBarKey) : undefined);
          }}
        />
        <MenuItemEditable
          type="text"
          name="Name"
          value={programExcercise.name}
          onChange={(newName) => {
            EditProgram.changeExcerciseName(props.dispatch, newName);
          }}
        />
        <Variations
          variationIndex={variationIndex}
          programExcercise={programExcercise}
          dispatch={props.dispatch}
          onChangeVariation={(i) => setVariationIndex(i)}
        />
        <Sets
          variationIndex={variationIndex}
          settings={props.settings}
          day={day}
          programExcercise={programExcercise}
          onRemoveVariation={() => {
            setVariationIndex(Math.max(variationIndex - 1, 0));
          }}
          dispatch={props.dispatch}
        />
        <EditState
          dispatch={props.dispatch}
          programExcercise={programExcercise}
          onAddStateVariable={() => {
            setShouldShowAddStateVariable(true);
          }}
        />
        {progress && entry && (
          <Fragment>
            <Playground
              programExcercise={programExcercise}
              progress={progress}
              settings={props.settings}
              dispatch={props.dispatch}
              days={props.days}
              onProgressChange={(p) => setProgress(p)}
            />
            <GroupHeader name="State Changes" />
            <StateChanges
              entry={entry}
              settings={props.settings}
              state={programExcercise.state}
              script={programExcercise.finishDayExpr}
            />
          </Fragment>
        )}
        <FinishDayScriptEditor
          entry={entry}
          programExcercise={programExcercise}
          day={day}
          settings={props.settings}
          dispatch={props.dispatch}
        />
        <div className="p-2 text-center">
          <Button kind="green" disabled={!entry}>
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
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}

interface IVariationsProps {
  programExcercise: IProgramExcercise;
  variationIndex: number;
  dispatch: IDispatch;
  onChangeVariation: (newIndex: number) => void;
}

function Variations(props: IVariationsProps): JSX.Element {
  const { programExcercise, variationIndex, dispatch } = props;

  return (
    <Fragment>
      <GroupHeader name="Variations" />
      <MenuItemEditable
        type="select"
        name="Variation"
        value={variationIndex.toString()}
        values={programExcercise.variations.map((_, i) => [i.toString(), `Variation ${i + 1}`])}
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
  programExcercise: IProgramExcercise;
  day: number;
  variationIndex: number;
  dispatch: IDispatch;
  settings: ISettings;
  onRemoveVariation: () => void;
}

function Sets(props: ISetsProps): JSX.Element {
  const { programExcercise, day, settings, variationIndex, dispatch } = props;
  const variation = programExcercise.variations[variationIndex];
  return (
    <Fragment>
      <GroupHeader name="Sets" />
      {programExcercise.variations.length > 1 && (
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
        {variation.sets.map((set, setIndex) => (
          <SetFields
            key={`${variation.sets.length}_${programExcercise.variations.length}_${variationIndex}`}
            bar={programExcercise.excerciseType.bar}
            settings={settings}
            day={day}
            set={set}
            state={programExcercise.state}
            variationIndex={variationIndex}
            setIndex={setIndex}
            isDeleteEnabled={variation.sets.length > 1}
            dispatch={dispatch}
          />
        ))}
      </ul>
      <div className="px-1 pb-1 text-sm bg-gray-100">
        <SemiButton onClick={() => EditProgram.addSet(dispatch, 0)}>Add Set +</SemiButton>
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
    <li className="relative py-1 pl-2 pr-12 mb-1 bg-white border border-gray-400 rounded-md">
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
        <div className="flex-1 pr-4">
          <label for="variation-0-reps" className="font-bold">
            Reps
          </label>
          <OneLineTextEditor
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

interface IStateProps {
  programExcercise: IProgramExcercise;
  dispatch: IDispatch;
  onAddStateVariable: () => void;
}

function SemiButton(props: JSXInternal.HTMLAttributes<HTMLButtonElement>): JSX.Element {
  return (
    <button
      className="box-border block w-full p-2 text-center border border-gray-500 border-dashed rounded-md"
      {...props}
    >
      {props.children}
    </button>
  );
}

function EditState(props: IStateProps): JSX.Element {
  const state = props.programExcercise.state;

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
  programExcercise: IProgramExcercise;
  dispatch: IDispatch;
  settings: ISettings;
  days: IProgramDay[];
  onProgressChange: (p: IHistoryRecord) => void;
}

function Playground(props: IPlaygroundProps): JSX.Element {
  const { programExcercise, days, settings, progress } = props;
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
          const newEntry = Program.nextHistoryEntry(
            programExcercise.excerciseType,
            newDay,
            programExcercise.variations[0].sets,
            programExcercise.state,
            settings
          );
          props.onProgressChange(History.buildFromEntry(newEntry, newDay));
        }}
      />
      <ExcerciseView entry={entry} settings={props.settings} dispatch={dispatch} onChangeReps={() => undefined} />
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
  settings: ISettings;
  state: IProgramState;
  script: string;
}

function StateChanges(props: IStateChangesProps): JSX.Element {
  const { entry, settings, state, script } = props;
  const { units } = settings;
  const result = Program.runExcerciseFinishDayScript(entry, 0, settings, state, script);

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
      <ul className="px-6 py-4 text-sm">
        {ObjectUtils.keys(diffState).map((key) => (
          <li>
            {key}: <strong>{diffState[key]}</strong>
          </li>
        ))}
      </ul>
    );
  } else {
    return (
      <ul className="px-6 py-4 text-sm">
        <li></li>
      </ul>
    );
  }
}

export interface IFinishDayScriptEditorProps {
  programExcercise: IProgramExcercise;
  day: number;
  dispatch: IDispatch;
  entry?: IHistoryEntry;
  settings: ISettings;
}

function FinishDayScriptEditor(props: IFinishDayScriptEditorProps): JSX.Element {
  const { programExcercise, entry, day, settings } = props;
  const { state, finishDayExpr } = programExcercise;

  const result =
    entry != null
      ? Program.runExcerciseFinishDayScript(entry, day, settings, state, finishDayExpr)
      : Program.parseExcerciseFinishDayScript(day, settings, state, finishDayExpr);
  const editorResult: IEither<number | undefined, string> = result.success
    ? { success: true, data: undefined }
    : result;

  return (
    <Fragment>
      <GroupHeader name="Finish Day Script" />
      <MultiLineTextEditor
        state={programExcercise.state}
        result={editorResult}
        value={programExcercise.finishDayExpr}
        onChange={(value) => {
          EditProgram.setExcerciseFinishDayExpr(props.dispatch, value);
        }}
      />
    </Fragment>
  );
}
