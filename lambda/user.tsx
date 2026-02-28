import { h } from "preact";

import { renderPage } from "./render";
import { IStorage, IExerciseId } from "../src/types";
import { UserHtml } from "../src/pages/user/userHtml";
import { Program_getCurrentProgram } from "../src/models/program";
import { History_findAllMaxSetsPerId } from "../src/models/history";
import { ObjectUtils_keys } from "../src/utils/object";
import { Exercise_get, Exercise_fromKey } from "../src/models/exercise";
import { StringUtils_pluralize } from "../src/utils/string";
import { Weight_display, Weight_convertTo, Weight_build } from "../src/models/weight";
import { IProfileImageGeneratorArgs, ProfileImageGenerator } from "./utils/profileImageGenerator";

export function renderUserHtml(client: Window["fetch"], storage: IStorage, userId: string): string {
  return renderPage(<UserHtml client={client} data={storage} userId={userId} />);
}

export function userImage(storage: IStorage): Promise<Buffer> {
  const history = storage.history;
  const program = Program_getCurrentProgram(storage);
  const maxSets = History_findAllMaxSetsPerId(history);
  const order: IExerciseId[] = ["benchPress", "overheadPress", "squat", "deadlift", "bentOverRow", "pullUp", "chinUp"];
  const mainLifts = ObjectUtils_keys(maxSets).filter((k) => order.some((i) => k.indexOf(i) !== -1));

  const exercises = mainLifts
    .map((id) => [Exercise_get(Exercise_fromKey(id), storage.settings.exercises), maxSets[id]] as const)
    .concat(
      ObjectUtils_keys(maxSets)
        .filter((k) => mainLifts.indexOf(k) === -1)
        .map((id) => [Exercise_get(Exercise_fromKey(id), storage.settings.exercises), maxSets[id]] as const)
    );

  const json: IProfileImageGeneratorArgs = {
    programName: program?.name || "",
    userName: storage.settings.nickname || "",
    exercises: exercises.map(([exercise, set]) => {
      const value = `${set?.completedReps || 0} ${StringUtils_pluralize(
        "rep",
        set?.completedReps || 0
      )} x ${Weight_display(
        Weight_convertTo(set?.weight || Weight_build(0, storage.settings.units), storage.settings.units)
      )}`;
      return {
        name: exercise.name,
        value,
      };
    }),
  };

  const generator = new ProfileImageGenerator();
  return generator.generate(json);
}
