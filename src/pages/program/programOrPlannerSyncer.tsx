import { h, JSX } from "preact";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { ProgramContentSyncer } from "./programContentSyncer";
import { PlannerContentSyncer } from "../planner/plannerContentSyncer";

export interface IProgramOrPlannerSyncerProps {
  client: Window["fetch"];
  isMobile: boolean;
  storage?: IStorage;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSyncProgram: boolean;
  revisions: string[];
  currentRevision?: string;
}

export function ProgramOrPlannerSyncer(props: IProgramOrPlannerSyncerProps): JSX.Element {
  if (props.exportedProgram?.program.planner) {
    return <PlannerContentSyncer {...props} />;
  } else {
    return <ProgramContentSyncer {...props} />;
  }
}
