import { h, JSX, Fragment } from "preact";
import { useRef, useState } from "preact/hooks";
import { Progress } from "../../models/progress";
import { Weight } from "../../models/weight";
import { ScriptRunner } from "../../parser";
import { IEquipment, IProgramExercise, IProgramSet, IProgramState, ISettings, IWeight } from "../../types";
import { IEither } from "../../utils/types";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";
import { IconHandle } from "../icons/iconHandle";
import { IconHelp } from "../icons/iconHelp";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { Input } from "../input";

interface IEditProgramSets {
  programExercise: IProgramExercise;
  day: number;
  variationIndex: number;
  settings: ISettings;
  onDeleteVariation?: (variationIndex: number) => void;
  onDuplicateVariation?: (variationIndex: number) => void;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  onReorderSets: (variationIndex: number, startIndex: number, endIndex: number) => void;
  onChangeLabel: (variationIndex: number, setIndex: number, value: string) => void;
  onChangeRpe: (rpe: string, variationIndex: number, setIndex: number) => void;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onAddSet: (variationIndex: number) => void;
}

export function EditProgramSets(props: IEditProgramSets): JSX.Element {
  const { programExercise, day, settings, variationIndex } = props;
  const variation = programExercise.variations[variationIndex];
  const [resetCounter, setResetCounter] = useState(0);
  const onDeleteVariation = props.onDeleteVariation;
  const onDuplicateVariation = props.onDuplicateVariation;
  return (
    <Fragment>
      <GroupHeader
        topPadding={true}
        name={programExercise.variations.length > 1 ? `Sets of Variation ${variationIndex + 1}` : "Sets"}
        rightAddOn={
          <>
            {onDuplicateVariation ? (
              <button
                style={{ marginTop: "-0.5rem", marginBottom: "-0.5rem" }}
                className="p-2"
                onClick={() => onDuplicateVariation(variationIndex)}
              >
                <IconDuplicate2 />
              </button>
            ) : undefined}
            {onDeleteVariation ? (
              <button
                style={{ marginTop: "-0.5rem", marginBottom: "-0.5rem" }}
                className="p-2"
                onClick={() => onDeleteVariation(variationIndex)}
              >
                <IconTrash />
              </button>
            ) : undefined}
          </>
        }
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
              enabledRpe={!!programExercise.enableRpe}
              isDeleteEnabled={programExercise.quickAddSets || variation.sets.length > 1}
              onChangeAmrap={props.onChangeAmrap}
              onChangeLogRpe={props.onChangeLogRpe}
              onChangeReps={props.onChangeReps}
              onChangeRpe={props.onChangeRpe}
              onChangeWeight={props.onChangeWeight}
              onRemoveSet={props.onRemoveSet}
              onChangeLabel={props.onChangeLabel}
            />
          )}
          onDragEnd={(startIndex, endIndex) => {
            setResetCounter(resetCounter + 1);
            props.onReorderSets(variationIndex, startIndex, endIndex);
          }}
        />
      </ul>
      <div>
        <LinkButton onClick={() => props.onAddSet(variationIndex)}>Add New Set</LinkButton>
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
  enabledRpe: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeRpe: (rpe: string, variationIndex: number, setIndex: number) => void;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  onChangeLabel: (variationIndex: number, setIndex: number, value: string) => void;
}

function SetFields(props: ISetFieldsProps): JSX.Element {
  const { set, state, equipment, settings } = props;
  const propsRef = useRef<ISetFieldsProps>(props);
  propsRef.current = props;

  function validate(
    script: string | undefined,
    type: "reps" | "weight" | "rpe"
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
        } else if (type === "rpe") {
          return { success: true, data: scriptRunnerResult.execute(type) };
        } else {
          return {
            success: true,
            data: Weight.convertTo(scriptRunnerResult.execute(type), settings.units),
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
  const rpeResult = props.enabledRpe && set.rpeExpr ? validate(set.rpeExpr.trim(), "rpe") : undefined;

  return (
    <li className="relative pb-2">
      <div className={`flex p-1  select-none bg-purplev2-100 rounded-2xl`}>
        <div className={`flex flex-col pt-2 items-center`}>
          <div>
            <SetNumber setIndex={props.setIndex} />
          </div>
          <Handle handleTouchStart={props.handleTouchStart} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex">
            <div className="flex-1 min-w-0">
              <RepsInput
                repsResult={repsResult}
                variationIndex={propsRef.current.variationIndex}
                setIndex={propsRef.current.setIndex}
                state={state}
                set={set}
                onChangeReps={props.onChangeReps}
              />
            </div>
            <div className="pt-2 pl-2 pr-1">
              <Amrap
                onChangeAmrap={props.onChangeAmrap}
                set={set}
                variationIndex={propsRef.current.variationIndex}
                setIndex={propsRef.current.setIndex}
              />
            </div>
            {props.isDeleteEnabled && (
              <div>
                <DeleteBtn
                  onRemoveSet={props.onRemoveSet}
                  variationIndex={propsRef.current.variationIndex}
                  setIndex={propsRef.current.setIndex}
                />
              </div>
            )}
          </div>
          <div className="flex mt-2">
            <div className="flex-1 min-w-0">
              <WeightInput
                weightResult={weightResult}
                variationIndex={propsRef.current.variationIndex}
                setIndex={propsRef.current.setIndex}
                state={state}
                set={set}
                onChangeWeight={props.onChangeWeight}
              />
            </div>
            <div style={{ width: "7rem" }} className="px-2">
              <Input
                changeHandler={(r) => {
                  if (r.success) {
                    props.onChangeLabel(propsRef.current.variationIndex, propsRef.current.setIndex, r.data);
                  }
                }}
                maxLength={8}
                labelSize="xs"
                label="Label"
                value={set.label}
              />
            </div>
          </div>
          {props.enabledRpe && (
            <div className="flex mt-2">
              <div className="flex-1 min-w-0">
                <RpeInput
                  rpeResult={rpeResult}
                  variationIndex={propsRef.current.variationIndex}
                  setIndex={propsRef.current.setIndex}
                  state={state}
                  set={set}
                  onChangeRpe={props.onChangeRpe}
                />
              </div>
              <div className="pt-2 pl-2 pr-1">
                <LogRpe
                  onChangeLogRpe={props.onChangeLogRpe}
                  set={set}
                  variationIndex={propsRef.current.variationIndex}
                  setIndex={propsRef.current.setIndex}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function DeleteBtn(props: {
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}): JSX.Element {
  return (
    <button
      className="p-3"
      style={{ top: 0, right: 0 }}
      onClick={() => props.onRemoveSet(props.variationIndex, props.setIndex)}
    >
      <IconTrash />
    </button>
  );
}

function Handle(props: { handleTouchStart?: (e: TouchEvent | MouseEvent) => void }): JSX.Element {
  return (
    <div className="p-2 cursor-move" onTouchStart={props.handleTouchStart} onMouseDown={props.handleTouchStart}>
      <IconHandle />
    </div>
  );
}

export function SetNumber(props: { setIndex: number }): JSX.Element {
  return (
    <div className="flex items-center justify-center w-6 h-6 font-bold border rounded-full border-grayv2-main text-grayv2-main">
      {props.setIndex + 1}
    </div>
  );
}

interface IRepsInputProps {
  state: IProgramState;
  set: IProgramSet;
  repsResult: IEither<number | IWeight | undefined, string>;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function RepsInput(props: IRepsInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="Reps"
      name="reps"
      state={props.state}
      value={props.set.repsExpr}
      result={props.repsResult}
      onChange={(value) => {
        props.onChangeReps(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IWeightInputProps {
  state: IProgramState;
  set: IProgramSet;
  weightResult: IEither<number | IWeight | undefined, string>;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function WeightInput(props: IWeightInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="Weight"
      name="weight"
      state={props.state}
      value={props.set.weightExpr}
      result={props.weightResult}
      onChange={(value) => {
        props.onChangeWeight(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IRpeInputProps {
  state: IProgramState;
  set: IProgramSet;
  rpeResult?: IEither<number | IWeight | undefined, string>;
  onChangeRpe: (reps: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function RpeInput(props: IRpeInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="RPE"
      name="rpe"
      state={props.state}
      value={props.set.rpeExpr}
      result={props.rpeResult}
      onChange={(value) => {
        props.onChangeRpe(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IAmrapProps {
  set: IProgramSet;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function Amrap(props: IAmrapProps): JSX.Element {
  return (
    <label className="text-center">
      <div>
        <input
          checked={props.set.isAmrap}
          className="block checkbox text-bluev2"
          id="variation-0-amrap"
          type="checkbox"
          onChange={(e) => {
            props.onChangeAmrap(e.currentTarget.checked, props.variationIndex, props.setIndex);
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
  );
}

interface ILogRpeProps {
  set: IProgramSet;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function LogRpe(props: ILogRpeProps): JSX.Element {
  return (
    <label className="text-center">
      <div>
        <input
          data-cy="toggle-log-rpe"
          checked={props.set.logRpe}
          className="block checkbox text-bluev2"
          id="variation-0-amrap"
          type="checkbox"
          onChange={(e) => {
            props.onChangeLogRpe(e.currentTarget.checked, props.variationIndex, props.setIndex);
          }}
        />
      </div>
      <div className="text-xs leading-none">
        <span className="align-middle text-grayv2-main">Log RPE</span>{" "}
        <button
          className="align-middle"
          onClick={() =>
            alert(
              "Log RPE (Rate of Perceived Exertion) when finished this set. You can access it in the Finish Day Script in `completedRPE` variable."
            )
          }
        >
          <IconHelp size={12} color="#607284" />
        </button>
      </div>
    </label>
  );
}
