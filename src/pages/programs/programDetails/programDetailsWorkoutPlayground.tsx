import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { IHistoryRecord, IProgram, ISettings, IProgramState } from "../../../types";
import { Program } from "../../../models/program";
import { ProgramDetailsWorkoutDayPlayground } from "./programDetailsWorkoutDayPlayground";
import { useLensReducer } from "../../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Progress } from "../../../models/progress";
import { ObjectUtils } from "../../../utils/object";

interface IPlaygroundDetailsDaySetup {
  dayIndex: number;
  states: Partial<Record<string, IProgramState>>; // key - programExerciseId
}

type IPlaygroundDetailsDayWithProgress = IPlaygroundDetailsDaySetup & {
  progress: IHistoryRecord;
};

interface IPlaygroundDetailsWeekSetup {
  name: string;
  days: IPlaygroundDetailsDaySetup[];
}

type IPlaygroundDetailsProgresses = (IPlaygroundDetailsWeekSetup & {
  days: IPlaygroundDetailsDayWithProgress[];
})[];

interface IPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  weekSetup: IPlaygroundDetailsWeekSetup[];
  client: Window["fetch"];
}

interface IProgramDetailsPlaygroundState {
  program: IProgram;
  settings: ISettings;
  progresses: IPlaygroundDetailsProgresses;
}

function prepareProgram(program: IProgram): IProgram {
  const newProgram = ObjectUtils.clone(program);
  for (const exercise of newProgram.exercises) {
    exercise.warmupSets = [];
  }
  return newProgram;
}

export const ProgramDetailsWorkoutPlayground = memo(
  (props: IPlaygroundProps): JSX.Element => {
    const program = prepareProgram(props.program);
    const initialState: IProgramDetailsPlaygroundState = {
      program: prepareProgram(program),
      settings: props.settings,
      progresses: props.weekSetup.map((week) => {
        return {
          ...week,
          days: week.days.map((day) => {
            return {
              ...day,
              progress: Program.nextProgramRecord(program, props.settings, day.dayIndex),
            };
          }),
        };
      }),
    };

    const [state, dispatch] = useLensReducer(initialState, { client: props.client }, []);

    const week = state.progresses[0];

    return (
      <div className="flex flex-wrap justify-center">
        {week.days.map((d: IPlaygroundDetailsDayWithProgress, i) => {
          return (
            <div style={{ maxWidth: "24rem" }}>
              <ProgramDetailsWorkoutDayPlayground
                program={state.program}
                progress={d.progress}
                settings={state.settings}
                onProgressChange={(newProgress) => {
                  dispatch(
                    lb<IProgramDetailsPlaygroundState>()
                      .p("progresses")
                      .pi(0)
                      .p("days")
                      .pi(i)
                      .p("progress")
                      .record(newProgress)
                  );
                }}
                onProgramChange={(newProgram) => {
                  dispatch([
                    lb<IProgramDetailsPlaygroundState>()
                      .p("progresses")
                      .recordModify((progresses) => {
                        return progresses.map((week) => {
                          return {
                            ...week,
                            days: week.days.map((day: IPlaygroundDetailsDayWithProgress) => {
                              const programDay = newProgram.days[day.dayIndex - 1];
                              const newProgress = Progress.applyProgramDay(
                                day.progress,
                                newProgram,
                                programDay,
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
                    lb<IProgramDetailsPlaygroundState>().p("program").record(newProgram),
                  ]);
                }}
                onFinish={() => {
                  const newProgram = Program.runAllFinishDayScripts(state.program, d.progress, props.settings);
                  dispatch([
                    lb<IProgramDetailsPlaygroundState>()
                      .p("progresses")
                      .recordModify((progresses) => {
                        return progresses.map((week) => {
                          return {
                            ...week,
                            days: week.days.map((day: IPlaygroundDetailsDayWithProgress) => {
                              const newProgress = Program.nextProgramRecord(newProgram, props.settings, day.dayIndex);
                              return {
                                ...day,
                                progress: newProgress,
                              };
                            }),
                          };
                        });
                      }),
                    lb<IProgramDetailsPlaygroundState>().p("program").record(newProgram),
                  ]);
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
);
