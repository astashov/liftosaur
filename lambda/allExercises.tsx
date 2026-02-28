import { h } from "preact";
import { AllExercisesHtml } from "../src/pages/allExercises/allExercisesHtml";

import { renderPage } from "./render";

export function renderAllExercisesHtml(client: Window["fetch"], isLoggedIn?: boolean): string {
  return renderPage(<AllExercisesHtml isLoggedIn={isLoggedIn} client={client} />);
}
