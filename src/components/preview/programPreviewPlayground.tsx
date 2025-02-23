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

export const ProgramPreviewPlayground = memo(
  (props: IProgramPreviewPlaygroundProps): JSX.Element => {
    const initialEvaluatedProgram = useMemo(() => Program.evaluate(props.program, props.settings), [
      props.program,
      props.settings,
    ]);
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
            const exerciseKeys = new Set(programDay?.exercises.map((e) => e.key));
            const states = ObjectUtils.filter(initialEvaluatedProgram.states, (key, state) => {
              return exerciseKeys.has(key);
            });
            return { day: dayNumber, states, progress };
          }),
        };
      }),
    };

    const [state, dispatch] = useLensReducer(initialState, {}, []);
    const evaluatedProgram = useMemo(() => Program.evaluate(props.program, props.settings), [
      state.program,
      state.settings,
    ]);

    return (
      <ScrollableTabs
        offsetY={props.hasNavbar ? "3rem" : undefined}
        tabs={state.progresses.map((week, weekIndex) => {
          const programWeekDescription = evaluatedProgram.weeks[weekIndex]?.description;
          return {
            label: week.name,
            children: (
              <div>
                {programWeekDescription && <Markdown value={programWeekDescription} />}
                <div className="flex flex-wrap justify-center mt-4" style={{ gap: "3rem" }}>
                  {week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i) => {
                    const evaluatedProgramDay = evaluatedProgram.weeks[weekIndex]?.days[i];
                    return (
                      <div style={{ maxWidth: "24rem", minWidth: "14rem" }} className="flex-1">
                        <ProgramPreviewPlaygroundDay
                          weekName={state.progresses.length > 1 ? week.name : undefined}
                          day={d.day}
                          program={evaluatedProgram}
                          programDay={evaluatedProgramDay}
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
                          onProgramChange={(newProgram) => {
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
                                          newProgram,
                                          day.day,
                                          state.settings,
                                          day.states
                                        );
                                        newProgress = Progress.runInitialUpdateScripts(
                                          newProgress,
                                          undefined,
                                          newProgram,
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
                                          state.program,
                                          day.day,
                                          newSettings,
                                          day.states
                                        );
                                        newProgress = Progress.runInitialUpdateScripts(
                                          newProgress,
                                          undefined,
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
                              evaluatedProgram,
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
                              lb<IProgramPreviewPlaygroundState>()
                                .p("program")
                                .record(Program.fullProgram(newProgram, newSettings)),
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
  }
);
