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
import { ILensDispatch, useLensReducer } from "../../utils/useLensReducer";
import { IAudioInterface } from "../../lib/audioInterface";
import { Service } from "../../api/service";
import { lb } from "lens-shmens";
import { memo } from "preact/compat";
import { ComparerUtils } from "../../utils/comparer";

export interface IProgramDetailsContentProps {
  selectedProgramId: string;
  programs: IProgram[];
  client: Window["fetch"];
  audio: IAudioInterface;
}

type IProgramDetailsDispatch = ILensDispatch<IState>;

export interface IProgramDetailsProps {
  settings: ISettings;
  program: IProgram;
  shouldShowAllScripts: boolean;
  shouldShowAllFormulas: boolean;
  dispatch: IProgramDetailsDispatch;
}

interface IState {
  programs: IProgram[];
  selectedProgramId: string;
  shouldShowAllScripts: boolean;
  shouldShowAllFormulas: boolean;
  settings: ISettings;
}

export function ProgramDetailsContent(props: IProgramDetailsContentProps): JSX.Element {
  const service = new Service(props.client);
  const ref = useRef<HTMLSelectElement>();
  const initialState: IState = {
    programs: props.programs,
    selectedProgramId: props.selectedProgramId,
    shouldShowAllScripts: false,
    shouldShowAllFormulas: false,
    settings: Settings.build(),
  };
  const [state, dispatch] = useLensReducer(initialState, { audio: props.audio, service });
  const program = state.programs.filter((p) => p.id === state.selectedProgramId)[0] || state.programs[0];
  if (typeof window !== "undefined" && window.history) {
    window.history.replaceState({}, `Liftosaur: Program Details - ${program.name}`, `/programs/${program.id}`);
  }
  return (
    <div>
      <div className="px-4 text-right">
        <select
          ref={ref}
          className="py-2 border border-gray-400 rounded-lg"
          name="selected_program_id"
          id="selected_program_id"
          onChange={() => {
            dispatch(lb<IState>().p("selectedProgramId").record(ref.current.value));
            window.history.replaceState({}, `Liftosaur: Program Details - ${program.name}`, `/programs/${program.id}`);
          }}
        >
          {CollectionUtils.sort(state.programs, (a, b) => a.name.localeCompare(b.name)).map((p) => (
            <option selected={p.id === state.selectedProgramId} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div class="pb-4 text-right px-4">
        <button
          onClick={() => dispatch(lb<IState>().p("shouldShowAllFormulas").record(!state.shouldShowAllFormulas))}
          className="mr-2 text-sm italic text-blue-700 underline"
        >
          {state.shouldShowAllFormulas ? "Hide All Formulas" : "Show All Formulas"}
        </button>
        <button
          onClick={() => dispatch(lb<IState>().p("shouldShowAllScripts").record(!state.shouldShowAllScripts))}
          className="text-sm italic text-blue-700 underline"
        >
          {state.shouldShowAllScripts ? "Hide All Scripts" : "Show All Scripts"}
        </button>
      </div>
      <ProgramDetails
        settings={state.settings}
        key={`${program.id}_${state.shouldShowAllFormulas}_${state.shouldShowAllScripts}`}
        program={program}
        shouldShowAllFormulas={state.shouldShowAllFormulas}
        shouldShowAllScripts={state.shouldShowAllScripts}
        dispatch={dispatch}
      />
    </div>
  );
}

export function ProgramDetails(props: IProgramDetailsProps): JSX.Element {
  return (
    <div>
      <h1 className="px-4 text-3xl font-bold leading-tight">Program Details - {props.program.name}</h1>
      {props.program.days.map((day, dayIndex) => {
        return (
          <section className={`py-2 px-4 ${dayIndex % 2 === 0 ? "bg-white" : "bg-white"}`}>
            <h2 className="pt-4 pb-4 text-xl text-gray-600">{day.name}</h2>
            <ul>
              {day.exercises.map((dayEntry, index) => {
                const programExercise = props.program.exercises.filter((e) => e.id === dayEntry.id)[0];
                return (
                  <ProgramDetailsExercise
                    programId={props.program.id}
                    programExercise={programExercise}
                    programExerciseIndex={index}
                    dayIndex={dayIndex}
                    settings={props.settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                    shouldShowAllScripts={props.shouldShowAllScripts}
                    dispatch={props.dispatch}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

interface IProgramDetailsExerciseProps {
  programId: string;
  programExercise: IProgramExercise;
  programExerciseIndex: number;
  dayIndex: number;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  shouldShowAllScripts: boolean;
  dispatch: IProgramDetailsDispatch;
}

type IProgramDetailsExerciseMode = "details" | "playground";

const ProgramDetailsExercise = memo(
  (props: IProgramDetailsExerciseProps): JSX.Element => {
    const { programExercise, dayIndex, settings, programExerciseIndex } = props;
    const variationIndex = Program.nextVariationIndex(programExercise, dayIndex + 1, settings);
    const variation = programExercise.variations[variationIndex];
    const progression = Progression.getProgression(programExercise.finishDayExpr);
    const deload = Progression.getDeload(programExercise.finishDayExpr);

    const [mode, setMode] = useState<IProgramDetailsExerciseMode>("details");

    return (
      <li className={`${programExerciseIndex !== 0 ? "pt-5 mt-5 border-t border-gray-200" : ""}`}>
        <div className={`program-details-exercise flex w-full is-${mode}`}>
          <div className="program-details-exercise-number pt-2 pr-2 text-4xl text-gray-400">
            {programExerciseIndex + 1}
          </div>
          <div className="program-details-exercise-image w-30 pr-4">
            <ExerciseImage exerciseType={programExercise.exerciseType} customExercises={{}} size="small" />
          </div>
          <div className="flex-1">
            <div className="program-details-exercise-switch text-right">
              <button
                onClick={() => setMode(mode === "details" ? "playground" : "details")}
                className="text-sm text-blue-700 underline"
              >
                {mode === "details" ? "Playground" : "Details"}
              </button>
            </div>
            <div className="flex">
              <div className="program-details-exercise-content flex-1 pr-2">
                <h3 className="font-bold">{programExercise.name}</h3>
                <div className="pt-2">
                  <Reps
                    sets={variation.sets}
                    programExercise={programExercise}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div className="pt-2">
                  <Weights
                    sets={variation.sets}
                    programExercise={programExercise}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div>{progression && <ProgressionView progression={progression} />}</div>
                <div>{deload && <DeloadView deload={deload} />}</div>
                <div>
                  <FinishDayExprView
                    finishDayExpr={programExercise.finishDayExpr}
                    shouldShowAllScripts={props.shouldShowAllScripts}
                  />
                </div>
              </div>
              <div className="program-details-exercise-playground flex-1">
                <Playground
                  programId={props.programId}
                  programExercise={programExercise}
                  variationIndex={variationIndex}
                  settings={settings}
                  day={dayIndex + 1}
                  dispatch={props.dispatch}
                />
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }
);

function getRepsValues(props: IRepsWeightsProps): string[] {
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

function getWeightsValues(props: IRepsWeightsProps): string[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.weightExpr,
      props.dayIndex,
      props.programExercise.state,
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "weight"
    );
    return Weight.display(Weight.round(value, props.settings, props.programExercise.exerciseType.equipment));
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

interface IRepsWeightsProps {
  sets: IProgramSet[];
  programExercise: IProgramExercise;
  dayIndex: number;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
}

const Reps = memo(
  (props: IRepsWeightsProps): JSX.Element => {
    const values = getRepsValues(props);
    const scripts = getRepsScripts({ sets: props.sets });
    return <ValuesAndFormula values={values} scripts={scripts} shouldShowAllFormulas={props.shouldShowAllFormulas} />;
  }
);

const Weights = memo(
  (props: IRepsWeightsProps): JSX.Element => {
    const values = getWeightsValues(props);
    const scripts = getWeightsScripts({ sets: props.sets });
    return <ValuesAndFormula values={values} scripts={scripts} shouldShowAllFormulas={props.shouldShowAllFormulas} />;
  }
);

interface IValuesAndFormulaProps {
  values: string[];
  scripts: string[];
  shouldShowAllFormulas: boolean;
}

function ValuesAndFormula(props: IValuesAndFormulaProps): JSX.Element {
  const { values, scripts } = props;
  const areEqual = areValuesAndScriptsEqual(values, scripts);
  const [isDisplayingFormula, setIsDisplayingFormula] = useState(props.shouldShowAllFormulas);
  return (
    <div>
      {(areEqual || !isDisplayingFormula) && (
        <>
          <GroupedValues values={values} />{" "}
          {!areEqual && (
            <span className="whitespace-no-wrap">
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
          <GroupedValues values={scripts} />{" "}
          <span className="whitespace-no-wrap">
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

const GroupedValues = memo(
  (props: { values: string[] }): JSX.Element => {
    const groups = props.values.reduce<[string, number][]>((acc, value) => {
      const last = acc[acc.length - 1];
      if (last == null) {
        acc.push([value, 1]);
      } else {
        const [lastValue] = last;
        if (lastValue === value) {
          acc[acc.length - 1][1] += 1;
        } else {
          acc.push([value, 1]);
        }
      }
      return acc;
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
);

const ProgressionView = memo(
  (props: { progression: IProgression }): JSX.Element => {
    const { progression } = props;
    return (
      <span>
        Increase by <span>{progression.increment}</span>
        <span>{progression.unit}</span> after <span>{progression.attempts}</span> successful attempts.
      </span>
    );
  }
);

const DeloadView = memo(
  (props: { deload: IDeload }): JSX.Element => {
    const { deload } = props;
    return (
      <span>
        Decrease by <span>{deload.decrement}</span>
        <span>{deload.unit}</span> after <span>{deload.attempts}</span> failed attempts.
      </span>
    );
  }
);

const FinishDayExprView = memo(
  (props: { finishDayExpr: string; shouldShowAllScripts: boolean }): JSX.Element | null => {
    const [isVisible, setIsVisible] = useState(props.shouldShowAllScripts);
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
);

interface IPlaygroundProps {
  programId: string;
  programExercise: IProgramExercise;
  variationIndex: number;
  settings: ISettings;
  day: number;
  dispatch: IProgramDetailsDispatch;
}

const Playground = memo((props: IPlaygroundProps): JSX.Element => {
  const updateProgress = (args: { programExercise?: IProgramExercise; progress?: IHistoryRecord }): void => {
    let newProgress;
    if (args.programExercise != null) {
      const entry = progress.entries[0];
      const newEntry = Progress.applyProgramExercise(entry, args.programExercise, day, settings, true);
      newProgress = History.buildFromEntry(newEntry, day);
    } else if (args.progress != null) {
      newProgress = args.progress;
    }
    if (newProgress != null) {
      progressRef.current = newProgress;
      setProgress(newProgress);
    }
  };

  const { settings, day, variationIndex, programExercise } = props;
  const [progress, setProgress] = useState(() => {
    const entry = Program.nextHistoryEntry(
      programExercise.exerciseType,
      day,
      programExercise.variations[variationIndex].sets,
      programExercise.state,
      settings
    );
    return History.buildFromEntry(entry, day);
  });
  const progressRef = useRef(progress);
  const historyRef = useRef([]);

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
        history={historyRef.current}
        showHelp={false}
        entry={entry}
        day={props.day}
        programExercise={programExercise}
        index={0}
        forceShowStateChanges={true}
        settings={props.settings}
        dispatch={dispatch}
        onChangeReps={() => undefined}
        isCurrent={true}
      />
      <StateVars
        stateVars={programExercise.state}
        id={programExercise.id}
        settings={settings}
        onChange={(key, value) => {
          const newProgramExercise = {
            ...programExercise,
            state: { ...programExercise.state, [key]: value },
          };
          props.dispatch(
            lb<IState>()
              .p("programs")
              .findBy("id", props.programId)
              .p("exercises")
              .findBy("id", newProgramExercise.id)
              .record(newProgramExercise)
          );
          updateProgress({ programExercise: newProgramExercise });
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
}, ComparerUtils.noFns);

interface IStateVarsProps {
  id: string;
  stateVars: IProgramState;
  settings: ISettings;
  onChange: (key: string, value: number | IWeight) => void;
}

const StateVars = memo((props: IStateVarsProps): JSX.Element | null => {
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
});
