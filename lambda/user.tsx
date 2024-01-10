import { h } from "preact";

import { renderPage } from "./render";
import { IStorage, IExerciseId } from "../src/types";
import { UserHtml } from "../src/pages/user/userHtml";
import { Program } from "../src/models/program";
import { History } from "../src/models/history";
import { ObjectUtils } from "../src/utils/object";
import { Exercise } from "../src/models/exercise";
import { StringUtils } from "../src/utils/string";
import { Weight } from "../src/models/weight";
import { IProfileImageGeneratorArgs, ProfileImageGenerator } from "./utils/profileImageGenerator";

export function renderUserHtml(client: Window["fetch"], storage: IStorage, userId: string): string {
  return renderPage(<UserHtml client={client} data={storage} userId={userId} />);
}

export function userImage(storage: IStorage): Promise<Buffer> {
  const history = storage.history;
  const program = Program.getCurrentProgram(storage);
  const maxSets = History.findAllMaxSetsPerId(history);
  const order: IExerciseId[] = ["benchPress", "overheadPress", "squat", "deadlift", "bentOverRow", "pullUp", "chinUp"];
  const mainLifts = ObjectUtils.keys(maxSets).filter((k) => order.some((i) => k.indexOf(i) !== -1));

  const exercises = mainLifts
    .map((id) => [Exercise.get(Exercise.fromKey(id), storage.settings.exercises), maxSets[id]] as const)
    .concat(
      ObjectUtils.keys(maxSets)
        .filter((k) => mainLifts.indexOf(k) === -1)
        .map((id) => [Exercise.get(Exercise.fromKey(id), storage.settings.exercises), maxSets[id]] as const)
    );

  const json: IProfileImageGeneratorArgs = {
    programName: program?.name || "",
    userName: storage.settings.nickname || "",
    exercises: exercises.map(([exercise, set]) => {
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

  const generator = new ProfileImageGenerator();
  return generator.generate(json);
}
