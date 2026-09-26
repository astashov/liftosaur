import type { IStatDb } from "../dao/userDao";
import type { IStats } from "../../src/types";
import { ObjectUtils_keys } from "../../src/utils/object";
import { CollectionUtils_diffByKey } from "../../src/utils/collection";

export interface IStatRowWrites {
  puts: IStatDb[];
  deleteNames: string[];
}

export function StatRowWrites_rows(stats: IStats): IStatDb[] {
  const rows = (
    type: IStatDb["type"],
    byKey: Partial<Record<string, { timestamp: number }[]>> | undefined
  ): IStatDb[] =>
    ObjectUtils_keys(byKey || {}).flatMap((key) =>
      (byKey?.[key] || []).map((s) => ({ ...s, name: `${s.timestamp}_${key}`, type }) as IStatDb)
    );
  return rows("length", stats.length)
    .concat(rows("weight", stats.weight))
    .concat(rows("percentage", stats.percentage))
    .concat(rows("health", stats.health));
}

export function StatRowWrites_plan(before: IStats, next: IStats, putUnchanged: boolean): IStatRowWrites {
  const nextRows = StatRowWrites_rows(next);
  // Stats without a `health` key (a pre-health client, an old backup) mean "unknown", so imported health rows stay
  const beforeRows = StatRowWrites_rows(before).filter((row) => next.health != null || row.type !== "health");
  const diff = CollectionUtils_diffByKey(beforeRows, nextRows, (row) => row.name);
  return { puts: putUnchanged ? nextRows : diff.changed, deleteNames: diff.removedKeys };
}
