import { h } from "preact";
import { IPlannerProgram } from "./pages/planner/models/types";
import { PlannerContent } from "./pages/planner/plannerContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IPlannerProgram>((data) => <PlannerContent {...data} client={window.fetch.bind(window)} />);
}

main();
