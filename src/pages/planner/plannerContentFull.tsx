/* eslint-disable @typescript-eslint/ban-types */
import { lb, lbu, LensBuilder } from "lens-shmens";
import { h, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IconD } from "../../components/icons/iconD";
import { IconE } from "../../components/icons/iconE";
import { IconHelp } from "../../components/icons/iconHelp";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { IconW } from "../../components/icons/iconW";
import { LinkButton } from "../../components/linkButton";
import { Modal } from "../../components/modal";
import { Exercise } from "../../models/exercise";
import { ExerciseImageUtils } from "../../models/exerciseImage";
import { IPlannerProgram } from "../../types";
import { CollectionUtils } from "../../utils/collection";
import { ILensDispatch } from "../../utils/useLensReducer";
import { PlannerDayStats } from "./components/plannerDayStats";
import { PlannerEditorCustomCta } from "./components/plannerEditorCustomCta";
import { PlannerEditorView } from "./components/plannerEditorView";
import { PlannerExerciseStats } from "./components/plannerExerciseStats";
import { PlannerExerciseStatsFull } from "./components/plannerExerciseStatsFull";
import { PlannerWeekStats } from "./components/plannerWeekStats";
import { PlannerProgram } from "./models/plannerProgram";
import { IPlannerFullText, IPlannerSettings, IPlannerState, IPlannerUiFocusedExercise } from "./models/types";

export interface IPlannerContentFullProps {
  fullText: IPlannerFullText;
  settings: IPlannerSettings;
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
        .p("weeks")
        .recordModify((oldWeeks, getters) => {
          const text = getters.fulltext?.text;
          if (text == null) {
            return oldWeeks;
          }
          const data = PlannerProgram.evaluateText(text);
          return data.map((week) => {
            return {
              name: week.name,
              days: week.days.map((day) => {
                return {
                  name: day.name,
                  exerciseText: day.exercises.join("").trim(),
                };
              }),
            };
          });
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
  const [reformatterSpinner, setReformatterSpinner] = useState(false);

  const evaluatedWeeks = useMemo(() => {
    return PlannerProgram.evaluateFull(
      props.fullText.text,
      props.settings.customExercises,
      props.settings.customEquipment
    );
  }, [props.fullText.text, props.settings.customExercises]);

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

  const exerciseImageUrls = [];
  if (evaluatedWeeks.success) {
    for (const week of evaluatedWeeks.data) {
      for (const day of week.days) {
        for (const plannerExercise of day.exercises) {
          const exercise = Exercise.findByName(plannerExercise.name, {});
          if (exercise) {
            exercise.equipment = plannerExercise.equipment || exercise.defaultEquipment;
          }
          const imageUrl =
            exercise && ExerciseImageUtils.exists(exercise, "small")
              ? ExerciseImageUtils.url(exercise, "small")
              : undefined;
          if (imageUrl) {
            exerciseImageUrls[plannerExercise.line - 1] = imageUrl;
          }
        }
      }
    }
  }
  for (let i = 0; i < exerciseImageUrls.length; i++) {
    if (!exerciseImageUrls[i]) {
      exerciseImageUrls[i] = undefined;
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
              Save
            </Button>
          </div>
          <div>
            <button
              disabled={!focusedExercise}
              onClick={() => {
                if (focusedExercise) {
                  setShowExerciseStats(true);
                }
              }}
              className={`${!focusedExercise ? "cursor-not-allowed" : ""} p-2`}
            >
              <IconE color={focusedExercise ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={dayIndex === -1}
              onClick={() => {
                if (dayIndex !== -1) {
                  setShowDayStats(true);
                }
              }}
              className={`${dayIndex === -1 ? "cursor-not-allowed" : ""} p-2`}
            >
              <IconD color={dayIndex !== -1 ? "#3C5063" : "#D2D8DE"} />
            </button>
            <button
              disabled={weekIndex === -1}
              onClick={() => {
                if (weekIndex !== -1) {
                  setShowWeekStats(true);
                }
              }}
              className={`${weekIndex === -1 ? "cursor-not-allowed" : ""} p-2`}
            >
              <IconW color={weekIndex !== -1 ? "#3C5063" : "#D2D8DE"} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        <div className="hidden w-10 sm:block">
          <ul className="pt-2">
            {exerciseImageUrls.map((imageUrl) => {
              return (
                <li style={{ width: "34px", height: "31px" }} className="text-center">
                  {imageUrl ? (
                    <img
                      style={{ maxWidth: "34px", maxHeight: "31px" }}
                      data-cy="exercise-image-small"
                      className="inline"
                      src={imageUrl}
                    />
                  ) : (
                    <div />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex-1 min-w-0" ref={editorRef}>
          <PlannerEditorView
            name="Program"
            customExercises={props.settings.customExercises}
            equipment={props.settings.customEquipment}
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
          <div className="text-sm text-right" style={{ marginTop: "-0.25rem" }}>
            {reformatterSpinner && <IconSpinner width={12} height={12} />}
            <LinkButton
              name="planner-reformat-full"
              className="ml-1 text-xs font-normal align-middle"
              onClick={async () => {
                setReformatterSpinner(true);
                const result = await props.service.postPlannerReformatterFull(props.fullText.text);
                setReformatterSpinner(false);
                window.isUndoing = true;
                props.dispatch([lb<IPlannerState>().pi("fulltext").p("text").record(result)], "stop-is-undoing");
              }}
            >
              Reformat
            </LinkButton>
            <button
              className="ml-1 align-middle nm-planner-reformat"
              onClick={() =>
                alert(
                  "It'll try to format the program properly using ChatGPT - so that each exercise goes on a separate line, with proper sets x reps formatting. It's not 100% accurate, it'll do its best attempt! :)"
                )
              }
            >
              <IconHelp size={12} />
            </button>
          </div>
          <div className="fixed bottom-0 hidden sm:block" style={{ width: editorWidth }}>
            {focusedExercise?.exerciseLine != null && (
              <PlannerExerciseStatsFull
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
              Save
            </Button>
          </div>
        </div>
      </div>
      {showExerciseStats && (
        <Modal shouldShowClose={true} isFullWidth={true} onClose={() => setShowExerciseStats(false)}>
          {focusedExercise?.exerciseLine != null ? (
            <PlannerExerciseStats
              settings={props.settings}
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
