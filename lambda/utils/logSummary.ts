import { ILogDao } from "../dao/logDao";

export type ILogSummaryRow = Pick<ILogDao, "action" | "ts"> & Partial<Pick<ILogDao, "subscriptions">>;

export interface ILogSummary {
  userId: string;
  firstAction: { name: string; ts: number };
  lastAction: { name: string; ts: number };
  hasSubscriptions: boolean;
}

export function LogSummary_ofUser(userId: string, rows: ILogSummaryRow[]): ILogSummary | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  let first = rows[0];
  let last = rows[0];
  let hasSubscriptions = false;
  for (const row of rows) {
    if (row.ts < first.ts) {
      first = row;
    }
    if (row.ts > last.ts) {
      last = row;
    }
    if ((row.subscriptions || []).length > 0) {
      hasSubscriptions = true;
    }
  }
  return {
    userId,
    firstAction: { name: first.action, ts: first.ts },
    lastAction: { name: last.action, ts: last.ts },
    hasSubscriptions,
  };
}
