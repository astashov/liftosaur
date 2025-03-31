import { h, JSX } from "preact";
import { memo, useMemo } from "preact/compat";
import { IHistoryRecord, IProgram, ISettings } from "../../types";
import { Program } from "../../models/program";
import { ProgramPreviewPlaygroundDay } from "./programPreviewPlaygroundDay";
import { useLensReducer } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Progress } from "../../models/progress";
import { ScrollableTabs } from "../scrollableTabs";
import { IProgramPreviewPlaygroundDaySetup, IProgramPreviewPlaygroundWeekSetup } from "./programPreviewPlaygroundSetup";
import deepmerge from "deepmerge";
import { Markdown } from "../markdown";
import { ObjectUtils } from "../../utils/object";
import { ProgramToPlanner } from "../../models/programToPlanner";

type IProgramPreviewPlaygroundDaySetupWithProgress = IProgramPreviewPlaygroundDaySetup & {
  progress: IHistoryRecord;
};

type IProgramPreviewPlaygroundProgresses = (IProgramPreviewPlaygroundWeekSetup & {
  days: IProgramPreviewPlaygroundDaySetupWithProgress[];
})[];

interface IProgramPreviewPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  isPlayground: boolean;
  hasNavbar?: boolean;
}

interface IProgramPreviewPlaygroundState {
  program: IProgram;
  settings: ISettings;
  isPlayground: boolean;
  progresses: IProgramPreviewPlaygroundProgresses;
}

export const ProgramPreviewPlayground = memo((props: IProgramPreviewPlaygroundProps): JSX.Element => {
  const initialEvaluatedProgram = useMemo(
    () => Program.evaluate(props.program, props.settings),
    [props.program, props.settings]
  );
  let dayNumber = 0;
  const initialState: IProgramPreviewPlaygroundState = {
    program: props.program,
    settings: props.settings,
    isPlayground: props.isPlayground,
    progresses: (initialEvaluatedProgram.weeks || []).map((week) => {
      return {
        name: week.name,
        days: week.days.map(() => {
          dayNumber += 1;
          const progress = Program.nextHistoryRecord(props.program, props.settings, dayNumber);
          const programDay = Program.getProgramDay(initialEvaluatedProgram, dayNumber);
          const dayExercises = programDay ? Program.getProgramDayExercises(programDay) : [];
          const exerciseTags = new Set(dayExercises.map((e) => e.tags).flat());
          const states = ObjectUtils.filter(initialEvaluatedProgram.states, (key, state) => {
            return exerciseTags.has(key);
          });
          return { day: dayNumber, states, progress };
        }),
      };
    }),
  };
  const [state, dispatch] = useLensReducer(initialState, {}, []);
  const evaluatedProgram = useMemo(() => {
    return Program.evaluate(state.program, state.settings);
  }, [state.program, state.settings]);

  return (
    <ScrollableTabs
      offsetY={props.hasNavbar ? "3rem" : undefined}
      shouldNotExpand={true}
      tabs={state.progresses.map((week, weekIndex) => {
        const programWeekDescription = evaluatedProgram.weeks[weekIndex]?.description;
        return {
          label: week.name,
          children: (
            <div>
              {programWeekDescription && (
                <div className="mx-4 text-sm">
                  <Markdown value={programWeekDescription} />
                </div>
              )}
              <div className="flex flex-wrap justify-center mt-4" style={{ gap: "1.5rem" }}>
                {week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i) => {
                  return (
                    <div style={{ maxWidth: "24rem", minWidth: "18rem" }} className="flex-1">
                      <ProgramPreviewPlaygroundDay
                        weekName={state.progresses.length > 1 ? week.name : undefined}
                        day={d.day}
                        program={evaluatedProgram}
                        progress={d.progress}
                        settings={state.settings}
                        isPlayground={state.isPlayground}
                        onProgressChange={(newProgress) => {
                          dispatch(
                            lb<IProgramPreviewPlaygroundState>()
                              .p("progresses")
                              .pi(weekIndex)
                              .p("days")
                              .pi(i)
                              .p("progress")
                              .record(newProgress)
                          );
                        }}
                        onProgramChange={(newEvaluatedProgram) => {
                          const newPlanner = new ProgramToPlanner(
                            newEvaluatedProgram,
                            state.settings
                          ).convertToPlanner();
                          const newProgram = { ...state.program, planner: newPlanner };
                          dispatch([
                            lb<IProgramPreviewPlaygroundState>()
                              .p("progresses")
                              .recordModify((progresses) => {
                                return progresses.map((wk) => {
                                  return {
                                    ...wk,
                                    days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                                      let newProgress = Progress.applyProgramDay(
                                        day.progress,
                                        newEvaluatedProgram,
                                        day.day,
                                        state.settings
                                      );
                                      newProgress = Progress.runInitialUpdateScripts(
                                        newProgress,
                                        undefined,
                                        day.day,
                                        newEvaluatedProgram,
                                        state.settings
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
                          ]);
                        }}
                        onSettingsChange={(newSettings) => {
                          dispatch([
                            lb<IProgramPreviewPlaygroundState>()
                              .p("progresses")
                              .recordModify((progresses) => {
                                return progresses.map((wk) => {
                                  return {
                                    ...wk,
                                    days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                                      let newProgress = Progress.applyProgramDay(
                                        day.progress,
                                        evaluatedProgram,
                                        day.day,
                                        newSettings
                                      );
                                      newProgress = Progress.runInitialUpdateScripts(
                                        newProgress,
                                        undefined,
                                        day.day,
                                        evaluatedProgram,
                                        newSettings
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
                          ]);
                        }}
                        onFinish={() => {
                          const { program: newProgram, exerciseData } = Program.runAllFinishDayScripts(
                            state.program,
                            d.progress,
                            state.settings
                          );
                          const newSettings = {
                            ...state.settings,
                            exerciseData: deepmerge(state.settings.exerciseData, exerciseData),
                          };
                          dispatch([
                            lb<IProgramPreviewPlaygroundState>()
                              .p("progresses")
                              .recordModify((progresses) => {
                                return progresses.map((wk) => {
                                  return {
                                    ...wk,
                                    days: wk.days.map((day: IProgramPreviewPlaygroundDaySetupWithProgress) => {
                                      const newProgress = Program.nextHistoryRecord(newProgram, newSettings, day.day);
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
                          ]);
                        }}
                      />
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
});
