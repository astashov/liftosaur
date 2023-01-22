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

export function renderUserHtml(storage: IStorage, userId: string): string {
  return renderPage(<UserHtml data={storage} userId={userId} />);
}

export function userImage(storage: IStorage): Promise<Buffer> {
  const history = storage.history;
  const program = Program.getCurrentProgram(storage);
  const maxSets = History.findAllMaxSetsPerId(history);
  const order: IExerciseId[] = ["benchPress", "overheadPress", "squat", "deadlift", "bentOverRow", "pullUp", "chinUp"];
  const json: IProfileImageGeneratorArgs = {
    programName: program?.name || "",
    userName: storage.settings.nickname || "",
    exercises: ObjectUtils.sortedByKeys(maxSets, order).map(([id, set]) => {
      const exercise = Exercise.getById(id, storage.settings.exercises);
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
