import { JSX, memo, useEffect, useMemo } from "react";
import { IHistoryRecord, IProgram, ISettings, IStats } from "../../types";
import { IDispatch } from "../../ducks/types";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import {
  IEvaluatedProgram,
  Program_runAllFinishDayScripts,
  Program_nextHistoryRecord,
  Program_evaluate,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "../../models/program";
import { ProgramPreviewPlaygroundDay } from "./programPreviewPlaygroundDay";
import { ILensDispatch, useLensReducer } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Progress_applyProgramDay, Progress_runInitialUpdateScripts } from "../../models/progress";
import { IScrollableTabsProps, ScrollableTabs } from "../scrollableTabs";
import {
  IProgramPreviewPlaygroundDaySetupWithProgress,
  IProgramPreviewPlaygroundState,
} from "./programPreviewPlaygroundSetup";
import deepmerge from "deepmerge";
import { Markdown } from "../markdown";
import { ObjectUtils_filter } from "../../utils/object";
import { ProgramToPlanner } from "../../models/programToPlanner";
import { WebWorkoutModals } from "./webWorkoutModals";
import { useAppState } from "../../navigation/StateContext";
import { IState, updateState } from "../../models/state";

function buildDayDispatch(
  playgroundDispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  weekIndex: number,
  dayIndex: number,
  progress: IHistoryRecord,
  settings: ISettings,
  stats: IStats
): IDispatch {
  return (async (action: unknown) => {
    const newProgress = buildCardsReducer(settings, stats, undefined)(progress, action as ICardsAction);
    onProgressChange(playgroundDispatch, weekIndex, dayIndex, newProgress);
  }) as IDispatch;
}

interface IProgramPreviewPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  isPlayground: boolean;
  scrollableTabsProps?: Partial<IScrollableTabsProps>;
  stats: IStats;
  hasNavbar?: boolean;
  showAllWeeks?: boolean;
  onEngage?: () => void;
  scrollTabZIndex?: number;
  useNavModals?: boolean;
}

function onProgressChange(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  weekIndex: number,
  dayIndex: number,
  newProgress: IHistoryRecord
): void {
  dispatch(
    lb<IProgramPreviewPlaygroundState>()
      .p("progresses")
      .pi(weekIndex)
      .p("days")
      .pi(dayIndex)
      .p("progress")
      .record(newProgress),
    "Update progress"
  );
}

function onProgramChange(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  newEvaluatedProgram: IEvaluatedProgram,
  props: IProgramPreviewPlaygroundProps,
  state: IProgramPreviewPlaygroundState
): void {
  const newPlanner = new ProgramToPlanner(newEvaluatedProgram, state.settings).convertToPlanner();
  const newProgram = { ...state.program, planner: newPlanner };
  dispatch(
    [
      lb<IProgramPreviewPlaygroundState>()
        .p("progresses")
        .recordModify((progresses) => {
          return progresses.map((wk) => {
            return {
              ...wk,
              days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                let newProgress = Progress_applyProgramDay(day.progress, newEvaluatedProgram, day.day, state.settings);
                newProgress = Progress_runInitialUpdateScripts(
                  newProgress,
                  undefined,
                  day.day,
                  newEvaluatedProgram,
                  state.settings,
                  props.stats
                );
                return {
                  ...day,
                  progress: newProgress,
                };
              }),
            };
          });
        }),
      lb<IProgramPreviewPlaygroundState>().p("program").record(newProgram),
    ],
    "Update program"
  );
}

function onSettingsChange(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  newSettings: ISettings,
  props: IProgramPreviewPlaygroundProps,
  evaluatedProgram: IEvaluatedProgram
): void {
  dispatch(
    [
      lb<IProgramPreviewPlaygroundState>()
        .p("progresses")
        .recordModify((progresses) => {
          return progresses.map((wk) => {
            return {
              ...wk,
              days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                let newProgress = Progress_applyProgramDay(day.progress, evaluatedProgram, day.day, newSettings);
                newProgress = Progress_runInitialUpdateScripts(
                  newProgress,
                  undefined,
                  day.day,
                  evaluatedProgram,
                  newSettings,
                  props.stats
                );
                return {
                  ...day,
                  progress: newProgress,
                };
              }),
            };
          });
        }),
      lb<IProgramPreviewPlaygroundState>().p("settings").record(newSettings),
    ],
    "Update settings"
  );
}

function onFinish(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  props: IProgramPreviewPlaygroundProps,
  state: IProgramPreviewPlaygroundState,
  d: IProgramPreviewPlaygroundDaySetupWithProgress
): void {
  const { program: newProgram, exerciseData } = Program_runAllFinishDayScripts(
    state.program,
    d.progress,
    props.stats,
    state.settings
  );
  const newSettings = {
    ...state.settings,
    exerciseData: deepmerge(state.settings.exerciseData, exerciseData),
  };
  dispatch(
    [
      lb<IProgramPreviewPlaygroundState>()
        .p("progresses")
        .recordModify((progresses) => {
          return progresses.map((wk) => {
            return {
              ...wk,
              days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                const newProgress = Program_nextHistoryRecord(newProgram, newSettings, props.stats, day.day);
                return {
                  ...day,
                  progress: newProgress,
                };
              }),
            };
          });
        }),
      lb<IProgramPreviewPlaygroundState>().p("program").record(newProgram),
      lb<IProgramPreviewPlaygroundState>().p("settings").record(newSettings),
    ],
    "Finish day"
  );
}

function buildInitialState(props: IProgramPreviewPlaygroundProps): IProgramPreviewPlaygroundState {
  const initialEvaluatedProgram = Program_evaluate(props.program, props.settings);
  let dayNumber = 0;
  return {
    program: props.program,
    settings: props.settings,
    isPlayground: props.isPlayground,
    progresses: (initialEvaluatedProgram.weeks || []).map((week) => {
      return {
        name: week.name,
        days: week.days.map(() => {
          dayNumber += 1;
          const progress = Program_nextHistoryRecord(props.program, props.settings, props.stats, dayNumber);
          const programDay = Program_getProgramDay(initialEvaluatedProgram, dayNumber);
          const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
          const exerciseTags = new Set(dayExercises.map((e) => e.tags).flat());
          const states = ObjectUtils_filter(initialEvaluatedProgram.states, (key) => {
            return exerciseTags.has(key);
          });
          return { day: dayNumber, states, progress };
        }),
      };
    }),
  };
}

// --- Inner rendering shared by both local and nav variants ---

interface IProgramPreviewPlaygroundInnerProps {
  props: IProgramPreviewPlaygroundProps;
  state: IProgramPreviewPlaygroundState;
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>;
  evaluatedProgram: IEvaluatedProgram;
}

function ProgramPreviewPlaygroundInner(p: IProgramPreviewPlaygroundInnerProps): JSX.Element {
  const { props, state, dispatch, evaluatedProgram } = p;

  if (props.showAllWeeks && !props.isPlayground) {
    return <ProgramPreviewAllWeeks {...props} state={state} dispatch={dispatch} evaluatedProgram={evaluatedProgram} />;
  }

  return (
    <ScrollableTabs
      offsetY={props.scrollableTabsProps?.offsetY ?? (props.hasNavbar ? "3rem" : undefined)}
      zIndex={props.scrollTabZIndex}
      shouldNotExpand={true}
      color="purple"
      type={props.scrollableTabsProps?.type}
      topPadding={props.scrollableTabsProps?.topPadding}
      className={props.scrollableTabsProps?.className}
      nonSticky={props.scrollableTabsProps?.nonSticky}
      tabs={state.progresses.map((week, weekIndex) => {
        const programWeekDescription = evaluatedProgram.weeks[weekIndex]?.description;
        return {
          label: week.name,
          children: () => (
            <div>
              {programWeekDescription && (
                <div className="mx-4 text-sm">
                  <Markdown value={programWeekDescription} />
                </div>
              )}
              <div className="flex flex-wrap justify-center mt-4" style={{ gap: "1.5rem" }}>
                {week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i) => {
                  return (
                    <div key={i} style={{ maxWidth: "24rem", minWidth: "18rem" }} className="flex-1">
                      <ProgramPreviewPlaygroundDay
                        weekName={state.progresses.length > 1 ? week.name : undefined}
                        day={d.day}
                        program={evaluatedProgram}
                        progress={d.progress}
                        settings={state.settings}
                        isPlayground={state.isPlayground}
                        stats={props.stats}
                        onProgressChange={(newProgress) => onProgressChange(dispatch, weekIndex, i, newProgress)}
                        onFinish={() => onFinish(dispatch, props, state, d)}
                      />
                      {!props.useNavModals && (
                        <WebWorkoutModals
                          progress={d.progress}
                          dispatch={buildDayDispatch(dispatch, weekIndex, i, d.progress, props.settings, props.stats)}
                          settings={state.settings}
                          program={evaluatedProgram}
                          day={d.day}
                          onProgramChange={(newEvaluatedProgram) =>
                            onProgramChange(dispatch, newEvaluatedProgram, props, state)
                          }
                          onSettingsChange={(newSettings) =>
                            onSettingsChange(dispatch, newSettings, props, evaluatedProgram)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        };
      })}
    />
  );
}

// --- Local variant (standalone web pages) ---

function ProgramPreviewPlaygroundLocal(props: IProgramPreviewPlaygroundProps): JSX.Element {
  const initialState = useMemo(() => buildInitialState(props), [props.program, props.settings]);
  const [state, dispatch] = useLensReducer(initialState, {}, [
    () => {
      if (props.onEngage) {
        props.onEngage();
      }
    },
  ]);
  const evaluatedProgram = useMemo(() => {
    return Program_evaluate(state.program, state.settings);
  }, [state.program, state.settings]);

  return (
    <ProgramPreviewPlaygroundInner
      props={props}
      state={state}
      dispatch={dispatch}
      evaluatedProgram={evaluatedProgram}
    />
  );
}

// --- Nav variant (app, uses global state.playgroundState) ---

function buildGlobalPlaygroundDispatch(globalDispatch: IDispatch): ILensDispatch<IProgramPreviewPlaygroundState> {
  return (lensRecordings, desc) => {
    const recordings = Array.isArray(lensRecordings) ? lensRecordings : [lensRecordings];
    updateState(
      globalDispatch,
      recordings.map((lr) =>
        lb<IState>()
          .pi("playgroundState")
          .recordModify((s) => lr.fn(s))
      ),
      desc
    );
  };
}

function ProgramPreviewPlaygroundNav(props: IProgramPreviewPlaygroundProps): JSX.Element {
  const { state: globalState, dispatch: globalDispatch } = useAppState();
  const initialState = useMemo(() => buildInitialState(props), [props.program, props.settings]);

  useEffect(() => {
    updateState(
      globalDispatch,
      [lb<IState>().p("playgroundState").record(initialState)],
      "Initialize playground state"
    );
    return () => {
      updateState(globalDispatch, [lb<IState>().p("playgroundState").record(undefined)], "Cleanup playground state");
    };
  }, [initialState]);

  const state = globalState.playgroundState ?? initialState;
  const dispatch = useMemo(() => buildGlobalPlaygroundDispatch(globalDispatch), [globalDispatch]);

  const evaluatedProgram = useMemo(() => {
    return Program_evaluate(state.program, state.settings);
  }, [state.program, state.settings]);

  return (
    <ProgramPreviewPlaygroundInner
      props={props}
      state={state}
      dispatch={dispatch}
      evaluatedProgram={evaluatedProgram}
    />
  );
}

// --- Entry point ---

export const ProgramPreviewPlayground = memo((props: IProgramPreviewPlaygroundProps): JSX.Element => {
  if (props.useNavModals) {
    return <ProgramPreviewPlaygroundNav {...props} />;
  }
  return <ProgramPreviewPlaygroundLocal {...props} />;
});

// --- All Weeks layout ---

interface IProgramPreviewAllWeeksProps extends IProgramPreviewPlaygroundProps {
  evaluatedProgram: IEvaluatedProgram;
  state: IProgramPreviewPlaygroundState;
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>;
}

function buildAllWeeksCss(numWeeks: number): string {
  const minCol = 20;
  const gap = 1;
  const rules: string[] = [];

  rules.push(
    `.preview-all-weeks-scroll { overflow-x: auto; container-type: inline-size; container-name: preview-weeks; scroll-snap-type: x mandatory; }`,
    `.preview-all-weeks-grid { display: grid; gap: ${gap}rem; align-items: start; ` +
      `grid-template-columns: repeat(${numWeeks}, minmax(${minCol}rem, 24rem)); }`
  );

  for (let n = 1; n < numWeeks; n++) {
    const breakpoint = n === 1 ? 0 : n * minCol + (n - 1) * gap;
    rules.push(
      `@container preview-weeks (min-width: ${breakpoint}rem) {` +
        ` .preview-all-weeks-grid {` +
        ` grid-template-columns: repeat(${numWeeks}, calc((100cqi - ${n - 1}rem) / ${n})); } }`
    );
  }

  const allFitBreakpoint = numWeeks * minCol + (numWeeks - 1) * gap;
  rules.push(
    `@container preview-weeks (min-width: ${allFitBreakpoint}rem) {` +
      ` .preview-all-weeks-grid {` +
      ` grid-template-columns: repeat(${numWeeks}, minmax(${minCol}rem, 24rem)); justify-content: center; } }`
  );

  return rules.join("\n");
}

function ProgramPreviewAllWeeks(props: IProgramPreviewAllWeeksProps): JSX.Element {
  const { state, dispatch, evaluatedProgram } = props;
  const numWeeks = state.progresses.length;
  const cssRules = useMemo(() => buildAllWeeksCss(numWeeks), [numWeeks]);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: cssRules }} />
      <div className="preview-all-weeks-scroll">
        <div className="preview-all-weeks-grid">
          {state.progresses.map((week, weekIndex) => {
            const programWeekDescription = evaluatedProgram.weeks[weekIndex]?.description;
            return (
              <div key={weekIndex} style={{ gridColumn: weekIndex + 1, gridRow: 1, scrollSnapAlign: "start" }}>
                <h3 className="mb-1 text-lg font-bold">{week.name}</h3>
                {programWeekDescription && (
                  <div className="text-sm">
                    <Markdown value={programWeekDescription} />
                  </div>
                )}
              </div>
            );
          })}
          {state.progresses.map((week, weekIndex) =>
            week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i: number) => (
              <div key={d.day} style={{ gridColumn: weekIndex + 1, gridRow: i + 2 }}>
                <ProgramPreviewPlaygroundDay
                  weekName={numWeeks > 1 ? week.name : undefined}
                  day={d.day}
                  program={evaluatedProgram}
                  progress={d.progress}
                  settings={props.settings}
                  isPlayground={props.isPlayground}
                  stats={props.stats}
                  onProgressChange={(newProgress) => onProgressChange(dispatch, weekIndex, i, newProgress)}
                  onFinish={() => onFinish(dispatch, props, state, d)}
                />
                {!props.useNavModals && (
                  <WebWorkoutModals
                    progress={d.progress}
                    dispatch={buildDayDispatch(dispatch, weekIndex, i, d.progress, props.settings, props.stats)}
                    settings={state.settings}
                    program={evaluatedProgram}
                    day={d.day}
                    onProgramChange={(newEvaluatedProgram) =>
                      onProgramChange(dispatch, newEvaluatedProgram, props, state)
                    }
                    onSettingsChange={(newSettings) => onSettingsChange(dispatch, newSettings, props, evaluatedProgram)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
