import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { IHistoryRecord, IProgram, ISettings } from "../../types";
import { Program } from "../../models/program";
import { ProgramPreviewPlaygroundDay } from "./programPreviewPlaygroundDay";
import { useLensReducer } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Progress } from "../../models/progress";
import { ObjectUtils } from "../../utils/object";
import { ScrollableTabs } from "../scrollableTabs";
import { IProgramPreviewPlaygroundDaySetup, IProgramPreviewPlaygroundWeekSetup } from "./programPreviewPlaygroundSetup";
import deepmerge from "deepmerge";
import { Markdown } from "../markdown";

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
  weekSetup: IProgramPreviewPlaygroundWeekSetup[];
  hasNavbar?: boolean;
}

interface IProgramPreviewPlaygroundState {
  program: IProgram;
  settings: ISettings;
  isPlayground: boolean;
  progresses: IProgramPreviewPlaygroundProgresses;
}

function prepareProgram(program: IProgram, settings: ISettings): IProgram {
  const newProgram = Program.fullProgram(ObjectUtils.clone(program), settings);
  return newProgram;
}

export const ProgramPreviewPlayground = memo(
  (props: IProgramPreviewPlaygroundProps): JSX.Element => {
    const program = prepareProgram(props.program, props.settings);
    const initialState: IProgramPreviewPlaygroundState = {
      program,
      settings: props.settings,
      isPlayground: props.isPlayground,
      progresses: props.weekSetup.map((week) => {
        return {
          ...week,
          days: week.days.map((day) => {
            const progress = Program.nextProgramRecord(program, props.settings, day.dayIndex, day.states);
            return { ...day, progress };
          }),
        };
      }),
    };

    const [state, dispatch] = useLensReducer(initialState, {}, []);

    return (
      <ScrollableTabs
        offsetY={props.hasNavbar ? "3rem" : undefined}
        tabs={state.progresses.map((week, weekIndex) => {
          const programWeekDescription = program.weeks[weekIndex]?.description;
          return {
            label: week.name,
            children: (
              <div>
                {programWeekDescription && <Markdown value={programWeekDescription} />}
                <div className="flex flex-wrap justify-center mt-4" style={{ gap: "3rem" }}>
                  {week.days.map((d: IProgramPreviewPlaygroundDaySetupWithProgress, i) => {
                    return (
                      <div style={{ maxWidth: "24rem", minWidth: "14rem" }} className="flex-1">
                        <ProgramPreviewPlaygroundDay
                          weekName={state.progresses.length > 1 ? week.name : undefined}
                          dayIndex={d.dayIndex}
                          program={state.program}
                          progress={d.progress}
                          settings={state.settings}
                          staticStates={d.states}
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
                                          day.dayIndex,
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
                                          program,
                                          day.dayIndex,
                                          newSettings,
                                          day.states
                                        );
                                        newProgress = Progress.runInitialUpdateScripts(
                                          newProgress,
                                          undefined,
                                          program,
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
                              state.settings,
                              d.states
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
                                        const newProgress = Program.nextProgramRecord(
                                          newProgram,
                                          newSettings,
                                          day.dayIndex,
                                          day.states
                                        );
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
