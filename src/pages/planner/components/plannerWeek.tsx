import { JSX, useState } from "react";
import { PlannerDescription_afterBlur } from "../models/plannerDescription";
import { lb } from "lens-shmens";
import { LinkInlineInput } from "../../../components/inlineInput";
import { PlannerDay } from "./plannerDay";
import { IPlannerProgramWeek, IPlannerProgram, ISettings } from "../../../types";
import { IPlannerStructureResult, PlannerStructure_addDay } from "../models/plannerStructure";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerUi, IPlannerState } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { MarkdownEditor } from "../../../components/markdownEditor";
import { IconPlus2 } from "../../../components/icons/iconPlus2";
import { IconTimerSmall } from "../../../components/icons/iconTimerSmall";
import { PlannerStatsUtils_formatDuration, PlannerStatsUtils_summary } from "../models/plannerStatsUtils";
import { StringUtils_pluralize } from "../../../utils/string";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IPlannerWeekProps {
  week: IPlannerProgramWeek;
  weekIndex: number;
  program: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  exerciseFullNames: string[];
  evaluatedDays: IPlannerEvalResult[];
  dispatch: ILensDispatch<IPlannerState>;
  onStructure: (transform: (planner: IPlannerProgram) => IPlannerStructureResult, desc: string) => boolean;
}

export function PlannerWeek(props: IPlannerWeekProps): JSX.Element {
  const { week, weekIndex, dispatch } = props;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbWeek = lbProgram.p("weeks").i(weekIndex);
  const summary = PlannerStatsUtils_summary(props.evaluatedDays, props.settings);
  const [isAddingDescription, setIsAddingDescription] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mt-6">
        <h2 className="flex-1 min-w-0 text-2xl font-bold md:text-3xl">
          <LinkInlineInput
            value={week.name}
            onInputString={(v) => dispatch(lbWeek.p("name").record(v), "Update week name")}
          />
        </h2>
      </div>
      {week.description != null ? (
        <div className="mt-2">
          <MarkdownEditor
            borderless={true}
            hasHistory={false}
            placeholder="Week description in Markdown"
            autoFocus={isAddingDescription}
            value={week.description}
            onChange={(v) => dispatch(lbWeek.p("description").record(v), "Update week description")}
            onBlur={(v) => {
              setIsAddingDescription(false);
              if (PlannerDescription_afterBlur(v) == null) {
                dispatch(lbWeek.p("description").record(undefined), "Remove empty week description");
              }
            }}
          />
        </div>
      ) : (
        <button
          className="mt-2 text-base text-text-link nm-planner-add-week-description"
          data-testid="planner-add-week-description"
          onClick={() => {
            setIsAddingDescription(true);
            dispatch(lbWeek.p("description").record(""), "Add week description");
          }}
        >
          Add week description
        </button>
      )}
      {summary.exercisesPerDay > 0 && (
        <div className="flex items-center gap-1 mt-2 text-sm md:hidden text-text-secondary">
          <span>
            {summary.exercisesPerDay} {StringUtils_pluralize("exercise", summary.exercisesPerDay)}
          </span>
          <IconTimerSmall className="ml-2" />
          <span>{PlannerStatsUtils_formatDuration(summary.approxTimeMs)}</span>
        </div>
      )}
      <div className="mt-4 -mx-4 md:mx-0">
        {week.days.map((day, dayIndex) => (
          <PlannerDay
            key={dayIndex}
            exerciseFullNames={props.exerciseFullNames}
            evaluatedDay={props.evaluatedDays[dayIndex]}
            settings={props.settings}
            dispatch={dispatch}
            day={day}
            weekIndex={weekIndex}
            dayIndex={dayIndex}
            ui={props.ui}
            lbProgram={lbProgram}
          />
        ))}
      </div>
      <button
        className="flex items-center justify-center w-full gap-2 py-2.5 text-base font-semibold border rounded-md text-text-link border-border-prominent bg-background-default nm-planner-add-day"
        data-testid="planner-add-day"
        onClick={() =>
          props.onStructure((planner) => PlannerStructure_addDay(planner, weekIndex, props.settings), "Add day")
        }
      >
        <IconPlus2 size={12} color={Tailwind_semantic().text.link} />
        Add Day
      </button>
    </div>
  );
}
