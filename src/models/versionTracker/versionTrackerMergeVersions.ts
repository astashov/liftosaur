import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  IVersionsObject,
  IVersionValue,
  IVersions,
  ICollectionVersions,
  isFieldVersion,
  isCollectionVersions,
  isVersionsObject,
  isIdVersion,
  IIdVersion,
} from "./types";
import { VersionTrackerUtils } from "./utils";

export class VersionTrackerMergeVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>) {
    this.versionTypes = versionTypes;
  }

  public run<T>(fullVersions: IVersions<T>, versionDiff: IVersions<T>): IVersions<T> {
    const result = ObjectUtils.clone(fullVersions);
    const resultObj = VersionTrackerUtils.asVersionsObject(result);
    const diffObj = VersionTrackerUtils.asVersionsObject(versionDiff);

    for (const key in diffObj) {
      const fullVersion = resultObj[key];
      const diffVersion = diffObj[key];

      const mergedVersion = this.mergeVersionField(fullVersion, diffVersion, key);
      if (mergedVersion !== undefined) {
        resultObj[key] = mergedVersion;
      }
    }

    return result;
  }

  public mergeVersionField(
    fullVersion: IVersionValue | undefined,
    diffVersion: IVersionValue | undefined,
    path: string = ""
  ): IVersionValue | undefined {
    if (diffVersion === undefined) {
      return fullVersion;
    }

    if (isFieldVersion(fullVersion) && isFieldVersion(diffVersion)) {
      const newVersion = VersionTrackerUtils.mergeFieldVersions(fullVersion, diffVersion);
      return newVersion;
    }

    if (isFieldVersion(diffVersion)) {
      return diffVersion;
    }

    if (isCollectionVersions(diffVersion)) {
      const fullCollection = isCollectionVersions(fullVersion) ? fullVersion : undefined;
      return this.mergeCollectionVersions(fullCollection, diffVersion, path);
    }

    if (isVersionsObject(diffVersion)) {
      const fullObj = VersionTrackerUtils.ensureVersionsObject(fullVersion);

      // Check if both have ID versions (controlled types with different identities)
      const fullIdVersion = this.findIdVersion(fullObj);
      const diffIdVersion = this.findIdVersion(diffVersion);

      if (fullIdVersion && diffIdVersion && fullIdVersion.value !== diffIdVersion.value) {
        // Different controlled objects - pick winner by timestamp
        const winner = VersionTrackerUtils.pickWinningIdVersion(fullIdVersion, diffIdVersion);
        if (winner === diffIdVersion) {
          // diff wins - use diff versions entirely
          return diffVersion;
        } else {
          // full wins - keep full versions
          return fullObj;
        }
      }

      const result: IVersionsObject = { ...fullObj };

      for (const key in diffVersion) {
        const mergedField = this.mergeVersionField(fullObj[key], diffVersion[key], path ? `${path}.${key}` : key);
        if (mergedField !== undefined) {
          result[key] = mergedField;
        }
      }

      return result;
    }

    return diffVersion;
  }

  private findIdVersion(versions: IVersionsObject): IIdVersion | undefined {
    for (const key in versions) {
      const value = versions[key];
      if (isIdVersion(value)) {
        return value;
      }
    }
    return undefined;
  }

  private mergeCollectionVersions(
    fullCollection: ICollectionVersions | undefined,
    diffCollection: ICollectionVersions,
    path?: string
  ): ICollectionVersions {
    const nukedeleted =
      diffCollection.nukedeleted != null || fullCollection?.nukedeleted != null
        ? Math.max(diffCollection.nukedeleted || 0, fullCollection?.nukedeleted || 0)
        : undefined;
    const result: ICollectionVersions = {
      items: { ...(fullCollection?.items || {}) },
      deleted: nukedeleted != null ? {} : { ...(fullCollection?.deleted || {}), ...(diffCollection?.deleted || {}) },
      ...(nukedeleted != null && nukedeleted < VersionTrackerUtils.NUKEDELETED_THRESHOLD
        ? { nukedeleted: nukedeleted + 1 }
        : {}),
    };

    for (const id in diffCollection.items) {
      const fullItemVersion = result.items?.[id];
      const diffItemVersion = diffCollection.items[id];

      const mergedItemVersion = this.mergeVersionField(fullItemVersion, diffItemVersion);
      if (mergedItemVersion !== undefined && !isCollectionVersions(mergedItemVersion)) {
        result.items = result.items || {};
        result.items[id] = mergedItemVersion;
      }
    }

    const threshold =
      path && this.versionTypes.compactionThresholds ? this.versionTypes.compactionThresholds[path] : undefined;
    const currentTimestamp = Date.now();

    for (const key of ObjectUtils.keys(result.deleted || {})) {
      if (result.items) {
        delete result.items[key];
      }
      const fullDeletedTime = fullCollection?.deleted?.[key];
      const diffDeletedTime = diffCollection?.deleted?.[key];
      const max = (diffDeletedTime ?? 0) > (fullDeletedTime ?? 0) ? diffDeletedTime : fullDeletedTime;

      if (max != null) {
        if (!threshold || currentTimestamp - max < threshold) {
          result.deleted![key] = max;
        } else {
          delete result.deleted![key];
        }
      }
    }

    return result;
  }
}
