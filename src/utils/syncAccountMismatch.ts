import type { IPostSyncResponse } from "../api/service";

export type ISyncAccountMismatch = { userId: string; email: string };
export type ISyncAccountMismatchPlan = "ignore" | "load-local" | "fetch-server";

export function SyncAccountMismatch_fromResponse(result: IPostSyncResponse): ISyncAccountMismatch | undefined {
  if (result.type === "error" && result.error === "account_mismatch" && "user_id" in result) {
    return { userId: result.user_id, email: result.email };
  }
  return undefined;
}

export function SyncAccountMismatch_plan(args: {
  sentTempUserId: string;
  currentTempUserId: string;
  hasLocalCopy: boolean;
}): ISyncAccountMismatchPlan {
  if (args.currentTempUserId !== args.sentTempUserId) {
    return "ignore";
  }
  return args.hasLocalCopy ? "load-local" : "fetch-server";
}
