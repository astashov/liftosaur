import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { lb, LensBuilder } from "lens-shmens";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateFull,
  PlannerProgram_evaluateText,
} from "../../pages/planner/models/plannerProgram";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { EditProgramCustomErrorCta } from "./editProgramCustomErrorCta";
import { Settings_getTheme } from "../../models/settings";

export interface IEditProgramV2FullProps {
  plannerProgram: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  lbUi: LensBuilder<IPlannerState, IPlannerUi, {}, undefined>;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2Full(props: IEditProgramV2FullProps): JSX.Element {
  const [fulltext, setFulltext] = useState(() => PlannerProgram_generateFullText(props.plannerProgram.weeks));
  const expectedRegenRef = useRef(fulltext);
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerState>().p("ui");
  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram_evaluateFull(fulltext, props.settings);
  }, [fulltext, props.settings]);
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
    <View className="relative">
      <View className="px-4 pt-4">
        <PlannerEditorView
          name="Program"
          theme={Settings_getTheme(props.settings)}
          autoHeight={true}
          minHeight={200}
          customExercises={props.settings.exercises}
          exerciseFullNames={exerciseFullNames}
          error={
            props.ui.fullTextError ? props.ui.fullTextError : evaluatedWeeks.success ? undefined : evaluatedWeeks.error
          }
          value={fulltext}
          onCustomErrorCta={(err) => (
            <EditProgramCustomErrorCta dayData={{ week: 1, dayInWeek: 1 }} dispatch={props.plannerDispatch} err={err} />
          )}
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
          lineNumbers={true}
          onBlur={(_e, _text) => {}}
          onLineChange={(_line) => {}}
        />
      </View>
    </View>
  );
}
