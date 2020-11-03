import json from "../exes.json";
import fs from "fs";
import { IExerciseId } from "./models/exercise";
import { ObjectUtils } from "./utils/object";

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exes: Partial<Record<string, Partial<Record<string, { id: string }>>>> = json as any;
  const ids: string[] = [];
  for (const exerciseId of ObjectUtils.keys(exes)) {
    const equipments = exes[exerciseId]!;
    for (const equipment of ObjectUtils.keys(equipments)) {
      ids.push(equipments[equipment]!.id);
    }
  }
  const files = fs.readdirSync("/Users/anton/projects/liftosaur-imgs");
  console.log(files.length);
  console.log(ids.length);
  console.dir(ids, { maxArrayLength: null });
  for (const id of ids) {
    const file = files.find((f) => f.indexOf(`${id}_`) !== -1);
    if (file == null) {
      console.log(id);
    } else {
      console.log(file);
    }
  }
}

main();
