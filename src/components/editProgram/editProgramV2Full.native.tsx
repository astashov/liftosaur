import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { lb, LensBuilder } from "lens-shmens";
import {
  PlannerProgram_fullToWeekEvalResult,
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateFull,
  PlannerProgram_evaluateText,
} from "../../pages/planner/models/plannerProgram";
import { IEvaluatedProgram, Program_findPlannerExercise } from "../../models/program";
import { Dialog_alert } from "../../utils/dialog";
import { useModal } from "../../navigation/ModalStateContext";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { LiftoEditorBrain_dayDataAt } from "../primitives/liftoEditorBrain";
import { DayLiftoEditorInline } from "./dayLiftoEditorInline";

export interface IEditProgramV2FullProps {
  plannerProgram: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}, undefined>;
  plannerDispatch: ILensDispatch<IPlannerState>;
  evaluatedProgram: IEvaluatedProgram;
}

export function EditProgramV2Full(props: IEditProgramV2FullProps): JSX.Element {
  const [fulltext, setFulltext] = useState(() => PlannerProgram_generateFullText(props.plannerProgram.weeks));
  // What this editor's own last commit regenerates to. Anything else the program turns into
  // (undo/redo, an edit from another screen) is a change from outside, and the editor applies
  // it as an edit.
  const expectedRegenRef = useRef(fulltext);
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
  const openAcrossProgram = useModal("acrossProgramModal", (planner) => {
    props.plannerDispatch(lbProgram.record(planner), "Change across program");
  });
  const { evaluatedWeeks } = useMemo(() => {
    return PlannerProgram_evaluateFull(fulltext, props.settings);
  }, [fulltext, props.settings]);
  const perDayWeeks = useMemo(() => PlannerProgram_fullToWeekEvalResult(evaluatedWeeks), [evaluatedWeeks]);
  const settingsRef = useRef(props.settings);

  useEffect(() => {
    const regen = PlannerProgram_generateFullText(props.plannerProgram.weeks);
    if (regen === expectedRegenRef.current) {
      return;
    }
    expectedRegenRef.current = regen;
    setFulltext(regen);
  }, [props.plannerProgram.weeks]);

  useEffect(() => {
    settingsRef.current = props.settings;
    const { evaluatedWeeks: evaluatedWeeks2 } = PlannerProgram_evaluateFull(fulltext, settingsRef.current);
    const newError = evaluatedWeeks2.success ? undefined : evaluatedWeeks2.error;
    if (
      props.ui.fullTextError?.message !== newError?.message ||
      props.ui.fullTextError?.line !== newError?.line ||
      props.ui.fullTextError?.offset !== newError?.offset
    ) {
      props.plannerDispatch(lbUi.p("fullTextError").record(newError), "Update full text error");
    }
  }, [props.settings]);

  return (
    <View className="px-4 pt-4">
      <DayLiftoEditorInline
        focusId="full"
        text={fulltext}
        settings={props.settings}
        evaluatedProgram={props.evaluatedProgram}
        error={
          props.ui.fullTextError ? props.ui.fullTextError : evaluatedWeeks.success ? undefined : evaluatedWeeks.error
        }
        // Looked up across the whole program rather than in the caret's day: the same exercise
        // carries the same equipment wherever it appears, and this is asked while focus is
        // still crossing into it.
        exerciseTypeFor={(fullName) => {
          const key = PlannerKey_fromFullName(fullName, props.settings.exercises);
          for (const week of perDayWeeks) {
            for (const day of week) {
              const exercise = day.success ? day.data.find((e) => e.key === key) : undefined;
              if (exercise != null) {
                return exercise.exerciseType;
              }
            }
          }
          return undefined;
        }}
        contextAt={(offset) => {
          const dayData = LiftoEditorBrain_dayDataAt(fulltext, offset);
          const day = perDayWeeks[dayData.week - 1]?.[dayData.dayInWeek - 1];
          return { dayData, exercises: day?.success ? day.data : [] };
        }}
        // Fold, then apply. Here the document is the whole program, so folding is parsing it back
        // into weeks — the same step this editor's own commit does — and the rewritten planner
        // returns through plannerDispatch, which regenerates the text this editor absorbs.
        onEditAcrossProgram={(field, exerciseFullName, text) => {
          const planner = { ...props.plannerProgram, weeks: PlannerProgram_evaluateText(text) };
          // Resolved against the planner just folded, not against `perDayWeeks` — a full-document
          // parse is all-or-nothing (`PlannerProgram_fullToWeekEvalResult` collapses a failure to a
          // single error cell), so an unfinished line anywhere would take this action away from
          // every line in the program. Evaluating the folded planner costs only the broken day.
          const exercise =
            exerciseFullName != null
              ? Program_findPlannerExercise(planner, props.settings, exerciseFullName)
              : undefined;
          if (exercise == null) {
            Dialog_alert("Couldn't tell which exercise this is. Fix any errors on this line and try again.");
            return;
          }
          openAcrossProgram({ planner, exerciseKey: exercise.key, exerciseFullName: exercise.fullName, field });
        }}
        onChange={(text) => {
          setFulltext(text);
          const weeks = PlannerProgram_evaluateText(text);
          expectedRegenRef.current = PlannerProgram_generateFullText(weeks);
          const { evaluatedWeeks: evaluatedWeeks2 } = PlannerProgram_evaluateFull(text, settingsRef.current);
          props.plannerDispatch(
            [
              lbUi.p("fullTextError").record(evaluatedWeeks2.success ? undefined : evaluatedWeeks2.error),
              lbProgram.p("weeks").record(weeks),
            ],
            "Update full program text"
          );
        }}
      />
    </View>
  );
}
