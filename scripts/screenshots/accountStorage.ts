import { IStorage } from "../../src/types";
import { DateUtils_formatYYYYMMDD } from "../../src/utils/date";

const tourHelps = [
  "workout.howItWorks",
  "workout.completingSets",
  "workout.whatIs1RM",
  "workout.whatIsRPE",
  "workout.equipment",
  "workout.editingProgram",
  "workout.swipeSets",
  "workout.progressionPreview",
  "program.structure",
  "program.updates",
  "program.text",
  "program.liftoscript",
  "program.addExercise",
  "program.editExercise",
  "program.playground",
  "editProgramExercise.overview",
  "editProgramExercise.sets",
  "editProgramExercise.warmups",
  "editProgramExercise.progress",
  "editProgramExercise.update",
  "editProgramExercise.repeat",
  "editProgramExercise.reuse",
];

export interface IScreenshotsAccount {
  id: string;
  email: string;
  key: string;
  now: number;
}

export function ScreenshotsAccountStorage_id(simIndex: number): string {
  return `screenshots${simIndex + 1}`;
}

export function ScreenshotsAccountStorage_email(simIndex: number): string {
  return `feature-screenshots${simIndex + 1}@test.liftosaur.com`;
}

export function ScreenshotsAccountStorage_build(fixture: IStorage, account: IScreenshotsAccount): IStorage {
  return {
    ...fixture,
    tempUserId: account.id,
    email: account.email,
    subscription: { ...fixture.subscription, key: account.key },
    whatsNew: DateUtils_formatYYYYMMDD(account.now, ""),
    helps: [...tourHelps],
    hearAboutUs: { requests: [], done: true },
  };
}
