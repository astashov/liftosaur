import React, { JSX } from "react";
import { IExportedProgram } from "../../models/program";
import { IStorage } from "../../types";
import { IAccount } from "../../models/account";
import { ProgramContent } from "./programContent";

export interface IProgramContentSyncerProps {
  client: Window["fetch"];
  isMobile: boolean;
  storage?: IStorage;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSyncProgram: boolean;
}

export function ProgramContentSyncer(props: IProgramContentSyncerProps): JSX.Element {
  return (
    <div>
      <ProgramContent
        isMobile={props.isMobile}
        client={props.client}
        account={props.account}
        exportedProgram={props.exportedProgram}
        shouldSync={props.shouldSyncProgram}
      />
    </div>
  );
}
