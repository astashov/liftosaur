import { IProgram, ISettings, IStorage } from "../../src/types";
import { FieldRevision_isSame, FieldRevision_programPlanner } from "../../src/utils/fieldRevision";
import { PlannerProgram_evaluateText } from "../../src/pages/planner/models/plannerProgram";
import { ApiV1_validateProgramText, IApiError } from "./apiv1";
import { IFriendProgramBase } from "./friendProgramBase";

export const FriendProgramUpdate_maxTextLength = 200_000;

export type IFriendProgramUpdateCheck = { ok: true; program: IProgram } | { ok: false; error: IApiError };

function fail(status: number, code: string, message: string): IFriendProgramUpdateCheck {
  return { ok: false, error: { status, code, message } };
}

export function FriendProgramUpdate_check(args: {
  ownerId: string;
  programId: string;
  base: IFriendProgramBase | undefined;
  existing: IProgram | undefined;
  versions: IStorage["_versions"];
  text: unknown;
  settings: ISettings;
}): IFriendProgramUpdateCheck {
  const { base, existing, text } = args;
  if (typeof text !== "string" || text.trim() === "") {
    return fail(400, "invalid_input", "text must be a non-empty string with the full program text");
  }
  if (text.length > FriendProgramUpdate_maxTextLength) {
    return fail(400, "invalid_input", `text is longer than ${FriendProgramUpdate_maxTextLength} characters`);
  }
  if (base == null || base.ownerId !== args.ownerId || base.programId !== args.programId) {
    return fail(400, "invalid_input", "Missing or invalid base. Load the program before editing it.");
  }
  if (existing == null || existing.planner == null || existing.clonedAt == null) {
    return fail(404, "not_found", "Program not found");
  }
  if (existing.clonedAt !== base.clonedAt) {
    return fail(409, "conflict", "The program was replaced. Reload it and redo your edit.");
  }
  if (!FieldRevision_isSame(FieldRevision_programPlanner(args.versions, existing.clonedAt), base.plannerVersion)) {
    return fail(409, "conflict", "The program changed since you opened it. Reload it and redo your edit.");
  }
  const validation = ApiV1_validateProgramText(text, args.settings);
  if (validation != null) {
    return { ok: false, error: validation };
  }
  const weeks = PlannerProgram_evaluateText(text);
  return { ok: true, program: { ...existing, planner: { ...existing.planner, weeks } } };
}
