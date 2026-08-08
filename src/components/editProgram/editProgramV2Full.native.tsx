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
import { IEvaluatedProgram } from "../../models/program";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { LiftoEditorBrain_dayDataAt } from "../primitives/liftoEditorBrain";
import { EditProgramLiftoEditor } from "./editProgramLiftoEditor";

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
  const expectedRegenRef = useRef(fulltext);
  // The editor is uncontrolled — it reads its text once — so text that changes underneath it
  // (undo/redo, a mode switch, an edit from another screen) can only land by remounting.
  const [revision, setRevision] = useState(0);
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
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
    setRevision((r) => r + 1);
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
      <EditProgramLiftoEditor
        key={revision}
        focusId="full"
        initialText={fulltext}
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
