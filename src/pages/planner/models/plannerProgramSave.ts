import { IFieldVersion } from "../../../models/versionTracker/types";
import { IPartialStorage, IProgram, ISettings } from "../../../types";
import { FieldRevision_programPlanner } from "../../../utils/fieldRevision";
import { PlannerProgram_generateFullText } from "./plannerProgram";

export interface IPlannerFriendTarget {
  ownerId: string;
  nickname?: string;
  base: string;
  settings: ISettings;
}

export type IPlannerSaveTarget = { kind: "own" } | { kind: "friend"; ownerId: string; loadedBase: string };

export interface IPlannerCapabilities {
  canSaveSettings: boolean;
  canRename: boolean;
  canShare: boolean;
  otherAccountWarning?: string;
  customExercisesLockedReason?: string;
}

export function PlannerProgramSave_target(friendTarget: IPlannerFriendTarget | undefined): IPlannerSaveTarget {
  return friendTarget != null
    ? { kind: "friend", ownerId: friendTarget.ownerId, loadedBase: friendTarget.base }
    : { kind: "own" };
}

export function PlannerProgramSave_capabilities(
  isLoggedIn: boolean,
  friendTarget: IPlannerFriendTarget | undefined
): IPlannerCapabilities {
  if (friendTarget == null) {
    return { canSaveSettings: isLoggedIn, canRename: true, canShare: true };
  }
  const owner = friendTarget.nickname || "your friend";
  return {
    canSaveSettings: false,
    canRename: false,
    canShare: false,
    otherAccountWarning: `You're editing ${owner}'s program, not yours. Saving changes it on their phone right away.`,
    customExercisesLockedReason: `Custom exercises belong to ${owner}'s account. Pick one of theirs or a built-in exercise.`,
  };
}

export function PlannerProgramSave_friendRequest(
  program: IProgram,
  base: string
): { programId: string; text: string; base: string } {
  return {
    programId: program.id,
    text: PlannerProgram_generateFullText(program.planner?.weeks ?? []),
    base,
  };
}

export function PlannerProgramSave_initialBase(
  storage: Pick<IPartialStorage, "_versions"> | undefined,
  program: Pick<IProgram, "clonedAt"> | undefined
): IFieldVersion | undefined {
  return FieldRevision_programPlanner(storage?._versions, program?.clonedAt);
}

export function PlannerProgramSave_baseAfterSave(
  base: IFieldVersion | undefined,
  saved: { plannerVersion?: IFieldVersion }
): IFieldVersion | undefined {
  return saved.plannerVersion ?? base;
}
