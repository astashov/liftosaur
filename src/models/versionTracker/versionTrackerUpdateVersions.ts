import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  ITypedObject,
  IFieldVersion,
  IVersionsObject,
  IVersionValue,
  IVersions,
  ICollectionVersions,
  isFieldVersion,
  isCollectionVersions,
} from "./types";
import { VersionTrackerUtils } from "./utils";
import { VersionTrackerMergeVersions } from "./versionTrackerMergeVersions";

export class VersionTrackerUpdateVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;
  private readonly deviceId?: string;
  private readonly mergeVersions: VersionTrackerMergeVersions<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>, deviceId?: string) {
    this.versionTypes = versionTypes;
    this.deviceId = deviceId;
    this.mergeVersions = new VersionTrackerMergeVersions(versionTypes);
  }

  public run<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    newVersions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    const versions = ObjectUtils.clone(currentVersions);
    const versionsObj = VersionTrackerUtils.asVersionsObject(versions);
    const newVersionsObj = VersionTrackerUtils.asVersionsObject(newVersions);

    const keys = ObjectUtils.keys(newObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const oldValue = oldObj[field];
      const newValue = newObj[field];

      if (VersionTrackerUtils.areEqual(oldValue, newValue)) {
        continue;
      }

      const fieldStr = field as string;
      const updatedVersion = this.updateFieldVersion(
        oldObj,
        newObj,
        currentVersions,
        newVersions,
        oldValue,
        newValue,
        versionsObj[fieldStr],
        newVersionsObj[fieldStr],
        timestamp,
        fieldStr
      );
      if (updatedVersion !== undefined) {
        versionsObj[fieldStr] = updatedVersion;
      }
    }

    return versions;
  }

  private updateFieldVersion(
    oldFull: unknown,
    newFull: unknown,
    oldFullVersion: unknown,
    newFullVersion: unknown,
    oldValue: unknown,
    newValue: unknown,
    currentVersion: IVersionValue | undefined,
    newVersion: IVersionValue | undefined,
    timestamp: number,
    path: string
  ): IVersionValue | undefined {
    if (Array.isArray(newValue)) {
      const hasTrackableItems = newValue.some(
        (item) => VersionTrackerUtils.getId(item, this.versionTypes) !== undefined
      );
      const oldHasTrackableItems =
        Array.isArray(oldValue) &&
        oldValue.some((item: unknown) => VersionTrackerUtils.getId(item, this.versionTypes) !== undefined);

      if (hasTrackableItems || oldHasTrackableItems) {
        return this.updateArrayCollectionVersion(oldValue, newValue, currentVersion, newVersion, timestamp, path);
      } else {
        const mergedVersion = this.mergeVersions.mergeVersionField(currentVersion, newVersion, path);
        const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
        return VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
      }
    } else if (typeof newValue === "object" && newValue !== null) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        return this.updateDictionaryCollectionVersion(
          oldValue,
          newValue as Record<string, unknown>,
          currentVersion,
          newVersion,
          timestamp,
          path
        );
      } else if (VersionTrackerUtils.isControlledType(newValue, this.versionTypes)) {
        const mergedVersion = this.mergeVersions.mergeVersionField(currentVersion, newVersion, path);
        return this.updateControlledObjectVersion(oldValue, newValue, mergedVersion, timestamp);
      } else if (VersionTrackerUtils.isAtomicType(newValue, this.versionTypes)) {
        const mergedVersion = this.mergeVersions.mergeVersionField(currentVersion, newVersion, path);
        const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
        return VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
      } else {
        const oldObjValue = VersionTrackerUtils.isRecord(oldValue) ? oldValue : undefined;
        const nestedVersions = this.updateNestedVersions(
          oldFull,
          newFull,
          oldFullVersion,
          newFullVersion,
          oldObjValue,
          newValue as Record<string, unknown>,
          VersionTrackerUtils.ensureVersionsObject(currentVersion),
          VersionTrackerUtils.ensureVersionsObject(newVersion),
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      const mergedVersion = this.mergeVersions.mergeVersionField(currentVersion, newVersion, path);
      const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
      return VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
    }
  }

  private updateArrayCollectionVersion(
    oldValue: unknown,
    newValue: unknown[],
    currentVersion: IVersionValue | undefined,
    newVersion: IVersionValue | undefined,
    timestamp: number,
    path: string
  ): ICollectionVersions | undefined {
    const collectionVersions = VersionTrackerUtils.incrementNukedeleted(
      VersionTrackerUtils.ensureCollectionVersions(currentVersion)
    );
    const items = collectionVersions.items || {};

    if (Array.isArray(oldValue)) {
      for (const oldItem of oldValue) {
        const oldItemId = VersionTrackerUtils.getId(oldItem, this.versionTypes);
        if (oldItemId && !newValue.some((item) => VersionTrackerUtils.getId(item, this.versionTypes) === oldItemId)) {
          collectionVersions.deleted = collectionVersions.deleted || {};
          collectionVersions.deleted[oldItemId] = timestamp;
          delete items[oldItemId];
        }
      }
    }

    for (const item of newValue) {
      const itemId = VersionTrackerUtils.getId(item, this.versionTypes);
      if (itemId) {
        const oldItem = Array.isArray(oldValue)
          ? oldValue.find((o: unknown) => VersionTrackerUtils.getId(o, this.versionTypes) === itemId)
          : undefined;

        if (!VersionTrackerUtils.areEqual(oldItem, item)) {
          const newCollectionVersion = isCollectionVersions(newVersion) ? newVersion : undefined;
          const newItemVersion = newCollectionVersion?.items?.[itemId];
          const mergedItemVersion = this.mergeVersions.mergeVersionField(
            items[itemId],
            newItemVersion,
            `${path}.items.${itemId}`
          );

          const itemVersion = this.getItemVersion(oldItem, item, mergedItemVersion, timestamp);
          if (itemVersion !== undefined) {
            items[itemId] = itemVersion;
          }
        }

        if (collectionVersions.deleted && itemId in collectionVersions.deleted) {
          delete collectionVersions.deleted[itemId];
        }
      }
    }

    const hasChanges =
      Object.keys(items).length > 0 ||
      (collectionVersions.deleted && Object.keys(collectionVersions.deleted).length > 0);

    const compactedCollection = VersionTrackerUtils.applyCompaction(
      collectionVersions,
      path,
      timestamp,
      this.versionTypes
    );
    return hasChanges || currentVersion ? compactedCollection : undefined;
  }

  private updateDictionaryCollectionVersion(
    oldValue: unknown,
    newValue: Record<string, unknown>,
    currentVersion: IVersionValue | undefined,
    newVersion: IVersionValue | undefined,
    timestamp: number,
    path: string
  ): ICollectionVersions | undefined {
    const collectionVersions = VersionTrackerUtils.incrementNukedeleted(
      VersionTrackerUtils.ensureCollectionVersions(currentVersion)
    );
    const items = collectionVersions.items || {};

    const oldDict = VersionTrackerUtils.isRecord(oldValue) ? oldValue : undefined;

    if (oldDict) {
      for (const key of ObjectUtils.keys(oldDict)) {
        if (!(key in newValue)) {
          collectionVersions.deleted = collectionVersions.deleted || {};
          collectionVersions.deleted[key] = timestamp;
          delete items[key];
        }
      }
    }

    for (const [key, item] of Object.entries(newValue)) {
      const oldItem = oldDict?.[key];
      if (oldItem !== item) {
        const newCollectionVersion = isCollectionVersions(newVersion) ? newVersion : undefined;
        const newItemVersion = newCollectionVersion?.items?.[key];
        const mergedItemVersion = this.mergeVersions.mergeVersionField(
          items[key],
          newItemVersion,
          `${path}.items.${key}`
        );

        const itemVersion = this.getItemVersion(oldItem, item, mergedItemVersion, timestamp);
        if (itemVersion !== undefined) {
          items[key] = itemVersion;
        }
      }

      if (collectionVersions.deleted && key in collectionVersions.deleted) {
        delete collectionVersions.deleted[key];
      }
    }

    const hasChanges =
      Object.keys(items).length > 0 ||
      (collectionVersions.deleted && Object.keys(collectionVersions.deleted).length > 0);

    const compactedCollection = VersionTrackerUtils.applyCompaction(
      collectionVersions,
      path,
      timestamp,
      this.versionTypes
    );
    return hasChanges || currentVersion ? compactedCollection : undefined;
  }

  private getItemVersion(
    oldItem: unknown,
    newItem: unknown,
    currentItemVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | IFieldVersion | undefined {
    if (VersionTrackerUtils.isAtomicType(newItem, this.versionTypes)) {
      const fieldVersion = isFieldVersion(currentItemVersion) ? currentItemVersion : undefined;
      return VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
    } else if (VersionTrackerUtils.isControlledType(newItem, this.versionTypes)) {
      return this.updateControlledObjectVersion(oldItem, newItem, currentItemVersion, timestamp);
    } else {
      const fieldVersion = isFieldVersion(currentItemVersion) ? currentItemVersion : undefined;
      return VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
    }
  }

  private updateControlledObjectVersion(
    oldValue: unknown,
    newValue: ITypedObject<TControlledType>,
    currentVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | undefined {
    const controlledFields = this.versionTypes.controlledFields[newValue.vtype] || [];
    const fieldVersions: IVersionsObject = VersionTrackerUtils.ensureVersionsObject(currentVersion);
    let hasChanges = false;

    for (const controlledField of controlledFields) {
      const oldFieldValue =
        VersionTrackerUtils.isRecord(oldValue) && controlledField in oldValue ? oldValue[controlledField] : undefined;
      const newFieldValue = newValue[controlledField];

      if (!VersionTrackerUtils.areEqual(oldFieldValue, newFieldValue) && newFieldValue != null) {
        const currentFieldVersion = fieldVersions[controlledField];
        const fieldVersion = isFieldVersion(currentFieldVersion) ? currentFieldVersion : undefined;
        fieldVersions[controlledField] = VersionTrackerUtils.createVersion(timestamp, fieldVersion, this.deviceId);
        hasChanges = true;
      }
    }

    return hasChanges || Object.keys(fieldVersions).length > 0 ? fieldVersions : undefined;
  }

  private updateNestedVersions(
    oldFull: unknown,
    newFull: unknown,
    oldFullVersion: unknown,
    newFullVersion: unknown,
    oldObj: Record<string, unknown> | undefined,
    newObj: Record<string, unknown>,
    currentVersions: IVersionsObject,
    newVersions: IVersionsObject,
    timestamp: number,
    parentPath: string
  ): IVersionsObject | undefined {
    const versions: IVersionsObject = { ...currentVersions };
    const keys = ObjectUtils.keys(newObj);
    let hasChanges = false;

    for (const key of keys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj[key];
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (VersionTrackerUtils.areEqual(oldValue, newValue)) {
        continue;
      }

      if (oldValue == null && newValue != null) {
        const updatedVersion = this.updateFieldVersion(
          oldFull,
          newFull,
          oldFullVersion,
          newFullVersion,
          undefined,
          newValue,
          versions[key],
          newVersions[key],
          timestamp,
          currentPath
        );
        if (updatedVersion !== undefined) {
          versions[key] = updatedVersion;
          hasChanges = true;
        }
      } else if (oldValue != null) {
        const updatedVersion = this.updateFieldVersion(
          oldFull,
          newFull,
          oldFullVersion,
          newFullVersion,
          oldValue,
          newValue,
          versions[key],
          newVersions[key],
          timestamp,
          currentPath
        );
        if (updatedVersion !== undefined) {
          versions[key] = updatedVersion;
          hasChanges = true;
        }
      }
    }

    return hasChanges || Object.keys(currentVersions).length > 0 ? versions : undefined;
  }
}
