/* eslint-disable @typescript-eslint/ban-types */
import { JSX, h } from "preact";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerFullText, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { lb, LensBuilder } from "lens-shmens";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { useMemo } from "preact/hooks";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
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
  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram.evaluateFull(props.fulltext.text, props.settings);
  }, [props.fulltext.text, props.settings.exercises]);

  return (
    <div className="relative">
      <div className="flex flex-col px-4 pt-4 md:flex-row">
        <div className="flex-1 min-w-0">
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
      </div>
    </div>
  );
}
