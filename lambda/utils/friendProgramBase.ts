import { IFieldVersion } from "../../src/models/versionTracker/types";

export interface IFriendProgramBase {
  v: 1;
  ownerId: string;
  programId: string;
  clonedAt: number;
  plannerVersion?: IFieldVersion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseClock(value: unknown): IFieldVersion | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (!isRecord(value) || typeof value.t !== "number" || !isRecord(value.vc)) {
    return undefined;
  }
  const vc: Record<string, number> = {};
  for (const [device, count] of Object.entries(value.vc)) {
    if (typeof count !== "number" || !Number.isSafeInteger(count)) {
      return undefined;
    }
    vc[device] = count;
  }
  return { vc, t: value.t };
}

export function FriendProgramBase_encode(base: IFriendProgramBase): string {
  return Buffer.from(JSON.stringify(base), "utf8").toString("base64url");
}

export function FriendProgramBase_decode(value: unknown): IFriendProgramBase | undefined {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch (e) {
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    parsed.v !== 1 ||
    typeof parsed.ownerId !== "string" ||
    typeof parsed.programId !== "string" ||
    typeof parsed.clonedAt !== "number"
  ) {
    return undefined;
  }
  const plannerVersion = parsed.plannerVersion != null ? parseClock(parsed.plannerVersion) : undefined;
  if (parsed.plannerVersion != null && plannerVersion == null) {
    return undefined;
  }
  return { v: 1, ownerId: parsed.ownerId, programId: parsed.programId, clonedAt: parsed.clonedAt, plannerVersion };
}
