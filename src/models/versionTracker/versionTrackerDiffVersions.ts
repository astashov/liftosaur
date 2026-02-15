import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import {
  IVersions,
  IVersionsObject,
  IVersionValue,
  ICollectionVersions,
  isFieldVersion,
  isCollectionVersions,
  isVersionsObject,
} from "./types";
import { VersionTrackerUtils } from "./utils";

export class VersionTrackerDiffVersions {
  public run<T>(oldVersions: IVersions<T> | undefined, newVersions: IVersions<T>): IVersions<T> | undefined {
    const diff: IVersions<T> = {};
    let hasChanges = false;

    for (const key of ObjectUtils.keys(newVersions)) {
      const oldVersion = oldVersions?.[key];
      const newVersion = newVersions[key];

      const fieldDiff = this.diffFieldVersion(oldVersion, newVersion);
      if (fieldDiff != null) {
        diff[key] = fieldDiff;
        hasChanges = true;
      }
    }

    return hasChanges ? diff : undefined;
  }

  private diffFieldVersion(
    oldVersion: IVersionValue | undefined,
    newVersion: IVersionValue | undefined
  ): IVersionValue | undefined {
    if (isFieldVersion(oldVersion) && isFieldVersion(newVersion)) {
      const comparison = VersionTrackerUtils.compareVersions(oldVersion, newVersion);
      return comparison === "equal" ? undefined : newVersion;
    }

    if (isFieldVersion(newVersion) && !isFieldVersion(oldVersion)) {
      return newVersion;
    }

    if (isCollectionVersions(newVersion)) {
      const oldCollection = isCollectionVersions(oldVersion) ? oldVersion : undefined;
      const diffCollection: ICollectionVersions = { items: {} };
      let hasChanges = false;

      const oldDeletedKeys = new Set(Object.keys(oldCollection?.deleted || {}));
      const newDeletedKeys = new Set(Object.keys(newVersion.deleted || {}));
      if (!SetUtils.areEqual(oldDeletedKeys, newDeletedKeys)) {
        hasChanges = true;
      }
      diffCollection.deleted = { ...(oldCollection?.deleted || {}), ...(newVersion.deleted || {}) };
      for (const id in newVersion.items) {
        if (diffCollection.deleted && id in diffCollection.deleted) {
          continue;
        }
        const oldItemVersion = oldCollection?.items?.[id];
        const newItemVersion = newVersion.items[id];

        const itemDiff = this.diffFieldVersion(oldItemVersion, newItemVersion);
        if (itemDiff != null && !isCollectionVersions(itemDiff)) {
          diffCollection.items = diffCollection.items || {};
          diffCollection.items[id] = itemDiff;
          hasChanges = true;
        }
      }

      return hasChanges ? diffCollection : undefined;
    }

    if (isVersionsObject(newVersion)) {
      const oldObj = isVersionsObject(oldVersion) ? oldVersion : undefined;
      const diffObj: IVersionsObject = {};
      let hasChanges = false;

      for (const key of Object.keys(newVersion)) {
        const fieldDiff = this.diffFieldVersion(oldObj?.[key], newVersion[key]);
        if (fieldDiff != null) {
          diffObj[key] = fieldDiff;
          hasChanges = true;
        }
      }

      return hasChanges ? diffObj : undefined;
    }

    return undefined;
  }
}
