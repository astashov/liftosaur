import { h } from "preact";

import { renderPage } from "./render";
import { UserHtml } from "../../src/pages/user/userHtml";
import { IEither } from "../../src/utils/types";
import { Program } from "../../src/models/program";
import { History } from "../../src/models/history";
import { Exercise } from "../../src/models/exercise";
import { ObjectUtils } from "../../src/utils/object";
import { StringUtils } from "../../src/utils/string";
import { Weight } from "../../src/models/weight";
import { IStorage, IExerciseId } from "../../src/types";

export function renderUserHtml(storage: IStorage, userId: string): string {
  return renderPage(<UserHtml data={storage} userId={userId} />);
}

export async function userImage(storage: IStorage): Promise<IEither<ArrayBuffer, string>> {
  const history = storage.history;
  const program = Program.getCurrentProgram(storage);
  const maxSets = History.findAllMaxSets(history);
  const order: IExerciseId[] = ["benchPress", "overheadPress", "squat", "deadlift", "bentOverRow", "pullUp", "chinUp"];
  const json = {
    programName: program?.name,
    userName: storage.settings.nickname,
    exercises: ObjectUtils.sortedByKeys(maxSets, order).map(([id, set]) => {
      const exercise = Exercise.getById(id);
      const value = `${set?.completedReps || 0} ${StringUtils.pluralize(
        "rep",
        set?.completedReps || 0
      )} x ${Weight.display(
        Weight.convertTo(set?.weight || Weight.build(0, storage.settings.units), storage.settings.units)
      )}`;
      return {
        name: exercise.name,
        value,
      };
    }),
  };

  const response = await fetch("https://xns95doaoh.execute-api.us-west-2.amazonaws.com/prod/profileogimage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  });

  if (response.status === 200) {
    return { success: true, data: await response.arrayBuffer() };
  } else {
    return { success: false, error: await response.text() };
  }
}
