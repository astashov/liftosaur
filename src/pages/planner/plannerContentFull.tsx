import { JSX } from "react";
import { lb } from "lens-shmens";
import { ISettings } from "../../types";
import { AppliedTheme_get } from "../../utils/appliedTheme";
import { ILensDispatch } from "../../utils/useLensReducer";
import { PlannerEditorCustomCta } from "./components/plannerEditorCustomCta";
import { PlannerEditorView } from "./components/plannerEditorView";
import { IPlannerEvalFullResult } from "./plannerExerciseEvaluator";
import { PlannerMode_applyFullText } from "./models/plannerMode";
import { IPlannerFullText, IPlannerState } from "./models/types";

export interface IPlannerContentFullProps {
  fullText: IPlannerFullText;
  fullEvaluation: IPlannerEvalFullResult;
  exerciseFullNames: string[];
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerContentFull(props: IPlannerContentFullProps): JSX.Element {
  const { fullEvaluation, dispatch } = props;
  return (
    <PlannerEditorView
      name="Program"
      theme={AppliedTheme_get(props.settings)}
      customExercises={props.settings.exercises}
      exerciseFullNames={props.exerciseFullNames}
      error={fullEvaluation.success ? undefined : fullEvaluation.error}
      value={props.fullText.text}
      lineNumbers={true}
      hasHistory={false}
      onCustomErrorCta={(err) => <PlannerEditorCustomCta isInvertedColors={true} dispatch={dispatch} err={err} />}
      onChange={(text) => {
        dispatch(
          lb<IPlannerState>().recordModify((state) => PlannerMode_applyFullText(state, text)),
          "Update full program"
        );
      }}
      onLineChange={(line) => {
        dispatch(lb<IPlannerState>().pi("fulltext").p("currentLine").record(line), "Update current line");
      }}
    />
  );
}
