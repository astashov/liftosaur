import { JSX, memo } from "react";
import { IProgram, ISettings, IStats } from "../../types";
import {
  Program_evaluate,
  Program_nextHistoryRecord,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "../../models/program";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ScrollableTabs } from "../scrollableTabs";
import { Markdown } from "../markdown";
import { ObjectUtils_filter } from "../../utils/object";
import { IDispatch } from "../../ducks/types";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ProgramPreviewTabDay } from "./programPreviewTabDay";

interface IProgramPreviewTabProps {
  program: IProgram;
  programId: string;
  settings: ISettings;
  ui: IPlannerUi;
  stats: IStats;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const ProgramPreviewTab = memo((props: IProgramPreviewTabProps): JSX.Element => {
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  let dayNumber = 0;
  const progresses = evaluatedProgram.weeks.map((week) => {
    return {
      name: week.name,
      days: week.days.map(() => {
        dayNumber += 1;
        const progress = Program_nextHistoryRecord(props.program, props.settings, props.stats, dayNumber);
        const programDay = Program_getProgramDay(evaluatedProgram, dayNumber);
        const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
        const exerciseTags = new Set(dayExercises.map((e) => e.tags).flat());
        const states = ObjectUtils_filter(evaluatedProgram.states, (key, state) => {
          return exerciseTags.has(key);
        });
        return { day: dayNumber, states, progress };
      }),
    };
  });

  return (
    <ScrollableTabs
      shouldNotExpand={true}
      color="purple"
      type="squares"
      topPadding="0.25rem"
      className="gap-2 px-4"
      nonSticky={false}
      tabs={progresses.map((week, weekIndex) => {
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
                {week.days.map((d, i) => {
                  return (
                    <div key={i} style={{ maxWidth: "24rem", minWidth: "18rem" }} className="flex-1">
                      <ProgramPreviewTabDay
                        stats={props.stats}
                        dispatch={props.dispatch}
                        program={evaluatedProgram}
                        programId={props.programId}
                        weekName={progresses.length > 1 ? week.name : undefined}
                        day={d.day}
                        settings={props.settings}
                        progress={d.progress}
                        ui={props.ui}
                        plannerDispatch={props.plannerDispatch}
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
