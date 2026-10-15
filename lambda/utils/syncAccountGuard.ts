export type ISyncAccountGuardDecision = "proceed" | "lookup" | "mismatch";

export function SyncAccountGuard_decide(args: {
  cookieUserId: string;
  tempUserId: string | undefined;
  tempUserIsAccount?: boolean;
}): ISyncAccountGuardDecision {
  if (args.tempUserId == null || args.tempUserId === "" || args.tempUserId === args.cookieUserId) {
    return "proceed";
  }
  if (args.tempUserIsAccount == null) {
    return "lookup";
  }
  return args.tempUserIsAccount ? "mismatch" : "proceed";
}
