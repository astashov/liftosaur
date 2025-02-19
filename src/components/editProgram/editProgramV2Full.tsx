/* eslint-disable @typescript-eslint/ban-types */
import { JSX, h } from "preact";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import {
  IPlannerFullText,
  IPlannerState,
  IPlannerUi,
  IPlannerUiFocusedExercise,
} from "../../pages/planner/models/types";
import { Modal } from "../modal";
import { lb, lbu, LensBuilder } from "lens-shmens";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { useMemo } from "preact/hooks";
import { CollectionUtils } from "../../utils/collection";
import { Button } from "../button";
import { IconMusclesW } from "../icons/iconMusclesW";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconMusclesD } from "../icons/iconMusclesD";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { PlannerExerciseStats } from "../../pages/planner/components/plannerExerciseStats";
import { PlannerDayStats } from "../../pages/planner/components/plannerDayStats";
import { PlannerWeekStats } from "../../pages/planner/components/plannerWeekStats";
import { PlannerEditorCustomCta } from "../../pages/planner/components/plannerEditorCustomCta";

export interface IEditProgramV2FullProps {
  plannerProgram: IPlannerProgram;
  settings: ISettings;
  fulltext: IPlannerFullText;
  ui: IPlannerUi;
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}>;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Full(props: IEditProgramV2FullProps): JSX.Element {
  function save(): void {
    const lensGetters = { fulltext: lb<IPlannerState>().p("fulltext").get() };
    props.plannerDispatch([
      lbu<IPlannerState, typeof lensGetters>(lensGetters)
        .p("current")
        .p("program")
        .pi("planner")
        .p("weeks")
        .recordModify((oldWeeks, getters) => {
          const text = getters.fulltext?.text;
          if (text == null) {
            return oldWeeks;
          }
          return PlannerProgram.evaluateText(text);
        }),
      lb<IPlannerState>().p("fulltext").record(undefined),
      lb<IPlannerState>().p("ui").p("isUiMode").record(true),
    ]);
  }

  function cancel(): void {
    props.plannerDispatch([
      lb<IPlannerState>().p("ui").p("isUiMode").record(true),
      lb<IPlannerState>().p("fulltext").record(undefined),
    ]);
  }

  const currentLine = props.fulltext.currentLine;
  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram.evaluateFull(props.fulltext.text, props.settings);
  }, [props.fulltext.text, props.settings.exercises]);

  const weekIndex =
    evaluatedWeeks.success && currentLine != null
      ? CollectionUtils.findIndexReverse(evaluatedWeeks.data, (w) => w.line <= currentLine)
      : -1;
  const dayIndex =
    weekIndex !== -1 && evaluatedWeeks.success && currentLine != null
      ? CollectionUtils.findIndexReverse(evaluatedWeeks.data[weekIndex].days, (d) => d.line <= currentLine)
      : -1;

  const exerciseIndex =
    dayIndex !== -1 && evaluatedWeeks.success && currentLine != null
      ? CollectionUtils.findIndexReverse(
          evaluatedWeeks.data[weekIndex].days[dayIndex].exercises,
          (d) => d.line <= currentLine
        )
      : -1;

  const focusedExercise: IPlannerUiFocusedExercise | undefined =
    weekIndex !== -1 && dayIndex !== -1 && evaluatedWeeks.success && exerciseIndex !== -1
      ? {
          weekIndex,
          dayIndex,
          exerciseLine: evaluatedWeeks.data[weekIndex].days[dayIndex].exercises[exerciseIndex].line,
        }
      : undefined;

  const evalResults = PlannerProgram.fullToWeekEvalResult(evaluatedWeeks);

  return (
    <div className="relative">
      <div
        className="sticky top-0 z-10 px-4 py-1 bg-white border-b sm:hidden border-grayv2-100"
        style={{ top: "3.7rem" }}
      >
        <div className="flex items-center justify-end">
          <div className="flex-1 mr-2">
            <Button name="cancel-full-planner" kind="grayv2" buttonSize="sm" className="px-4" onClick={() => cancel()}>
              Cancel
            </Button>
            <Button
              disabled={!evaluatedWeeks.success}
              title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
              data-cy="editor-v2-save-full"
              name="save-full-planner"
              kind="orange"
              buttonSize="sm"
              className="px-4 ml-2"
              onClick={() => {
                if (evaluatedWeeks.success) {
                  save();
                }
              }}
            >
              Apply
            </Button>
          </div>
          <div>
            <button
              disabled={weekIndex === -1}
              onClick={() => {
                if (weekIndex !== -1) {
                  props.plannerDispatch(props.lbUi.p("showWeekStats").record(true));
                }
              }}
              className={`${weekIndex === -1 ? "cursor-not-allowed nm-full-show-week-muscles" : ""} p-2`}
            >
              <IconMusclesW color={weekIndex !== -1 ? "#3C5063" : "#D2D8DE"} size={22} />
            </button>
            <button
              disabled={dayIndex === -1}
              onClick={() => {
                if (dayIndex !== -1) {
                  props.plannerDispatch(props.lbUi.p("showDayStats").record(true));
                }
              }}
              className={`${dayIndex === -1 ? "cursor-not-allowed nm-full-show-day-muscles" : ""} p-2`}
            >
              <IconMusclesD color={dayIndex !== -1 ? "#3C5063" : "#D2D8DE"} size={22} />
            </button>
            <button
              disabled={!focusedExercise}
              onClick={() => {
                if (focusedExercise) {
                  props.plannerDispatch(props.lbUi.p("showExerciseStats").record(true));
                }
              }}
              className={`${!focusedExercise ? "cursor-not-allowed nm-full-show-exercise-stats" : ""} p-2`}
            >
              <IconGraphsE color={focusedExercise ? "#3C5063" : "#D2D8DE"} width={16} height={22} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col px-4 pt-4 md:flex-row">
        <div className="flex-1 min-w-0">
          <h2 className="mb-1 text-lg font-bold">Edit program as plain text</h2>
          <PlannerEditorView
            name="Program"
            customExercises={props.settings.exercises}
            exerciseFullNames={exerciseFullNames}
            error={evaluatedWeeks.success ? undefined : evaluatedWeeks.error}
            value={props.fulltext.text}
            onCustomErrorCta={(err) => (
              <PlannerEditorCustomCta isInvertedColors={true} dispatch={props.plannerDispatch} err={err} />
            )}
            onChange={(e) => props.plannerDispatch(lb<IPlannerState>().pi("fulltext").p("text").record(e))}
            lineNumbers={true}
            onBlur={(e, text) => {}}
            onLineChange={(line) => {
              props.plannerDispatch(lb<IPlannerState>().pi("fulltext").p("currentLine").record(line));
            }}
          />
        </div>
        <div className="mt-2 mb-8 text-center">
          <Button
            disabled={!evaluatedWeeks.success}
            title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
            name="save-full-planner-bottom"
            kind="orange"
            onClick={() => {
              if (evaluatedWeeks.success) {
                save();
              }
            }}
          >
            Apply
          </Button>
        </div>
      </div>
      {props.ui.showExerciseStats && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => {
            props.plannerDispatch(props.lbUi.p("showExerciseStats").record(false));
          }}
        >
          {focusedExercise?.exerciseLine != null && (
            <PlannerExerciseStats
              dispatch={props.plannerDispatch}
              settings={props.settings}
              evaluatedWeeks={evalResults}
              weekIndex={weekIndex}
              dayIndex={dayIndex}
              exerciseLine={focusedExercise?.exerciseLine}
            />
          )}
        </Modal>
      )}
      {props.ui.showDayStats && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => {
            props.plannerDispatch(props.lbUi.p("showDayStats").record(false));
          }}
        >
          {weekIndex !== -1 && dayIndex !== -1 && (
            <PlannerDayStats
              dispatch={props.plannerDispatch}
              focusedExercise={focusedExercise}
              settings={props.settings}
              evaluatedDay={evalResults[weekIndex][dayIndex]}
            />
          )}
        </Modal>
      )}
      {props.ui.showWeekStats && (
        <Modal
          shouldShowClose={true}
          isFullWidth={true}
          onClose={() => {
            props.plannerDispatch(props.lbUi.p("showWeekStats").record(false));
          }}
        >
          {weekIndex !== -1 && (
            <PlannerWeekStats
              dispatch={props.plannerDispatch}
              evaluatedDays={evalResults[weekIndex]}
              settings={props.settings}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
