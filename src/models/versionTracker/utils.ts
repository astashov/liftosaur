import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  ITypedObject,
  IFieldVersion,
  IVectorClock,
  IVersionsObject,
  IVersionValue,
  IVersions,
  ICollectionVersions,
  isVectorClock,
  isCollectionVersions,
  isVersionsObject,
} from "./types";

export class VersionTrackerUtils {
  public static readonly NUKEDELETED_THRESHOLD = 3;

  public static isAtomicType<TAtomicType extends string, TControlledType extends string>(
    value: unknown,
    versionTypes: IVersionTypes<TAtomicType, TControlledType>
  ): value is ITypedObject<TAtomicType> {
    return VersionTrackerUtils.isTypedObject(value) && versionTypes.atomicTypes.includes(value.vtype as TAtomicType);
  }

  public static isControlledType<TAtomicType extends string, TControlledType extends string>(
    value: unknown,
    versionTypes: IVersionTypes<TAtomicType, TControlledType>
  ): value is ITypedObject<TControlledType> {
    return (
      VersionTrackerUtils.isTypedObject(value) && versionTypes.controlledTypes.includes(value.vtype as TControlledType)
    );
  }

  public static isTypedObject(value: unknown): value is ITypedObject {
    return typeof value === "object" && value !== null && "vtype" in value && typeof value.vtype === "string";
  }

  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  public static areEqual(a: unknown, b: unknown): boolean {
    return ObjectUtils.isEqual(a as Record<string, unknown>, b as Record<string, unknown>);
  }

  public static getId<TAtomicType extends string, TControlledType extends string>(
    obj: unknown,
    versionTypes: IVersionTypes<TAtomicType, TControlledType>
  ): string | undefined {
    if (!VersionTrackerUtils.isTypedObject(obj)) {
      return undefined;
    }
    const idField = versionTypes.typeIdMapping[obj.vtype as TAtomicType | TControlledType];
    if (!idField || !(idField in obj)) {
      return undefined;
    }
    const id = obj[idField];
    return id != null ? String(id) : undefined;
  }

  public static asVersionsObject<T>(versions: IVersions<T>): IVersionsObject {
    return versions as IVersionsObject;
  }

  public static ensureVersionsObject(version: IVersionValue | undefined): IVersionsObject {
    if (isVersionsObject(version)) {
      return version;
    }
    return {};
  }

  public static ensureCollectionVersions(version: IVersionValue | undefined): ICollectionVersions {
    if (isCollectionVersions(version)) {
      return version;
    }
    return { items: {}, deleted: {} };
  }

  public static createVersion(
    timestamp: number,
    currentVersion: IFieldVersion | undefined,
    deviceId?: string
  ): IFieldVersion {
    if (!deviceId) {
      return timestamp;
    }

    const current = VersionTrackerUtils.normalizeVersion(currentVersion);
    const newClock = { ...current.vc };
    newClock[deviceId] = (newClock[deviceId] || 0) + 1;

    return {
      vc: newClock,
      t: timestamp,
    };
  }

  public static normalizeVersion(version?: IFieldVersion): IVectorClock {
    if (!version) {
      return { vc: {}, t: 0 };
    }
    if (isVectorClock(version)) {
      return version;
    }
    return { vc: {}, t: version };
  }

  public static compareVersions(a: IFieldVersion, b: IFieldVersion): "a_newer" | "b_newer" | "concurrent" | "equal" {
    const aNorm = VersionTrackerUtils.normalizeVersion(a);
    const bNorm = VersionTrackerUtils.normalizeVersion(b);

    const aDevices = Object.keys(aNorm.vc);
    const bDevices = Object.keys(bNorm.vc);
    const aHasVc = aDevices.length > 0;
    const bHasVc = bDevices.length > 0;

    if (aHasVc !== bHasVc) {
      if (aNorm.t === bNorm.t) {
        return "equal";
      }
      return aNorm.t > bNorm.t ? "a_newer" : "b_newer";
    }

    if (!aHasVc && !bHasVc) {
      if (aNorm.t === bNorm.t) {
        return "equal";
      }
      return aNorm.t > bNorm.t ? "a_newer" : "b_newer";
    }

    const allDevices = new Set([...aDevices, ...bDevices]);
    let aHasHigher = false;
    let bHasHigher = false;

    for (const deviceId of allDevices) {
      const aCount = aNorm.vc[deviceId] || 0;
      const bCount = bNorm.vc[deviceId] || 0;

      if (aCount > bCount) {
        aHasHigher = true;
      }
      if (bCount > aCount) {
        bHasHigher = true;
      }
    }

    if (!aHasHigher && !bHasHigher) {
      return "equal";
    }
    if (aHasHigher && !bHasHigher) {
      return "a_newer";
    }
    if (bHasHigher && !aHasHigher) {
      return "b_newer";
    }
    return "concurrent";
  }

  public static mergeFieldVersions(a: IFieldVersion, b: IFieldVersion): IFieldVersion {
    const comparison = VersionTrackerUtils.compareVersions(a, b);
    if (comparison === "a_newer") {
      return a;
    }
    if (comparison === "b_newer") {
      return b;
    }
    if (comparison === "equal") {
      return a;
    }

    const aNorm = VersionTrackerUtils.normalizeVersion(a);
    const bNorm = VersionTrackerUtils.normalizeVersion(b);

    const allDevices = new Set([...Object.keys(aNorm.vc), ...Object.keys(bNorm.vc)]);
    const mergedVc: { [deviceId: string]: number } = {};

    for (const deviceId of allDevices) {
      mergedVc[deviceId] = Math.max(aNorm.vc[deviceId] || 0, bNorm.vc[deviceId] || 0);
    }

    return {
      vc: mergedVc,
      t: Math.max(aNorm.t, bNorm.t),
    };
  }

  public static incrementNukedeleted(collection: ICollectionVersions): ICollectionVersions {
    if (collection.nukedeleted == null) {
      return collection;
    }
    const next = collection.nukedeleted + 1;
    if (next > VersionTrackerUtils.NUKEDELETED_THRESHOLD) {
      const { nukedeleted, ...rest } = collection;
      return rest;
    }
    return { ...collection, nukedeleted: next };
  }

  public static applyCompaction<TAtomicType extends string, TControlledType extends string>(
    collection: ICollectionVersions,
    path: string,
    currentTimestamp: number,
    versionTypes: IVersionTypes<TAtomicType, TControlledType>
  ): ICollectionVersions {
    const threshold = path && versionTypes.compactionThresholds ? versionTypes.compactionThresholds[path] : undefined;

    if (!threshold || !collection.deleted || Object.keys(collection.deleted).length === 0) {
      return collection;
    }

    const result: ICollectionVersions = {
      items: collection.items,
      deleted: {},
    };

    for (const [key, deletionTimestamp] of Object.entries(collection.deleted)) {
      if (currentTimestamp - deletionTimestamp < threshold) {
        result.deleted![key] = deletionTimestamp;
      }
    }

    return result;
  }
}
