import { JSX, useState } from "react";
import { PlannerDescription_afterBlur } from "../models/plannerDescription";
import { lb, LensBuilder } from "lens-shmens";
import { LinkInlineInput } from "../../../components/inlineInput";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { PlannerEditorView } from "./plannerEditorView";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { PlannerStatsUtils_formatDuration, PlannerStatsUtils_summary } from "../models/plannerStatsUtils";
import { PlannerEditorCustomCta } from "./plannerEditorCustomCta";
import { IPlannerProgram, IPlannerProgramDay, ISettings } from "../../../types";
import { PlannerCodeBlock } from "./plannerCodeBlock";
import { AppliedTheme_get } from "../../../utils/appliedTheme";
import { MarkdownEditor } from "../../../components/markdownEditor";
import { GroupHeader } from "../../../components/groupHeader";
import { IconArrowUp } from "../../../components/icons/iconArrowUp";
import { IconArrowDown2 } from "../../../components/icons/iconArrowDown2";
import { IconTimerSmall } from "../../../components/icons/iconTimerSmall";
import { IconTrash } from "../../../components/icons/iconTrash";
import {
  PlannerDayFocus_collapseKey,
  PlannerDayFocus_isNew,
  PlannerDayFocus_toggleCollapsed,
} from "../models/plannerDayFocus";
import { StringUtils_pluralize } from "../../../utils/string";

interface IPlannerDayProps {
  weekIndex: number;
  dayIndex: number;
  day: IPlannerProgramDay;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}, undefined>;
  ui: IPlannerUi;
  exerciseFullNames: string[];
  evaluatedDay: IPlannerEvalResult;
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
  onDelete?: () => void;
}

export function PlannerDay(props: IPlannerDayProps): JSX.Element {
  const { day, dispatch, lbProgram, weekIndex, dayIndex, evaluatedDay, ui } = props;
  const lbDay = lbProgram.p("weeks").i(weekIndex).p("days").i(dayIndex);
  const collapseKey = PlannerDayFocus_collapseKey(weekIndex, dayIndex);
  const [isAddingDescription, setIsAddingDescription] = useState(false);
  const isCollapsed = ui.dayUi.collapsed.has(collapseKey);
  const summary = evaluatedDay.success ? PlannerStatsUtils_summary([evaluatedDay], props.settings) : undefined;
  const repeats: IPlannerProgramExercise[] = evaluatedDay.success ? evaluatedDay.data.filter((e) => e.isRepeat) : [];
  const duration = summary ? PlannerStatsUtils_formatDuration(summary.approxTimeMs) : undefined;

  return (
    <div
      className="px-4 py-4 mb-3 border md:pl-3 md:pr-4 rounded-2xl bg-background-default border-border-prominent"
      data-testid="planner-day"
    >
      <div className="flex items-center gap-2">
        <h3 className="flex-1 min-w-0 text-lg font-bold md:pl-6">
          <LinkInlineInput
            value={day.name}
            onInputString={(v) => dispatch(lbDay.p("name").record(v), "Update day name")}
          />
        </h3>
        {props.onDelete && (
          <button
            className="p-2 nm-planner-delete-day"
            data-testid="planner-delete-day"
            aria-label="Delete day"
            title="Delete day"
            onClick={props.onDelete}
          >
            <IconTrash width={18} height={18} />
          </button>
        )}
        <button
          className="p-2 nm-planner-collapse-day"
          data-testid="planner-collapse-day"
          aria-label={isCollapsed ? "Expand day" : "Collapse day"}
          title={isCollapsed ? "Expand day" : "Collapse day"}
          onClick={() =>
            dispatch(
              lb<IPlannerState>()
                .p("ui")
                .p("dayUi")
                .p("collapsed")
                .recordModify((collapsed) => PlannerDayFocus_toggleCollapsed(collapsed, collapseKey)),
              isCollapsed ? "Expand day" : "Collapse day"
            )
          }
        >
          {isCollapsed ? <IconArrowDown2 /> : <IconArrowUp />}
        </button>
      </div>
      <div className="md:pl-6">
        {!isCollapsed &&
          (day.description != null ? (
            <div className="mt-2">
              <MarkdownEditor
                borderless={true}
                hasHistory={false}
                placeholder="Workout description in Markdown"
                autoFocus={isAddingDescription}
                value={day.description}
                onChange={(v) => dispatch(lbDay.p("description").record(v), "Update day description")}
                onBlur={(v) => {
                  setIsAddingDescription(false);
                  if (PlannerDescription_afterBlur(v) == null) {
                    dispatch(lbDay.p("description").record(undefined), "Remove empty day description");
                  }
                }}
              />
            </div>
          ) : (
            <button
              className="mt-2 text-base text-text-link nm-planner-add-day-description"
              data-testid="planner-add-day-description"
              onClick={() => {
                setIsAddingDescription(true);
                dispatch(lbDay.p("description").record(""), "Add day description");
              }}
            >
              Add workout description
            </button>
          ))}
        {summary && (
          <div className="items-center hidden gap-1 mt-2 text-sm md:flex text-text-secondary">
            <span>
              {summary.exercisesPerDay} {StringUtils_pluralize("exercise", summary.exercisesPerDay)}
            </span>
            <IconTimerSmall className="ml-2" />
            <span>{duration}</span>
          </div>
        )}
        <div className={isCollapsed ? "hidden" : "mt-3"}>
          <PlannerEditorView
            lineNumbers={true}
            hasHistory={false}
            name="Exercises"
            theme={AppliedTheme_get(props.settings)}
            exerciseFullNames={props.exerciseFullNames}
            customExercises={props.settings.exercises}
            error={evaluatedDay.success ? undefined : evaluatedDay.error}
            value={day.exerciseText}
            onCustomErrorCta={(err) => <PlannerEditorCustomCta dispatch={dispatch} err={err} isInvertedColors={true} />}
            onChange={(e) => dispatch(lbDay.p("exerciseText").record(e), "Update exercises")}
            onLineChange={(line) => {
              const next = { weekIndex, dayIndex, exerciseLine: line };
              if (PlannerDayFocus_isNew(ui.focusedExercise, next)) {
                dispatch(lb<IPlannerState>().p("ui").p("focusedExercise").record(next), "Focus exercise");
              }
            }}
          />
          {repeats.length > 0 && (
            <>
              <GroupHeader name="Repeated exercises from previous weeks:" />
              <ul className="pl-1 ml-8 overflow-x-auto list-disc" style={{ marginTop: "-0.5rem" }}>
                {repeats.map((e, i) => (
                  <li key={i}>
                    <PlannerCodeBlock script={e.text} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {duration && (
          <div className="flex items-center gap-1 mt-3 text-sm md:hidden text-text-secondary">
            <IconTimerSmall />
            <span>{duration}</span>
          </div>
        )}
      </div>
    </div>
  );
}
