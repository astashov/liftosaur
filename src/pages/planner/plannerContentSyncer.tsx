import { h, JSX } from "preact";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { PlannerContent } from "../planner/plannerContent";

export interface IPlannerContentSyncerProps {
  client: Window["fetch"];
  storage?: IStorage;
  deviceId?: string;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSyncProgram: boolean;
  source?: string;
  revisions: string[];
  currentRevision?: string;
}

export function PlannerContentSyncer(props: IPlannerContentSyncerProps): JSX.Element {
  const exportedProgram = props.exportedProgram;

  return (
    <PlannerContent
      client={props.client}
      deviceId={props.deviceId}
      nextDay={exportedProgram?.program.nextDay}
      initialProgram={exportedProgram}
      source={props.source}
      partialStorage={props.storage}
      account={props.account}
      shouldSync={props.shouldSyncProgram}
      revisions={props.revisions}
    />
  );
}
