import React from "react";
import { IAccount } from "../src/models/account";
import { ExerciseHtml } from "../src/pages/exercise/exerciseHtml";
import { IExerciseType } from "../src/types";

import { renderPage } from "./render";

export function renderExerciseHtml(
  client: Window["fetch"],
  id: string,
  exerciseType: IExerciseType,
  filterTypes: string[],
  account?: IAccount
): string {
  return renderPage(
    <ExerciseHtml filterTypes={filterTypes} exerciseType={exerciseType} id={id} account={account} client={client} />
  );
}
