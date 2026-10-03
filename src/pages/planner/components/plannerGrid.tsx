import { JSX } from "react";
import { EditProgramGrid } from "../../../components/editProgram/editProgramGrid/editProgramGrid";
import { IGridHost } from "../../../components/editProgram/editProgramGrid/gridHost";
import { IEvaluatedProgram } from "../../../models/program";
import { ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerState } from "../models/types";
import { PlannerWindowScrollProvider } from "./plannerWindowScroll";

export interface IPlannerGridProps {
  state: IPlannerState;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  host: IGridHost;
  stickyHeaderHeight: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function PlannerGrid(props: IPlannerGridProps): JSX.Element {
  return (
    <PlannerWindowScrollProvider stickyHeaderHeight={props.stickyHeaderHeight} footerHeight={0}>
      {/* The grid sizes its lanes for the default line height (React Native's on native); the
          page's body line-height of 1.55em is inherited as a fixed 24.8px and overflows them. */}
      <div style={{ lineHeight: "normal" }}>
        <EditProgramGrid
          evaluatedProgram={props.evaluatedProgram}
          settings={props.settings}
          host={props.host}
          scale={props.state.ui.gridScale}
          plannerDispatch={props.plannerDispatch}
        />
      </div>
    </PlannerWindowScrollProvider>
  );
}
