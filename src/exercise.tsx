import { h } from "preact";
import { IExerciseContentProps, ExerciseContent } from "./pages/exercise/exerciseContent";
import { HydrateUtils_hydratePage } from "./utils/hydrate";

function main(): void {
  HydrateUtils_hydratePage<IExerciseContentProps>((pageWrapperProps, data) => (
    <ExerciseContent {...data} client={window.fetch.bind(window)} />
  ));
}

main();
