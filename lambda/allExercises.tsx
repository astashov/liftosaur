import React from "react";
import { IAccount } from "../src/models/account";
import { AllExercisesHtml } from "../src/pages/allExercises/allExercisesHtml";

import { renderPage } from "./render";

export function renderAllExercisesHtml(client: Window["fetch"], account?: IAccount): string {
  return renderPage(<AllExercisesHtml account={account} client={client} />);
}
