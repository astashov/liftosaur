import type { IUserReadArgs } from "../dao/userDao";

export interface IDirtySyncReadArgs {
  hasMergeWrite: boolean;
  historylimit?: number;
  isWatch?: boolean;
}

export function DirtySyncRead_args(args: IDirtySyncReadArgs): IUserReadArgs {
  if (args.hasMergeWrite) {
    return {};
  }
  if (args.isWatch) {
    return { historyLimit: 0, skipStats: true };
  }
  const isUsableLimit = args.historylimit != null && Number.isInteger(args.historylimit) && args.historylimit >= 0;
  return isUsableLimit ? { historyLimit: args.historylimit } : {};
}
