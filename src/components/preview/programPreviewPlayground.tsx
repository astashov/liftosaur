import { JSX, memo, ReactNode, useEffect, useMemo } from "react";
import { View } from "react-native";
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
import { ProgramPreviewPlaygroundInnerRenderer } from "./programPreviewPlaygroundInner";
import type { IScrollableTabsProps } from "../scrollableTabs";
import {
  IProgramPreviewPlaygroundDaySetupWithProgress,
  IProgramPreviewPlaygroundState,
} from "./programPreviewPlaygroundSetup";
import deepmerge from "deepmerge";
import { SimpleMarkdown } from "../simpleMarkdown";
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
  headerContent?: ReactNode;
  externalWeekIndex?: number;
  hideWeekTabBar?: boolean;
  onContentScroll?: (e: import("react-native").NativeSyntheticEvent<import("react-native").NativeScrollEvent>) => void;
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

export function playgroundOnProgramChange(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  newEvaluatedProgram: IEvaluatedProgram,
  stats: IStats,
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
                  stats
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

export function playgroundOnSettingsChange(
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  newSettings: ISettings,
  stats: IStats,
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
                  stats
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

function renderWeekContent(
  week: { name: string; days: IProgramPreviewPlaygroundDaySetupWithProgress[] },
  weekIndex: number,
  state: IProgramPreviewPlaygroundState,
  props: IProgramPreviewPlaygroundProps,
  dispatch: ILensDispatch<IProgramPreviewPlaygroundState>,
  evaluatedProgram: IEvaluatedProgram
): JSX.Element {
  const programWeekDescription = evaluatedProgram.weeks[weekIndex]?.description;
  return (
    <View>
      {programWeekDescription && (
        <View className="mx-4">
          <SimpleMarkdown value={programWeekDescription} className="text-sm" />
        </View>
      )}
      <View className="flex-row flex-wrap justify-center mt-4" style={{ gap: 24 }}>
        {week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i) => {
          return (
            <View key={i} style={{ maxWidth: 384, minWidth: 288 }} className="flex-1">
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
                    playgroundOnProgramChange(dispatch, newEvaluatedProgram, props.stats, state)
                  }
                  onSettingsChange={(newSettings) =>
                    playgroundOnSettingsChange(dispatch, newSettings, props.stats, evaluatedProgram)
                  }
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ProgramPreviewPlaygroundInner(p: IProgramPreviewPlaygroundInnerProps): JSX.Element {
  const { props, state, dispatch, evaluatedProgram } = p;

  if (props.showAllWeeks && !props.isPlayground) {
    return <ProgramPreviewAllWeeks {...props} state={state} dispatch={dispatch} evaluatedProgram={evaluatedProgram} />;
  }

  return (
    <ProgramPreviewPlaygroundInnerRenderer
      headerContent={props.headerContent}
      weekNames={state.progresses.map((w) => w.name)}
      singleWeek={state.progresses.length <= 1}
      renderWeekContent={(weekIndex) =>
        renderWeekContent(state.progresses[weekIndex], weekIndex, state, props, dispatch, evaluatedProgram)
      }
      scrollableTabsProps={props.scrollableTabsProps}
      hasNavbar={props.hasNavbar}
      scrollTabZIndex={props.scrollTabZIndex}
      externalWeekIndex={props.externalWeekIndex}
      hideWeekTabBar={props.hideWeekTabBar}
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
                    <SimpleMarkdown value={programWeekDescription} />
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
                      playgroundOnProgramChange(dispatch, newEvaluatedProgram, props.stats, state)
                    }
                    onSettingsChange={(newSettings) =>
                      playgroundOnSettingsChange(dispatch, newSettings, props.stats, evaluatedProgram)
                    }
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
