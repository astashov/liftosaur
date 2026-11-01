import { IDashboard } from "../../src/types";

export interface IDashboardRowWrites {
  idsToDelete: string[];
  dashboardsToPut: IDashboard[];
}

export function DashboardRowWrites_plan(mergedDashboards: IDashboard[], tombstonedIds: string[]): IDashboardRowWrites {
  const tombstoned = new Set(tombstonedIds);
  return {
    idsToDelete: Array.from(tombstoned),
    dashboardsToPut: mergedDashboards.filter((d) => !tombstoned.has(d.id)),
  };
}
