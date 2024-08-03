import { h, JSX } from "preact";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { PlannerContent } from "../planner/plannerContent";
import { IExportedPlannerProgram } from "../planner/models/types";

export interface IPlannerContentSyncerProps {
  client: Window["fetch"];
  storage?: IStorage;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSyncProgram: boolean;
  revisions: string[];
  currentRevision?: string;
}

export function PlannerContentSyncer(props: IPlannerContentSyncerProps): JSX.Element {
  const { storage } = props;
  const exportedProgram = props.exportedProgram;
  const exportedPlannerProgram: IExportedPlannerProgram | undefined = exportedProgram?.program.planner
    ? {
        id: exportedProgram?.program.id,
        type: "v2",
        version: exportedProgram.version,
        program: exportedProgram?.program.planner,
        plannerSettings: storage?.settings.planner,
        settings: {
          exercises: storage?.settings?.exercises || {},
          timer: storage?.settings?.timers?.workout || 180,
        },
      }
    : undefined;

  return (
    <PlannerContent
      client={props.client}
      initialProgram={exportedPlannerProgram}
      partialStorage={props.storage}
      account={props.account}
      shouldSync={props.shouldSyncProgram}
      revisions={props.revisions}
    />
  );
}
