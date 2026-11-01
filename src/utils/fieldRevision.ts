import { IStorage } from "../types";
import { IFieldVersion, isCollectionVersions, isFieldVersion, isVersionsObject } from "../models/versionTracker/types";
import { VersionTrackerUtils_compareVersions } from "../models/versionTracker/utils";

export function FieldRevision_isStale(stored: IFieldVersion | undefined, base: IFieldVersion | undefined): boolean {
  if (stored == null || base == null) {
    return false;
  }
  const comparison = VersionTrackerUtils_compareVersions(stored, base);
  return comparison === "a_newer" || comparison === "concurrent";
}

export function FieldRevision_dashboardText(versions: IStorage["_versions"], id: string): IFieldVersion | undefined {
  const dashboards = versions?.dashboards;
  if (!isCollectionVersions(dashboards)) {
    return undefined;
  }
  const item = dashboards.items?.[id];
  const text = isVersionsObject(item) ? item.text : undefined;
  return isFieldVersion(text) ? text : undefined;
}

export function FieldRevision_programPlanner(
  versions: IStorage["_versions"],
  clonedAt: number | undefined
): IFieldVersion | undefined {
  const programs = versions?.programs;
  if (clonedAt == null || !isCollectionVersions(programs)) {
    return undefined;
  }
  const item = programs.items?.[`${clonedAt}`];
  const planner = isVersionsObject(item) ? item.planner : undefined;
  return isFieldVersion(planner) ? planner : undefined;
}
