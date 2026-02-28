import { h } from "preact";
import { ExerciseHtml } from "../src/pages/exercise/exerciseHtml";
import { IExerciseType } from "../src/types";

import { renderPage } from "./render";

export function renderExerciseHtml(
  client: Window["fetch"],
  id: string,
  exerciseType: IExerciseType,
  filterTypes: string[],
  isLoggedIn?: boolean
): string {
  return renderPage(
    <ExerciseHtml
      filterTypes={filterTypes}
      exerciseType={exerciseType}
      id={id}
      isLoggedIn={isLoggedIn}
      client={client}
    />
  );
}
