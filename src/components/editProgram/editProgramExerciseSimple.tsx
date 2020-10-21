import { ISettings, Settings } from "../../models/settings";
import { IProgramDay, IProgramExercise, Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX, Fragment } from "preact";
import { ModalExercise } from "../modalExercise";
import { useState, useRef, StateUpdater, useEffect } from "preact/hooks";
import { EditProgram } from "../../models/editProgram";
import { IconEdit } from "../iconEdit";
import { Exercise } from "../../models/exercise";
import { MenuItemEditable } from "../menuItemEditable";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { ObjectUtils } from "../../utils/object";
import { IBarKey, Weight } from "../../models/weight";
import { Button } from "../button";
import { IProgramSet } from "../../models/set";
import { IconDelete } from "../iconDelete";
import { SemiButton } from "../semiButton";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  programName: string;
  dispatch: IDispatch;
}

function useStateWithCallback<S>(initialState: S | (() => S), callback: (state: S) => void): [S, StateUpdater<S>] {
  const [state, setState] = useState<S>(initialState);
  useEffect(() => callback(state), [state]);
  return [state, setState];
}

export function EditProgramExerciseSimple(props: IProps): JSX.Element {
  const { programExercise } = props;
  const isEligible = Program.isEligibleForSimpleExercise(programExercise);
  if (isEligible.success) {
    return <Edit {...props} />;
  } else {
    return <Errors errors={isEligible.error} />;
  }
}

function Edit(props: IProps): JSX.Element {
  const { programExercise } = props;

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [isCombinedSets, setIsCombinedSets] = useState<boolean>(Program.isEligibleForCombined(programExercise));

  const bars = Settings.bars(props.settings);
  const barOptions: [string, string][] = [
    ["", "No Bar"],
    ...ObjectUtils.keys(bars).map<[string, string]>((b) => [b, b]),
  ];

  return (
    <div>
      <MenuItem
        name="Exercise"
        value={
          <Fragment>
            <button data-cy="select-exercise" className="px-4 align-middle" onClick={() => setShowModalExercise(true)}>
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
      <MenuItemWrapper name="sets-reps-weight">
        {isCombinedSets ? (
          <CombinedSets programExercise={programExercise} dispatch={props.dispatch} settings={props.settings} />
        ) : (
          <SplitSets programExercise={programExercise} dispatch={props.dispatch} settings={props.settings} />
        )}{" "}
        <div className="px-4 text-right">
          <button
            className="text-xs italic text-blue-700"
            onClick={() => {
              if (isCombinedSets) {
                EditProgram.splitExercise(props.dispatch);
              } else {
                EditProgram.combineExercise(props.dispatch);
              }
              setIsCombinedSets(!isCombinedSets);
            }}
          >
            {isCombinedSets ? "Split" : "Combine"}
          </button>
        </div>
      </MenuItemWrapper>
      <div className="p-2 text-center">
        <Button kind="green" onClick={() => EditProgram.saveExercise(props.dispatch, props.programIndex)}>
          Save
        </Button>
      </div>
      <ModalExercise
        isHidden={!showModalExercise}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, exerciseId);
          }
        }}
      />
    </div>
  );
}

interface IErrorsProps {
  errors: string[];
}

function Errors(props: IErrorsProps): JSX.Element {
  return (
    <section className="p-4 text-sm">
      <p>
        You can't use <strong>Simple</strong> exercise editing, only <strong>Advanced</strong>, because to make it
        possible to use Simple editing, the exercise:
      </p>
      <ul className="pl-4 mt-2 list-disc" data-cy="simple-errors">
        {props.errors.map((e) => (
          <li dangerouslySetInnerHTML={{ __html: e }} />
        ))}
      </ul>
      <p className="mt-2">
        So, please use <strong>Advanced</strong> editing mode.
      </p>
    </section>
  );
}

interface ICombinedSetsProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  dispatch: IDispatch;
}

const inputClassName = `block w-full px-2 py-1 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline`;

function CombinedSets(props: ICombinedSetsProps): JSX.Element {
  const { settings, programExercise } = props;

  const programSets = programExercise.variations[0].sets;
  const [sets, setSets] = useStateWithCallback<number>(programSets.length, updateExercise);
  const [reps, setReps] = useStateWithCallback<number>(() => {
    const result = Program.runScript(programExercise, programSets[0].repsExpr, 1, settings, "reps");
    return result.success ? result.data : 0;
  }, updateExercise);
  const [weight, setWeight] = useStateWithCallback<number>(() => {
    const result = Program.runScript(programExercise, programSets[0].weightExpr, 1, settings, "weight");
    return result.success ? result.data.value : 0;
  }, updateExercise);

  function updateExercise(): void {
    EditProgram.updateSimpleExerciseCombined(props.dispatch, props.settings.units, sets, reps, weight);
  }

  return (
    <section className="flex items-center py-1">
      <div className="flex-1">
        <label>
          <div className="text-xs italic">Sets</div>
          <SetsField
            sets={programSets}
            onChange={(v) => {
              if (v != null) {
                setSets(v);
              }
            }}
          />
        </label>
      </div>
      <div className="px-1 pt-3">x</div>
      <div className="flex-1">
        <label>
          <div className="text-xs italic">Reps</div>
          <RepsField
            reps={reps}
            onChange={(v) => {
              if (v != null) {
                setReps(v);
              }
            }}
          />
        </label>
      </div>
      <div className="px-1 pt-3"></div>
      <div className="flex-1">
        <label>
          <div className="text-xs italic">Weight</div>
          <WeightField
            weight={weight}
            onChange={(v) => {
              if (v != null) {
                setWeight(v);
              }
            }}
          />
        </label>
      </div>
      <span className="pt-3 pl-1">{settings.units}</span>
    </section>
  );
}

interface ISplitSetsProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  dispatch: IDispatch;
}

function SplitSets(props: ISplitSetsProps): JSX.Element {
  const { settings, programExercise } = props;
  const sets = programExercise.variations[0].sets;
  return (
    <Fragment>
      <section className="flex items-center py-1">
        <label className="flex-1 text-xs italic">Reps</label>
        <div className="px-1"></div>
        <label className="flex-1 text-xs italic">Weight</label>
        <div className="px-1"></div>
        <label className="w-12 text-xs italic text-center">AMRAP</label>
        <div className="w-6"></div>
      </section>
      {sets.map((set, setIndex) => {
        const repsResult = Program.runScript(programExercise, set.repsExpr, 1, settings, "reps");
        const reps = repsResult.success ? repsResult.data : 0;
        const weightResult = Program.runScript(programExercise, set.weightExpr, 1, settings, "weight");
        const weight = weightResult.success ? weightResult.data.value : 0;

        return (
          <section className="flex items-center py-1">
            <div className="flex-1">
              <RepsField
                reps={reps}
                onChange={(value) => {
                  if (value != null) {
                    EditProgram.setReps(props.dispatch, value.toString(), 0, setIndex);
                  }
                }}
              />
            </div>
            <div className="px-1"></div>
            <div className="flex-1">
              <WeightField
                weight={weight}
                onChange={(value) => {
                  if (value != null) {
                    const w = Weight.build(value, settings.units);
                    EditProgram.setWeight(props.dispatch, `${w.value}${w.unit}`, 0, setIndex);
                  }
                }}
              />
            </div>
            <span className="px-1">{settings.units}</span>
            <div className="px-1"></div>
            <div className="w-12 text-center">
              <input
                onChange={(e) => EditProgram.setAmrap(props.dispatch, e.currentTarget.checked, 0, setIndex)}
                checked={set.isAmrap}
                type="checkbox"
              />
            </div>
            <div className="w-6 text-right">
              {sets.length > 1 && (
                <button onClick={() => EditProgram.removeSet(props.dispatch, 0, setIndex)} className="align-top">
                  <IconDelete />
                </button>
              )}
            </div>
          </section>
        );
      })}
      <div className="p-1">
        <SemiButton onClick={() => EditProgram.addSet(props.dispatch, 0)} kind="narrow">
          Add Set +
        </SemiButton>
      </div>
    </Fragment>
  );
}

function SetsField(props: { sets: IProgramSet[]; onChange: (sets: number | undefined) => void }): JSX.Element {
  const setsRef = useRef<HTMLInputElement>();

  function getSetsNum(): number | undefined {
    const value = setsRef.current.value;
    if (value != null) {
      let setsNum = parseInt(value, 10);
      if (isNaN(setsNum)) {
        setsNum = 1;
      }
      setsNum = Math.max(1, Math.min(100, setsNum));
      return setsNum;
    }
    return undefined;
  }

  return (
    <input
      data-cy="sets-input"
      ref={setsRef}
      type="number"
      max={100}
      min={1}
      className={inputClassName}
      placeholder="Sets"
      value={props.sets.length}
      onChange={() => {
        props.onChange(getSetsNum());
      }}
    />
  );
}

function RepsField(props: { reps: number; onChange: (reps: number | undefined) => void }): JSX.Element {
  const repsRef = useRef<HTMLInputElement>();

  function getRepsNum(): number | undefined {
    const value = repsRef.current.value;
    if (value != null) {
      let repsNum = parseInt(value, 10);
      if (isNaN(repsNum)) {
        repsNum = 1;
      }
      repsNum = Math.max(1, Math.min(999, repsNum));
      return repsNum;
    }
    return undefined;
  }

  return (
    <input
      data-cy="reps-input"
      max={100}
      min={1}
      ref={repsRef}
      type="number"
      className={inputClassName}
      placeholder="Reps"
      value={props.reps}
      onChange={() => {
        props.onChange(getRepsNum());
      }}
    />
  );
}

function WeightField(props: { weight: number; onChange: (weight: number | undefined) => void }): JSX.Element {
  const weightRef = useRef<HTMLInputElement>();

  function getWeightNum(): number | undefined {
    const value = weightRef.current.value;
    if (value != null) {
      let weightNum = parseInt(value, 10);
      if (isNaN(weightNum)) {
        weightNum = 1;
      }
      weightNum = Math.max(0, Math.min(2000, weightNum));
      return weightNum;
    }
    return undefined;
  }

  return (
    <input
      data-cy="weight-input"
      max={2000}
      min={0}
      type="number"
      ref={weightRef}
      className={inputClassName}
      placeholder="0"
      value={props.weight}
      onChange={() => {
        props.onChange(getWeightNum());
      }}
    />
  );
}
