import { JSX } from "react";
import { lb } from "lens-shmens";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerState, IPlannerUi } from "./models/types";
import { IPlannerProgram, ISettings } from "../../types";
import { IPlannerEvalResult } from "./plannerExerciseEvaluator";
import {
  IPlannerStructureResult,
  PlannerStructure_addWeekWithDay,
  PlannerStructure_duplicateWeek,
} from "./models/plannerStructure";
import { PlannerWeekSelection_index, PlannerWeekSelection_tabs } from "./models/plannerWeekSelection";
import { PlannerWeek } from "./components/plannerWeek";
import { PlannerWeekTabs } from "./components/plannerWeekTabs";

export interface IPlannerContentPerDayProps {
  program: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  evaluatedWeeks: IPlannerEvalResult[][];
  exerciseFullNames: string[];
  dispatch: ILensDispatch<IPlannerState>;
  onStructure: (transform: (planner: IPlannerProgram) => IPlannerStructureResult, desc: string) => boolean;
}

export function PlannerContentPerDay(props: IPlannerContentPerDayProps): JSX.Element {
  const { program, ui, evaluatedWeeks, dispatch, settings } = props;
  const weekIndex = PlannerWeekSelection_index(program.weeks.length, ui.weekIndex);
  const week = program.weeks[weekIndex];
  const selectWeek = (i: number): void => {
    dispatch(lb<IPlannerState>().p("ui").p("weekIndex").record(i), "Select week");
  };

  return (
    <div>
      <PlannerWeekTabs
        weeks={PlannerWeekSelection_tabs(program.weeks, evaluatedWeeks)}
        selectedIndex={weekIndex}
        onSelect={selectWeek}
        onAdd={() => {
          if (props.onStructure((planner) => PlannerStructure_addWeekWithDay(planner, settings), "Add new week")) {
            selectWeek(program.weeks.length);
          }
        }}
      />
      {week != null && (
        <PlannerWeek
          key={weekIndex}
          week={week}
          weekIndex={weekIndex}
          program={program}
          settings={settings}
          ui={ui}
          exerciseFullNames={props.exerciseFullNames}
          evaluatedDays={evaluatedWeeks[weekIndex] ?? []}
          dispatch={dispatch}
          onStructure={props.onStructure}
          onDuplicate={() => {
            const isDuplicated = props.onStructure(
              (planner) => PlannerStructure_duplicateWeek(planner, weekIndex, settings),
              `Duplicate ${week.name}`
            );
            if (isDuplicated) {
              selectWeek(program.weeks.length);
            }
          }}
        />
      )}
    </div>
  );
}
