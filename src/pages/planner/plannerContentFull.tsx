/* eslint-disable @typescript-eslint/ban-types */
import { lb, lbu, LensBuilder } from "lens-shmens";
import { h, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IconPreview } from "../../components/icons/iconPreview";
import { Modal } from "../../components/modal";
import { Exercise } from "../../models/exercise";
import { IPlannerProgram, ISettings } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { ILensDispatch } from "../../utils/useLensReducer";
import { PlannerDayStats } from "./components/plannerDayStats";
import { PlannerEditorCustomCta } from "./components/plannerEditorCustomCta";
import { PlannerEditorView } from "./components/plannerEditorView";
import { PlannerExerciseStats } from "./components/plannerExerciseStats";
import { PlannerExerciseStatsFull } from "./components/plannerExerciseStatsFull";
import { PlannerWeekStats } from "./components/plannerWeekStats";
import { PlannerProgram } from "./models/plannerProgram";
import { IPlannerFullText, IPlannerState, IPlannerUiFocusedExercise } from "./models/types";
import { IconGraphsE } from "../../components/icons/iconGraphsE";
import { IconMusclesD } from "../../components/icons/iconMusclesD";
import { IconMusclesW } from "../../components/icons/iconMusclesW";

export interface IPlannerContentFullProps {
  fullText: IPlannerFullText;
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
  lbProgram: LensBuilder<IPlannerState, IPlannerProgram, {}>;
  service: Service;
}

export function PlannerContentFull(props: IPlannerContentFullProps): JSX.Element {
  function save(): void {
    const lensGetters = { fulltext: lb<IPlannerState>().p("fulltext").get() };
    props.dispatch([
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
    ]);
  }

  function cancel(): void {
    props.dispatch([lb<IPlannerState>().p("fulltext").record(undefined)]);
  }

  const currentLine = props.fullText.currentLine;
  const [showWeekStats, setShowWeekStats] = useState(false);
  const [showDayStats, setShowDayStats] = useState(false);
  const [showExerciseStats, setShowExerciseStats] = useState(false);

  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram.evaluateFull(props.fullText.text, props.settings);
  }, [props.fullText.text, props.settings.exercises]);

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

  if (evaluatedWeeks.success) {
    for (const week of evaluatedWeeks.data) {
      for (const day of week.days) {
        for (const plannerExercise of day.exercises) {
          const exercise = Exercise.findByName(plannerExercise.name, {});
          if (exercise) {
            exercise.equipment = plannerExercise.equipment || exercise.defaultEquipment;
          }
        }
      }
    }
  }

  const [editorWidth, setEditorWidth] = useState<number | undefined>(undefined);
  const [statsWidth, setStatsWidth] = useState<number | undefined>(undefined);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setEditorWidth(editorRef.current?.clientWidth);
    setStatsWidth(statsRef.current?.clientWidth);
    function onBeforeUnload(e: Event): void {
      e.preventDefault();
      e.returnValue = true;
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return (
    <div className="relative">
      <div className="sticky top-0 z-30 bg-white border-b sm:hidden border-grayv2-100">
        <div className="flex items-center justify-end">
          <div className="flex-1 mr-2">
            <Button
              disabled={!evaluatedWeeks.success}
              title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
              name="cancel-full-planner"
              kind="grayv2"
              buttonSize="sm"
              className="px-4"
              onClick={() => cancel()}
            >
              Cancel
            </Button>
            <Button
              disabled={!evaluatedWeeks.success}
              title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
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
              disabled={!evaluatedWeeks.success}
              className="p-2 align-middle"
              onClick={() => {
                if (evaluatedWeeks.success) {
                  props.dispatch(lb<IPlannerState>().p("ui").p("showPreview").record(true));
                }
              }}
            >
              <IconPreview size={27} />
            </button>
            <button
              disabled={!focusedExercise}
              onClick={() => {
                if (focusedExercise) {
                  setShowExerciseStats(true);
                }
              }}
              className={`${!focusedExercise ? "cursor-not-allowed" : ""} p-2 align-middle`}
            >
              <IconGraphsE color={focusedExercise ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={dayIndex === -1}
              onClick={() => {
                if (dayIndex !== -1) {
                  setShowDayStats(true);
                }
              }}
              className={`${dayIndex === -1 ? "cursor-not-allowed" : ""} p-2 align-middle`}
            >
              <IconMusclesD color={dayIndex !== -1 ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={weekIndex === -1}
              onClick={() => {
                if (weekIndex !== -1) {
                  setShowWeekStats(true);
                }
              }}
              className={`${weekIndex === -1 ? "cursor-not-allowed" : ""} p-2 align-middle`}
            >
              <IconMusclesW color={weekIndex !== -1 ? "#3C5063" : "#D2D8DE"} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 min-w-0" ref={editorRef}>
          <PlannerEditorView
            name="Program"
            customExercises={props.settings.exercises}
            exerciseFullNames={exerciseFullNames}
            error={evaluatedWeeks.success ? undefined : evaluatedWeeks.error}
            value={props.fullText.text}
            onCustomErrorCta={(err) => (
              <PlannerEditorCustomCta isInvertedColors={true} dispatch={props.dispatch} err={err} />
            )}
            onChange={(e) => props.dispatch(lb<IPlannerState>().pi("fulltext").p("text").record(e))}
            lineNumbers={true}
            onBlur={(e, text) => {}}
            onLineChange={(line) => {
              props.dispatch(lb<IPlannerState>().pi("fulltext").p("currentLine").record(line));
            }}
          />
          <div className="fixed bottom-0 hidden sm:block" style={{ width: editorWidth }}>
            {focusedExercise?.exerciseLine != null && (
              <PlannerExerciseStatsFull
                dispatch={props.dispatch}
                settings={props.settings}
                evaluatedWeeks={evalResults}
                weekIndex={weekIndex}
                dayIndex={dayIndex}
                exerciseLine={focusedExercise?.exerciseLine}
              />
            )}
          </div>
        </div>
        <div ref={statsRef} className="hidden sm:flex" style={{ width: "28rem" }}>
          <div className="flex-1 ml-0 sm:ml-4">
            {weekIndex !== -1 && dayIndex !== -1 && (
              <div className="sticky" style={{ top: "1rem" }}>
                <PlannerDayStats
                  dispatch={props.dispatch}
                  focusedExercise={focusedExercise}
                  settings={props.settings}
                  evaluatedDay={evalResults[weekIndex][dayIndex]}
                />
              </div>
            )}
          </div>
          <div className="flex-1 mt-2 ml-0 sm:ml-4 sm:mt-0">
            {weekIndex !== -1 && (
              <div className="sticky" style={{ top: "1rem" }}>
                <PlannerWeekStats
                  dispatch={props.dispatch}
                  evaluatedDays={evalResults[weekIndex]}
                  settings={props.settings}
                />
              </div>
            )}
          </div>
          <div className="fixed bottom-0 py-2 text-center bg-white shadow-xs" style={{ width: statsWidth }}>
            <Button
              disabled={!evaluatedWeeks.success}
              title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
              name="cancel-full-planner"
              kind="grayv2"
              buttonSize="sm"
              className="px-4"
              onClick={() => {
                if (evaluatedWeeks.success) {
                  cancel();
                }
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!evaluatedWeeks.success}
              title={`${evaluatedWeeks.success ? "" : "Fix errors first"}`}
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
        </div>
      </div>
      {showExerciseStats && (
        <Modal shouldShowClose={true} isFullWidth={true} onClose={() => setShowExerciseStats(false)}>
          {focusedExercise?.exerciseLine != null ? (
            <PlannerExerciseStats
              settings={props.settings}
              dispatch={props.dispatch}
              evaluatedWeeks={evalResults}
              weekIndex={weekIndex}
              dayIndex={dayIndex}
              exerciseLine={focusedExercise?.exerciseLine}
            />
          ) : (
            <div className="font-bold">Exercise Stats</div>
          )}
        </Modal>
      )}
      {showDayStats && (
        <Modal shouldShowClose={true} isFullWidth={true} onClose={() => setShowDayStats(false)}>
          {weekIndex !== -1 && dayIndex !== -1 ? (
            <PlannerDayStats
              dispatch={props.dispatch}
              focusedExercise={focusedExercise}
              settings={props.settings}
              evaluatedDay={evalResults[weekIndex][dayIndex]}
            />
          ) : (
            <div className="font-bold">Day Stats</div>
          )}
        </Modal>
      )}
      {showWeekStats && (
        <Modal shouldShowClose={true} isFullWidth={true} onClose={() => setShowWeekStats(false)}>
          {weekIndex !== -1 ? (
            <PlannerWeekStats
              dispatch={props.dispatch}
              evaluatedDays={evalResults[weekIndex]}
              settings={props.settings}
            />
          ) : (
            <div className="font-bold">Week Stats</div>
          )}
        </Modal>
      )}
    </div>
  );
}
