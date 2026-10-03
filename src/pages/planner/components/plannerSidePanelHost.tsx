import { JSX, useEffect, useMemo } from "react";
import { lb } from "lens-shmens";
import { useGridSelection } from "../../../components/editProgram/editProgramGrid/gridSelectionContext";
import { GridSelectionSummary_build } from "../../../components/editProgram/editProgramGrid/gridSelectionSummary";
import { IEvaluatedProgram } from "../../../models/program";
import { ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerEvalFullResult, IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { PlannerMode_current } from "../models/plannerMode";
import {
  PlannerSidePanelStats_cursorFor,
  PlannerSidePanelStats_forSelection,
  PlannerSidePanelStats_selectionKey,
  PlannerSidePanelStats_select,
} from "../models/plannerSidePanelStats";
import { ProgramGrid_build } from "../models/programGrid";
import { IPlannerState } from "../models/types";
import { PlannerSidePanel } from "./plannerSidePanel";

export function PlannerSidePanelHost(props: {
  state: IPlannerState;
  settings: ISettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  fullEvaluation?: IPlannerEvalFullResult;
  evaluatedProgram?: IEvaluatedProgram;
  copiedUrl?: string;
  isAffiliateLink: boolean;
  isExportDisabled: boolean;
  dispatch: ILensDispatch<IPlannerState>;
  onCopyLink: () => Promise<void>;
  onExportImage: () => void;
  onVersions?: () => void;
  onEditSettings: () => void;
}): JSX.Element {
  const { state, settings, dispatch, evaluatedProgram } = props;
  const lbUi = lb<IPlannerState>().p("ui");
  const selection = useGridSelection();
  const isReorder = PlannerMode_current(state.ui) === "grid";
  const target = isReorder ? selection?.target : undefined;
  const grid = useMemo(
    () => (isReorder && evaluatedProgram != null ? ProgramGrid_build(evaluatedProgram, settings) : undefined),
    [isReorder, evaluatedProgram, settings]
  );
  const cursor = PlannerSidePanelStats_cursorFor({
    state,
    target,
    grid,
    evaluatedProgram,
    fullEvaluation: props.fullEvaluation,
  });
  const tab = state.ui.sidePanelTab ?? "week";
  const stats = PlannerSidePanelStats_select(tab, cursor, props.evaluatedWeeks, settings);

  const selectionKey = PlannerSidePanelStats_selectionKey(target);
  useEffect(() => {
    const selectedTab = target != null ? PlannerSidePanelStats_forSelection(target) : undefined;
    if (selectedTab != null) {
      dispatch(lbUi.p("sidePanelTab").record(selectedTab), "Follow grid selection in stats");
    }
  }, [selectionKey]);

  return (
    <PlannerSidePanel
      evaluatedWeeks={props.evaluatedWeeks}
      settings={settings}
      tab={tab}
      stats={stats}
      isReorder={isReorder}
      selection={
        isReorder && selection != null ? GridSelectionSummary_build(selection, { includeStats: false }) : undefined
      }
      copiedUrl={props.copiedUrl}
      isAffiliateLink={props.isAffiliateLink}
      isExportDisabled={props.isExportDisabled}
      dispatch={dispatch}
      onTab={(newTab) => dispatch(lbUi.p("sidePanelTab").record(newTab), "Change stats tab")}
      onCopyLink={props.onCopyLink}
      onExportImage={props.onExportImage}
      onVersions={props.onVersions}
      onEditSettings={props.onEditSettings}
      onClearSelection={() => selection?.onClear()}
      onClose={() => dispatch(lbUi.p("sidePanelOpen").record(false), "Close side panel")}
    />
  );
}
