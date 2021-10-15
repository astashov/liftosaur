import { h, JSX, Fragment } from "preact";
import { useCallback, useRef, useState } from "preact/hooks";
import { ExerciseView } from "../../components/exercise";
import { ExerciseImage } from "../../components/exerciseImage";
import { ModalAmrap } from "../../components/modalAmrap";
import { ModalWeight } from "../../components/modalWeight";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IDispatch } from "../../ducks/types";
import { Program } from "../../models/program";
import { History } from "../../models/history";
import { IDeload, IProgression, Progression } from "../../models/progression";
import { Settings } from "../../models/settings";
import {
  IHistoryRecord,
  IProgram,
  IProgramExercise,
  IProgramSet,
  IProgramState,
  ISettings,
  IWeight,
} from "../../types";
import { ObjectUtils } from "../../utils/object";
import { inputClassName } from "../../components/input";
import { Weight } from "../../models/weight";
import { Progress } from "../../models/progress";
import Prism from "prismjs";
import { CollectionUtils } from "../../utils/collection";

export interface IProgramDetailsContentProps {
  selectedProgramId: string;
  programs: IProgram[];
}

export interface IProgramDetailsProps {
  program: IProgram;
}

export function ProgramDetailsContent(props: IProgramDetailsContentProps): JSX.Element {
  const { programs } = props;
  const ref = useRef<HTMLSelectElement>();
  const [selectedProgramId, setSelectedProgramId] = useState(props.selectedProgramId);
  const program = programs.filter((p) => p.id === selectedProgramId)[0] || programs[0];
  if (typeof window !== "undefined" && window.history) {
    window.history.replaceState({}, `Liftosaur: Program Details - ${program.name}`, `/programs/${program.id}`);
  }
  return (
    <div>
      <div className="pb-4 text-right">
        <select
          ref={ref}
          className="py-2 border border-gray-400 rounded-lg"
          name="selected_program_id"
          id="selected_program_id"
          onChange={() => {
            setSelectedProgramId(ref.current.value);
            window.history.replaceState({}, `Liftosaur: Program Details - ${program.name}`, `/programs/${program.id}`);
          }}
        >
          {CollectionUtils.sort(programs, (a, b) => a.name.localeCompare(b.name)).map((p) => (
            <option selected={p.id === selectedProgramId} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <ProgramDetails key={program.id} program={program} />
    </div>
  );
}

export function ProgramDetails(props: IProgramDetailsProps): JSX.Element {
  const settings = Settings.build();
  return (
    <div>
      <h1 className="text-3xl font-bold">Program Details - {props.program.name}</h1>
      {props.program.days.map((day, dayIndex) => {
        return (
          <section className={`p-2 ${dayIndex % 2 === 0 ? "bg-white" : "bg-white"}`}>
            <h2 className="pt-4 pb-4 text-xl text-gray-600">{day.name}</h2>
            <ul>
              {day.exercises.map((dayEntry, index) => {
                const programExercise = props.program.exercises.filter((e) => e.id === dayEntry.id)[0];
                const variationIndex = Program.nextVariationIndex(programExercise, dayIndex + 1, settings);
                const variation = programExercise.variations[variationIndex];
                const progression = Progression.getProgression(programExercise.finishDayExpr);
                const deload = Progression.getDeload(programExercise.finishDayExpr);
                return (
                  <li className={`${index !== 0 ? "pt-5 mt-5 border-t border-gray-200" : ""}`}>
                    <div className="flex w-full">
                      <div className="pt-2 pr-2 text-4xl text-gray-400">{index + 1}</div>
                      <div className="w-30 pr-4">
                        <ExerciseImage exerciseType={programExercise.exerciseType} customExercises={{}} size="small" />
                      </div>
                      <div className=" flex-1 pr-2">
                        <h3 className="font-bold">{programExercise.name}</h3>
                        <div className="pt-2">
                          <Reps
                            sets={variation.sets}
                            programExercise={programExercise}
                            dayIndex={dayIndex}
                            settings={settings}
                          />
                        </div>
                        <div className="pt-2">
                          <Weights
                            sets={variation.sets}
                            programExercise={programExercise}
                            dayIndex={dayIndex}
                            settings={settings}
                          />
                        </div>
                        <div>{progression && <ProgressionView progression={progression} />}</div>
                        <div>{deload && <DeloadView deload={deload} />}</div>
                        <div>
                          <FinishDayExprView finishDayExpr={programExercise.finishDayExpr} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Playground
                          programExercise={programExercise}
                          variationIndex={variationIndex}
                          settings={settings}
                          day={dayIndex + 1}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function getRepsValues(props: ISetsRepsProps): string[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.repsExpr,
      props.dayIndex,
      props.programExercise.state,
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "reps"
    );
    return `${value}`;
  }, []);
}

function getWeightsValues(props: ISetsRepsProps): string[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.weightExpr,
      props.dayIndex,
      props.programExercise.state,
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "weight"
    );
    return Weight.display(value);
  }, []);
}

function getWeightsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.weightExpr);
}

function getRepsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.repsExpr);
}

function areValuesAndScriptsEqual(values: string[], scripts: string[]): boolean {
  return values.length === scripts.length && values.every((v, i) => v === scripts[i]);
}

interface ISetsRepsProps {
  sets: IProgramSet[];
  programExercise: IProgramExercise;
  dayIndex: number;
  settings: ISettings;
}

function Reps(props: ISetsRepsProps): JSX.Element {
  const values = getRepsValues(props);
  const scripts = getRepsScripts({ sets: props.sets });
  return <ValuesAndFormula values={values} scripts={scripts} />;
}

function Weights(props: ISetsRepsProps): JSX.Element {
  const values = getWeightsValues(props);
  const scripts = getWeightsScripts({ sets: props.sets });
  return <ValuesAndFormula values={values} scripts={scripts} />;
}

interface IValuesAndFormulaProps {
  values: string[];
  scripts: string[];
}

function ValuesAndFormula(props: IValuesAndFormulaProps): JSX.Element {
  const { values, scripts } = props;
  const areEqual = areValuesAndScriptsEqual(values, scripts);
  const [isDisplayingFormula, setIsDisplayingFormula] = useState(false);
  return (
    <div>
      {(areEqual || !isDisplayingFormula) && (
        <>
          <GroupedValues values={values} />
          {!areEqual && (
            <span className="pl-2 whitespace-no-wrap">
              (
              <button
                className="text-sm text-blue-700 underline"
                onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
              >
                Show Formula
              </button>
              )
            </span>
          )}
        </>
      )}
      {!areEqual && isDisplayingFormula && (
        <>
          <GroupedValues values={scripts} />
          <span className="pl-2 whitespace-no-wrap">
            (
            <button
              onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
              className="text-sm text-blue-700 underline"
            >
              Show Values
            </button>
            )
          </span>
        </>
      )}
    </div>
  );
}

function GroupedValues(props: { values: string[] }): JSX.Element {
  const groups = props.values.reduce<[string, number][]>((memo, value) => {
    const last = memo[memo.length - 1];
    if (last == null) {
      memo.push([value, 1]);
    } else {
      const [lastValue] = last;
      if (lastValue === value) {
        memo[memo.length - 1][1] += 1;
      } else {
        memo.push([value, 1]);
      }
    }
    return memo;
  }, []);
  const jsxes = groups.map((group) => {
    const [reps, sets] = group;
    return (
      <span>
        {sets > 1 && (
          <Fragment>
            <span>{sets}</span>
            <span> x </span>
          </Fragment>
        )}
        <span>{reps}</span>
      </span>
    );
  });
  return (
    <span>
      {jsxes.map((el, i) => (
        <span>
          {i !== 0 ? <span> / </span> : <Fragment></Fragment>}
          {el}
        </span>
      ))}
    </span>
  );
}

function ProgressionView(props: { progression: IProgression }): JSX.Element {
  const { progression } = props;
  return (
    <span>
      Increase by <span>{progression.increment}</span>
      <span>{progression.unit}</span> after <span>{progression.attempts}</span> successful attempts.
    </span>
  );
}

function DeloadView(props: { deload: IDeload }): JSX.Element {
  const { deload } = props;
  return (
    <span>
      Decrease by <span>{deload.decrement}</span>
      <span>{deload.unit}</span> after <span>{deload.attempts}</span> failed attempts.
    </span>
  );
}

function FinishDayExprView(props: { finishDayExpr: string }): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const codeRef = useRef<HTMLElement>();
  const highlightedCode = Prism.highlight(props.finishDayExpr, Prism.languages.javascript, "javascript");
  if (!props.finishDayExpr) {
    return null;
  }

  return (
    <div className="pt-2">
      <span className="text-sm italic">Finish Day Script: </span>
      <div className={isVisible ? "block" : "hidden"}>
        <pre className={`text-sm overflow-auto ${isVisible ? "block" : "hidden"}`}>
          <code
            ref={codeRef}
            class="block code language-javascript"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
      <button className="text-sm text-blue-700 underline" onClick={() => setIsVisible(!isVisible)}>
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

interface IPlaygroundProps {
  programExercise: IProgramExercise;
  variationIndex: number;
  settings: ISettings;
  day: number;
}

function Playground(props: IPlaygroundProps): JSX.Element {
  const updateProgress = (args: { programExercise?: IProgramExercise; progress?: IHistoryRecord }): void => {
    let newProgress;
    if (args.programExercise != null) {
      const entry = progress.entries[0];
      const newEntry = Progress.applyProgramExercise(entry, args.programExercise, day, settings);
      newProgress = History.buildFromEntry(newEntry, day);
    } else if (args.progress != null) {
      newProgress = args.progress;
    }
    if (newProgress != null) {
      progressRef.current = newProgress;
      setProgress(newProgress);
    }
  };

  const { settings, day, variationIndex } = props;
  const programExerciseRef = useRef(props.programExercise);
  const [progress, setProgress] = useState(() => {
    const entry = Program.nextHistoryEntry(
      programExerciseRef.current.exerciseType,
      day,
      programExerciseRef.current.variations[variationIndex].sets,
      programExerciseRef.current.state,
      settings
    );
    return History.buildFromEntry(entry, day);
  });
  const progressRef = useRef(progress);

  const entry = progressRef.current.entries[0];

  const dispatch: IDispatch = useCallback(
    async (action) => {
      const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
      updateProgress({ progress: newProgress });
    },
    [settings, progress]
  );

  return (
    <Fragment>
      <ExerciseView
        history={[]}
        showHelp={false}
        entry={entry}
        day={props.day}
        programExercise={programExerciseRef.current}
        index={0}
        forceShowStateChanges={true}
        settings={props.settings}
        dispatch={dispatch}
        onChangeReps={() => undefined}
        isCurrent={true}
      />
      <StateVars
        stateVars={programExerciseRef.current.state}
        id={programExerciseRef.current.id}
        settings={settings}
        onChange={(key, value) => {
          const newProgramExercise = {
            ...programExerciseRef.current,
            state: { ...programExerciseRef.current.state, [key]: value },
          };
          programExerciseRef.current = newProgramExercise;
          updateProgress({ programExercise: programExerciseRef.current });
        }}
      />
      <ModalAmrap isHidden={progressRef.current.ui?.amrapModal == null} dispatch={dispatch} />
      <ModalWeight
        isHidden={progressRef.current.ui?.weightModal == null}
        units={props.settings.units}
        dispatch={dispatch}
        weight={progressRef.current.ui?.weightModal?.weight ?? 0}
      />
    </Fragment>
  );
}

interface IStateVarsProps {
  id: string;
  stateVars: IProgramState;
  settings: ISettings;
  onChange: (key: string, value: number | IWeight) => void;
}

function StateVars(props: IStateVarsProps): JSX.Element | null {
  const { id, stateVars } = props;
  if (Object.keys(stateVars).length === 0) {
    return null;
  }
  const ref = useRef<HTMLInputElement>();
  const varEls = ObjectUtils.keys(stateVars).map((key) => {
    const variable = stateVars[key];
    const name = `${id}_${key}`;
    const val = typeof variable === "number" ? variable : variable.value;
    return (
      <li className="flex items-center pb-2">
        <label className="pr-2 font-bold" for={name}>
          {key}
        </label>
        <input
          ref={ref}
          className={inputClassName}
          id={name}
          name={name}
          type="number"
          value={val}
          onInput={() => {
            const newValStr = ref.current.value;
            const newVal = newValStr ? parseInt(newValStr, 10) : undefined;
            if (newVal != null && !isNaN(newVal)) {
              const newValue = typeof variable === "number" ? newVal : Weight.build(newVal, variable.unit);
              props.onChange(key, newValue);
            }
          }}
        />
      </li>
    );
  });
  return (
    <div className="flex justify-start">
      <div style={{ width: "10em" }}>
        <h4 className="text-sm italic">State variables:</h4>
        <ul>{varEls}</ul>
      </div>
    </div>
  );
}
