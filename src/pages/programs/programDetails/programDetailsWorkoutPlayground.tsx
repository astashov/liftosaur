import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { IHistoryRecord, IProgram, ISettings, IUnit } from "../../../types";
import { Program } from "../../../models/program";
import { ProgramDetailsWorkoutDayPlayground } from "./programDetailsWorkoutDayPlayground";
import { useLensReducer } from "../../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Progress } from "../../../models/progress";
import { ObjectUtils } from "../../../utils/object";
import { ScrollableTabs } from "../../../components/scrollableTabs";
import { IPlaygroundDetailsDaySetup, IPlaygroundDetailsWeekSetup } from "./programDetailsWeekSetup";
import { MenuItemValue } from "../../../components/menuItemEditable";

type IPlaygroundDetailsDayWithProgress = IPlaygroundDetailsDaySetup & {
  progress: IHistoryRecord;
};

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
            const progress = Program.nextProgramRecord(program, props.settings, day.dayIndex, day.states);
            return { ...day, progress };
          }),
        };
      }),
    };

    const [state, dispatch] = useLensReducer(initialState, { client: props.client }, []);

    return (
      <div>
        <div className="mb-2">
          <label>
            <span className="mx-2 font-bold">Units:</span>
            <MenuItemValue
              name="Unit"
              setPatternError={() => undefined}
              type="desktop-select"
              value={state.settings.units}
              values={[
                ["lb", "lb"],
                ["kg", "kg"],
              ]}
              onChange={(newValue) => {
                dispatch(
                  lb<IProgramDetailsPlaygroundState>()
                    .p("settings")
                    .p("units")
                    .record(newValue as IUnit)
                );
                const newProgram = Program.switchToUnit(state.program, { ...state.settings, units: newValue as IUnit });
                dispatch([
                  lb<IProgramDetailsPlaygroundState>()
                    .p("progresses")
                    .recordModify((progresses) => {
                      return progresses.map((wk) => {
                        return {
                          ...wk,
                          days: wk.days.map((day: IPlaygroundDetailsDayWithProgress) => {
                            const programDay = newProgram.days[day.dayIndex - 1];
                            const newProgress = Progress.applyProgramDay(
                              day.progress,
                              newProgram,
                              programDay,
                              state.settings,
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
                ]);
                dispatch(lb<IProgramDetailsPlaygroundState>().p("program").record(newProgram));
              }}
            />
          </label>
          <div className="flex-1" />
        </div>
        <ScrollableTabs
          tabs={state.progresses.map((week, weekIndex) => {
            return [
              week.name,
              <div className="flex flex-wrap justify-center mt-4" style={{ gap: "3rem" }}>
                {week.days.map((d: IPlaygroundDetailsDayWithProgress, i) => {
                  return (
                    <div style={{ maxWidth: "24rem" }}>
                      <ProgramDetailsWorkoutDayPlayground
                        weekName={state.progresses.length > 1 ? week.name : undefined}
                        dayIndex={d.dayIndex}
                        program={state.program}
                        progress={d.progress}
                        settings={state.settings}
                        staticStates={d.states}
                        onProgressChange={(newProgress) => {
                          dispatch(
                            lb<IProgramDetailsPlaygroundState>()
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
                            lb<IProgramDetailsPlaygroundState>()
                              .p("progresses")
                              .recordModify((progresses) => {
                                return progresses.map((wk) => {
                                  return {
                                    ...wk,
                                    days: wk.days.map((day: IPlaygroundDetailsDayWithProgress) => {
                                      const programDay = newProgram.days[day.dayIndex - 1];
                                      const newProgress = Progress.applyProgramDay(
                                        day.progress,
                                        newProgram,
                                        programDay,
                                        state.settings,
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
                            lb<IProgramDetailsPlaygroundState>().p("program").record(newProgram),
                          ]);
                        }}
                        onFinish={() => {
                          const newProgram = Program.runAllFinishDayScripts(
                            state.program,
                            d.progress,
                            state.settings,
                            d.states
                          );
                          dispatch([
                            lb<IProgramDetailsPlaygroundState>()
                              .p("progresses")
                              .recordModify((progresses) => {
                                return progresses.map((wk) => {
                                  return {
                                    ...wk,
                                    days: wk.days.map((day: IPlaygroundDetailsDayWithProgress) => {
                                      const newProgress = Program.nextProgramRecord(
                                        newProgram,
                                        state.settings,
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
                            lb<IProgramDetailsPlaygroundState>().p("program").record(newProgram),
                          ]);
                        }}
                      />
                    </div>
                  );
                })}
              </div>,
            ];
          })}
        />
      </div>
    );
  }
);
