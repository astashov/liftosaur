import { JSX, h } from "preact";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { lb, LensBuilder } from "lens-shmens";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateFull,
  PlannerProgram_evaluateText,
} from "../../pages/planner/models/plannerProgram";
import { useEffect, useMemo, useRef } from "preact/hooks";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { EditProgramCustomErrorCta } from "./editProgramCustomErrorCta";

export interface IEditProgramV2FullProps {
  plannerProgram: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}, undefined>;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Full(props: IEditProgramV2FullProps): JSX.Element {
  const fulltext = PlannerProgram_generateFullText(props.plannerProgram.weeks);
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram_evaluateFull(fulltext, props.settings);
  }, [fulltext, props.settings]);
  const settingsRef = useRef(props.settings);
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
    <div className="relative">
      <div className="flex flex-col px-4 pt-4 md:flex-row">
        <div className="flex-1 min-w-0">
          <PlannerEditorView
            name="Program"
            customExercises={props.settings.exercises}
            exerciseFullNames={exerciseFullNames}
            error={
              props.ui.fullTextError
                ? props.ui.fullTextError
                : evaluatedWeeks.success
                  ? undefined
                  : evaluatedWeeks.error
            }
            value={fulltext}
            onCustomErrorCta={(err) => (
              <EditProgramCustomErrorCta
                dayData={{ week: 1, dayInWeek: 1 }}
                dispatch={props.plannerDispatch}
                err={err}
              />
            )}
            onChange={(text) => {
              const weeks = PlannerProgram_evaluateText(text);
              const { evaluatedWeeks: evaluatedWeeks2 } = PlannerProgram_evaluateFull(text, settingsRef.current);
              props.plannerDispatch(
                [
                  lbUi.p("fullTextError").record(evaluatedWeeks2.success ? undefined : evaluatedWeeks2.error),
                  lbProgram.p("weeks").record(weeks),
                ],
                "Update full program text"
              );
            }}
            lineNumbers={true}
            onBlur={(e, text) => {}}
            onLineChange={(line) => {}}
          />
        </div>
      </div>
    </div>
  );
}
