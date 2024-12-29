import React from "react";
import { MainContent } from "./pages/main/mainContent";
import { IProgramContentSyncerProps } from "./pages/program/programContentSyncer";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IProgramContentSyncerProps>((pageWrapperProps, data) => (
    <MainContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
