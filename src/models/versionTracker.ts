/**
 * VersionTracker - A field-level version tracking system for JavaScript objects
 *
 * This module provides a generic, configurable version tracking system that records
 * timestamps for individual field changes within complex object hierarchies. It's
 * designed to support conflict resolution in distributed systems where multiple
 * clients may modify the same data offline.
 *
 * ## Core Concepts:
 *
 * ### 1. Atomic Objects
 * Objects that are versioned as a single unit. When any property of an atomic
 * object changes, the entire object gets a single version timestamp. This is
 * useful for objects that should be treated as indivisible units.
 *
 * Example: A "history_record" might be atomic because all its fields (date,
 * exercises, sets) should be synced together as one cohesive workout session.
 *
 * ### 2. Controlled Objects
 * Objects where only specific fields are versioned. This allows fine-grained
 * control over which properties trigger version updates. Useful for objects
 * where some fields are critical for sync while others are local-only or
 * computed.
 *
 * Example: A "program" might have controlled fields like "name" and "nextDay"
 * that need versioning, while fields like "description" might not need tracking.
 *
 * ### 3. Regular Objects
 * Objects that aren't atomic or controlled have each field versioned
 * independently. This provides maximum granularity for conflict resolution.
 *
 * ### 4. Collections (Arrays and Dictionaries)
 * Arrays and dictionary objects containing items with IDs are treated specially.
 * The tracker maintains an "items" map (ID -> version) and a "deleted" map
 * (ID -> deletion timestamp) to handle additions, updates, and deletions.
 *
 * ## How It Works:
 *
 * 1. **Initialization**: Create a VersionTracker with configuration specifying
 *    atomic types, controlled types, their ID fields, and dictionary paths.
 *
 * 2. **Version Tracking**: Call updateVersions() with old and new objects to
 *    generate a version tree that mirrors the object structure but contains
 *    timestamps instead of values.
 *
 * 3. **Conflict Resolution**: Use the version tree to merge changes from
 *    multiple sources by comparing timestamps - newer timestamps win.
 *
 * ## Usage Example:
 *
 * ```typescript
 * // Define your configuration
 * const config: IVersionTypes<MyAtomicType, MyControlledType> = {
 *   atomicTypes: ["history_record", "user_preference"],
 *   controlledTypes: ["program", "exercise"],
 *   typeIdMapping: {
 *     "history_record": "id",
 *     "program": "id",
 *     "exercise": "name"
 *   },
 *   controlledFields: {
 *     "program": ["name", "nextDay"],
 *     "exercise": ["sets", "reps"]
 *   },
 *   dictionaryFields: ["settings.exercises", "users.preferences"]
 * };
 *
 * // Create tracker instance
 * const tracker = new VersionTracker(config);
 *
 * // Track changes
 * const oldState = { name: "John", age: 30, settings: { theme: "dark" } };
 * const newState = { name: "John", age: 31, settings: { theme: "light" } };
 * const versions = tracker.updateVersions(oldState, newState, {}, Date.now());
 * // Result: { age: 1234567890, settings: { theme: 1234567890 } }
 * ```
 */
import { ObjectUtils } from "../utils/object";
import { SetUtils } from "../utils/setUtils";

export interface IVectorClock {
  vc: { [deviceId: string]: number };
  t: number;
}

export type IFieldVersion = number | IVectorClock;

function isVectorClock(v: unknown): v is IVectorClock {
  return typeof v === "object" && v !== null && "vc" in v && "t" in v;
}

function isFieldVersion(v: unknown): v is IFieldVersion {
  return typeof v === "number" || isVectorClock(v);
}

function isCollectionVersions(v: unknown): v is ICollectionVersions {
  return v !== null && typeof v === "object" && ("items" in v || "deleted" in v);
}

function isVersionsObject(v: unknown): v is IVersionsObject {
  return v !== null && typeof v === "object" && !isCollectionVersions(v) && !isFieldVersion(v);
}

export interface IVersionsObject {
  [key: string]: IVersionValue | undefined;
}

export type IVersionValue = IFieldVersion | IVersionsObject | ICollectionVersions;

export type IVersions<T> = {
  [K in keyof T & string]?: IVersionValue;
};

export interface ICollectionVersions {
  items?: Record<string, IVersionsObject | IFieldVersion>;
  deleted?: Record<string, number>;
  nukedeleted?: number;
}

export type ITypedObject<T extends string = string> = { vtype: T } & Record<string, unknown>;

export interface IVersionTypes<TAtomicType extends string, TControlledType extends string> {
  atomicTypes: readonly TAtomicType[];
  controlledTypes: readonly TControlledType[];
  typeIdMapping: Record<TAtomicType | TControlledType, string>;
  controlledFields: Record<TControlledType, readonly string[]>;
  dictionaryFields: readonly string[];
  compactionThresholds?: Record<string, number>; // path -> threshold in ms
}

export class VersionTracker<TAtomicType extends string, TControlledType extends string> {
  private static readonly NUKEDELETED_THRESHOLD = 3;

  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;
  private readonly deviceId?: string;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>, options?: { deviceId?: string }) {
    this.versionTypes = versionTypes;
    this.deviceId = options?.deviceId;
  }

  private isAtomicType(value: unknown): value is ITypedObject<TAtomicType> {
    return this.isTypedObject(value) && this.versionTypes.atomicTypes.includes(value.vtype as TAtomicType);
  }

  private isControlledType(value: unknown): value is ITypedObject<TControlledType> {
    return this.isTypedObject(value) && this.versionTypes.controlledTypes.includes(value.vtype as TControlledType);
  }

  private isTypedObject(value: unknown): value is ITypedObject {
    return typeof value === "object" && value !== null && "vtype" in value && typeof value.vtype === "string";
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private areEqual(a: unknown, b: unknown): boolean {
    return ObjectUtils.isEqual(a as Record<string, unknown>, b as Record<string, unknown>);
  }

  private getId(obj: unknown): string | undefined {
    if (!this.isTypedObject(obj)) {
      return undefined;
    }
    const idField = this.versionTypes.typeIdMapping[obj.vtype as TAtomicType | TControlledType];
    if (!idField || !(idField in obj)) {
      return undefined;
    }
    const id = obj[idField];
    return id != null ? String(id) : undefined;
  }

  private asVersionsObject<T>(versions: IVersions<T>): IVersionsObject {
    return versions as IVersionsObject;
  }

  private ensureVersionsObject(version: IVersionValue | undefined): IVersionsObject {
    if (isVersionsObject(version)) {
      return version;
    }
    return {};
  }

  private createVersion(timestamp: number, currentVersion?: IFieldVersion): IFieldVersion {
    if (!this.deviceId) {
      return timestamp;
    }

    const current = this.normalizeVersion(currentVersion);
    const newClock = { ...current.vc };
    newClock[this.deviceId] = (newClock[this.deviceId] || 0) + 1;

    return {
      vc: newClock,
      t: timestamp,
    };
  }

  private normalizeVersion(version?: IFieldVersion): IVectorClock {
    if (!version) {
      return { vc: {}, t: 0 };
    }
    if (isVectorClock(version)) {
      return version;
    }
    return { vc: {}, t: version };
  }

  private compareVersions(a: IFieldVersion, b: IFieldVersion): "a_newer" | "b_newer" | "concurrent" | "equal" {
    const aNorm = this.normalizeVersion(a);
    const bNorm = this.normalizeVersion(b);

    const aDevices = Object.keys(aNorm.vc);
    const bDevices = Object.keys(bNorm.vc);
    const aHasVc = aDevices.length > 0;
    const bHasVc = bDevices.length > 0;

    // Mixed case: one has vector clock, one has plain timestamp
    // Can't determine causality, so fall back to timestamp comparison
    if (aHasVc !== bHasVc) {
      if (aNorm.t === bNorm.t) {
        return "equal";
      }
      return aNorm.t > bNorm.t ? "a_newer" : "b_newer";
    }

    // Both are plain timestamps
    if (!aHasVc && !bHasVc) {
      if (aNorm.t === bNorm.t) {
        return "equal";
      }
      return aNorm.t > bNorm.t ? "a_newer" : "b_newer";
    }

    // Both have vector clocks - compare causality
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

  private mergeFieldVersions(path: string, a: IFieldVersion, b: IFieldVersion): IFieldVersion {
    const comparison = this.compareVersions(a, b);
    if (comparison === "a_newer") {
      return a;
    }
    if (comparison === "b_newer") {
      return b;
    }
    if (comparison === "equal") {
      return a;
    }

    // Concurrent changes - merge vector clocks by taking MAX of each device's counter
    const aNorm = this.normalizeVersion(a);
    const bNorm = this.normalizeVersion(b);

    const allDevices = new Set([...Object.keys(aNorm.vc), ...Object.keys(bNorm.vc)]);
    const mergedVc: { [deviceId: string]: number } = {};

    for (const deviceId of allDevices) {
      mergedVc[deviceId] = Math.max(aNorm.vc[deviceId] || 0, bNorm.vc[deviceId] || 0);
    }

    const result = {
      vc: mergedVc,
      t: Math.max(aNorm.t, bNorm.t),
    };
    return result;
  }

  private ensureCollectionVersions(version: IVersionValue | undefined): ICollectionVersions {
    if (isCollectionVersions(version)) {
      return version;
    }
    return { items: {}, deleted: {} };
  }

  private incrementNukedeleted(collection: ICollectionVersions): ICollectionVersions {
    if (collection.nukedeleted == null) {
      return collection;
    }
    const next = collection.nukedeleted + 1;
    if (next > VersionTracker.NUKEDELETED_THRESHOLD) {
      const { nukedeleted, ...rest } = collection;
      return rest;
    }
    return { ...collection, nukedeleted: next };
  }

  /**
   * Compares old and new objects and updates the version tree to reflect changes.
   * For each changed field, creates a new version timestamp. Handles atomic types
   * (versioned as a whole), controlled types (only specific fields versioned),
   * collections (arrays/dictionaries with item-level tracking), and nested objects.
   *
   * @param oldObj The previous state of the object
   * @param newObj The new state of the object
   * @param currentVersions The existing version tree to update
   * @param newVersions Incoming versions from another source (used to preserve vector clocks during merges)
   * @param timestamp The timestamp to assign to changed fields
   * @returns Updated version tree reflecting all changes
   */
  public updateVersions<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    newVersions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    const versions = ObjectUtils.clone(currentVersions);
    const versionsObj = this.asVersionsObject(versions);
    const newVersionsObj = this.asVersionsObject(newVersions);

    const keys = ObjectUtils.keys(newObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const oldValue = oldObj[field];
      const newValue = newObj[field];

      if (this.areEqual(oldValue, newValue)) {
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
      const hasTrackableItems = newValue.some((item) => this.getId(item) !== undefined);
      const oldHasTrackableItems =
        Array.isArray(oldValue) && oldValue.some((item: unknown) => this.getId(item) !== undefined);

      if (hasTrackableItems || oldHasTrackableItems) {
        return this.updateArrayCollectionVersion(oldValue, newValue, currentVersion, newVersion, timestamp, path);
      } else {
        const mergedVersion = this.mergeVersionField(currentVersion, newVersion, path);
        const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
        return this.createVersion(timestamp, fieldVersion);
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
      } else if (this.isControlledType(newValue)) {
        const mergedVersion = this.mergeVersionField(currentVersion, newVersion, path);
        return this.updateControlledObjectVersion(oldValue, newValue, mergedVersion, timestamp);
      } else if (this.isAtomicType(newValue)) {
        const mergedVersion = this.mergeVersionField(currentVersion, newVersion, path);
        const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
        return this.createVersion(timestamp, fieldVersion);
      } else {
        const oldObjValue = this.isRecord(oldValue) ? oldValue : undefined;
        const nestedVersions = this.updateNestedVersions(
          oldFull,
          newFull,
          oldFullVersion,
          newFullVersion,
          oldObjValue,
          newValue as Record<string, unknown>,
          this.ensureVersionsObject(currentVersion),
          this.ensureVersionsObject(newVersion),
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      const mergedVersion = this.mergeVersionField(currentVersion, newVersion, path);
      const fieldVersion = isFieldVersion(mergedVersion) ? mergedVersion : undefined;
      return this.createVersion(timestamp, fieldVersion);
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
    const collectionVersions = this.incrementNukedeleted(this.ensureCollectionVersions(currentVersion));
    const items = collectionVersions.items || {};

    if (Array.isArray(oldValue)) {
      for (const oldItem of oldValue) {
        const oldItemId = this.getId(oldItem);
        if (oldItemId && !newValue.some((item) => this.getId(item) === oldItemId)) {
          collectionVersions.deleted = collectionVersions.deleted || {};
          collectionVersions.deleted[oldItemId] = timestamp;
          delete items[oldItemId];
        }
      }
    }

    for (const item of newValue) {
      const itemId = this.getId(item);
      if (itemId) {
        const oldItem = Array.isArray(oldValue) ? oldValue.find((o: unknown) => this.getId(o) === itemId) : undefined;

        if (!this.areEqual(oldItem, item)) {
          const newCollectionVersion = isCollectionVersions(newVersion) ? newVersion : undefined;
          const newItemVersion = newCollectionVersion?.items?.[itemId];
          const mergedItemVersion = this.mergeVersionField(items[itemId], newItemVersion, `${path}.items.${itemId}`);

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

    const compactedCollection = this.applyCompaction(collectionVersions, path, timestamp);
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
    const collectionVersions = this.incrementNukedeleted(this.ensureCollectionVersions(currentVersion));
    const items = collectionVersions.items || {};

    const oldDict = this.isRecord(oldValue) ? oldValue : undefined;

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
        const mergedItemVersion = this.mergeVersionField(items[key], newItemVersion, `${path}.items.${key}`);

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

    const compactedCollection = this.applyCompaction(collectionVersions, path, timestamp);
    return hasChanges || currentVersion ? compactedCollection : undefined;
  }

  private getItemVersion(
    oldItem: unknown,
    newItem: unknown,
    currentItemVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | IFieldVersion | undefined {
    if (this.isAtomicType(newItem)) {
      const fieldVersion = isFieldVersion(currentItemVersion) ? currentItemVersion : undefined;
      return this.createVersion(timestamp, fieldVersion);
    } else if (this.isControlledType(newItem)) {
      return this.updateControlledObjectVersion(oldItem, newItem, currentItemVersion, timestamp);
    } else {
      const fieldVersion = isFieldVersion(currentItemVersion) ? currentItemVersion : undefined;
      return this.createVersion(timestamp, fieldVersion);
    }
  }

  private updateControlledObjectVersion(
    oldValue: unknown,
    newValue: ITypedObject<TControlledType>,
    currentVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | undefined {
    const controlledFields = this.versionTypes.controlledFields[newValue.vtype] || [];
    const fieldVersions: IVersionsObject = this.ensureVersionsObject(currentVersion);
    let hasChanges = false;

    for (const controlledField of controlledFields) {
      const oldFieldValue =
        this.isRecord(oldValue) && controlledField in oldValue ? oldValue[controlledField] : undefined;
      const newFieldValue = newValue[controlledField];

      if (!this.areEqual(oldFieldValue, newFieldValue) && newFieldValue != null) {
        const currentFieldVersion = fieldVersions[controlledField];
        const fieldVersion = isFieldVersion(currentFieldVersion) ? currentFieldVersion : undefined;
        fieldVersions[controlledField] = this.createVersion(timestamp, fieldVersion);
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

      if (this.areEqual(oldValue, newValue)) {
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

  /**
   * Creates an initial version tree from a full object, filling in missing timestamps
   * for any fields that exist in the object but don't have corresponding versions.
   *
   * @param fullObj The complete object to generate versions for
   * @param versions The existing version tree (may be incomplete)
   * @param timestamp The timestamp to use for missing versions
   * @returns A complete version tree with all fields versioned
   */
  public fillVersions<T extends Record<string, unknown>>(
    fullObj: T,
    versions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    const result = ObjectUtils.clone(versions);
    const resultObj = this.asVersionsObject(result);
    const keys = ObjectUtils.keys(fullObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const value = fullObj[field];

      if (value == null) {
        continue;
      }

      const fieldStr = field as string;
      const currentVersion = resultObj[fieldStr];
      const filledVersion = this.fillFieldVersion(value, currentVersion, timestamp, fieldStr);

      if (filledVersion !== undefined) {
        resultObj[fieldStr] = filledVersion;
      }
    }

    return result;
  }

  private fillFieldVersion(
    value: unknown,
    currentVersion: IVersionValue | undefined,
    timestamp: number,
    path: string
  ): IVersionValue | undefined {
    if (isFieldVersion(currentVersion)) {
      return currentVersion;
    }

    if (Array.isArray(value)) {
      const hasTrackableItems = value.some((item) => this.getId(item) !== undefined);

      if (hasTrackableItems) {
        const collectionVersions = this.ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };

        for (const item of value) {
          const itemId = this.getId(item);
          if (itemId && !(itemId in items)) {
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[itemId] = itemVersion;
            }
          } else if (itemId && items[itemId] && !isFieldVersion(items[itemId])) {
            if (this.isControlledType(item)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[itemId], timestamp);
              if (filledItemVersion !== undefined) {
                items[itemId] = filledItemVersion;
              }
            } else {
              const filledItemVersion = this.fillFieldVersion(item, items[itemId], timestamp, `${path}[${itemId}]`);
              if (filledItemVersion !== undefined && !isCollectionVersions(filledItemVersion)) {
                items[itemId] = filledItemVersion;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else {
        return currentVersion !== undefined ? currentVersion : this.createVersion(timestamp, undefined);
      }
    } else if (this.isRecord(value)) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        const collectionVersions = this.ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };
        const dictValue = value;

        for (const [key, item] of Object.entries(dictValue)) {
          if (!(key in items)) {
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[key] = itemVersion;
            }
          } else if (items[key] && !isFieldVersion(items[key])) {
            if (this.isControlledType(item)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[key], timestamp);
              if (filledItemVersion !== undefined) {
                items[key] = filledItemVersion;
              }
            } else {
              const filledItemVersion = this.fillFieldVersion(item, items[key], timestamp, `${path}.${key}`);
              if (filledItemVersion !== undefined && !isCollectionVersions(filledItemVersion)) {
                items[key] = filledItemVersion;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else if (this.isControlledType(value)) {
        return this.fillControlledObjectVersion(value, currentVersion, timestamp);
      } else if (this.isAtomicType(value)) {
        return currentVersion !== undefined ? currentVersion : timestamp;
      } else {
        const nestedVersions = this.fillNestedVersions(
          value,
          this.ensureVersionsObject(currentVersion),
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      // Primitive value - return timestamp if missing
      return currentVersion !== undefined ? currentVersion : this.createVersion(timestamp, undefined);
    }
  }

  private getInitialItemVersion(item: unknown, timestamp: number): IVersionsObject | IFieldVersion | undefined {
    if (this.isAtomicType(item)) {
      return this.createVersion(timestamp, undefined);
    } else if (this.isControlledType(item)) {
      return this.fillControlledObjectVersion(item, undefined, timestamp);
    } else if (this.isRecord(item)) {
      return this.fillNestedVersions(item, {}, timestamp, "");
    } else {
      return this.createVersion(timestamp, undefined);
    }
  }

  private fillControlledObjectVersion(
    value: ITypedObject<TControlledType>,
    currentVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | undefined {
    const controlledFields = this.versionTypes.controlledFields[value.vtype] || [];
    const fieldVersions = this.ensureVersionsObject(currentVersion);

    const result: IVersionsObject = { ...fieldVersions };
    if (Object.keys(result).length !== 0) {
      return fieldVersions;
    }

    for (const controlledField of controlledFields) {
      const fieldValue = value[controlledField];
      if (fieldValue != null && !(controlledField in result)) {
        result[controlledField] = this.createVersion(timestamp, undefined);
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private fillNestedVersions(
    obj: Record<string, unknown>,
    currentVersions: IVersionsObject,
    timestamp: number,
    parentPath: string
  ): IVersionsObject | undefined {
    const versions: IVersionsObject = { ...currentVersions };
    const keys = ObjectUtils.keys(obj);
    let hasAnyVersion = false;

    for (const key of keys) {
      const value = obj[key];
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (value != null) {
        const filledVersion = this.fillFieldVersion(value, versions[key], timestamp, currentPath);
        if (filledVersion !== undefined) {
          versions[key] = filledVersion;
          hasAnyVersion = true;
        }
      }
    }

    return hasAnyVersion ? versions : undefined;
  }

  /**
   * Compares two version trees and returns a new version tree containing only
   * the fields that have changed between them.
   *
   * @param oldVersions The previous version tree
   * @param newVersions The new version tree
   * @returns A version tree with only changed fields, or undefined if no changes
   */
  public diffVersions<T>(oldVersions: IVersions<T> | undefined, newVersions: IVersions<T>): IVersions<T> | undefined {
    const diff: IVersionsObject = {};
    const newVersionsObj = this.asVersionsObject(newVersions);
    const oldVersionsObj = oldVersions ? this.asVersionsObject(oldVersions) : undefined;
    let hasChanges = false;

    for (const key in newVersionsObj) {
      const oldVersion = oldVersionsObj?.[key];
      const newVersion = newVersionsObj[key];

      const fieldDiff = this.diffFieldVersion(oldVersion, newVersion);
      if (fieldDiff !== undefined) {
        diff[key] = fieldDiff;
        hasChanges = true;
      }
    }

    return hasChanges ? (diff as IVersions<T>) : undefined;
  }

  private diffFieldVersion(
    oldVersion: IVersionValue | undefined,
    newVersion: IVersionValue | undefined
  ): IVersionValue | undefined {
    if (isFieldVersion(oldVersion) && isFieldVersion(newVersion)) {
      const comparison = this.compareVersions(oldVersion, newVersion);
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
        if (itemDiff !== undefined && !isCollectionVersions(itemDiff)) {
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

      for (const key in newVersion) {
        const fieldDiff = this.diffFieldVersion(oldObj?.[key], newVersion[key]);
        if (fieldDiff !== undefined) {
          diffObj[key] = fieldDiff;
          hasChanges = true;
        }
      }

      return hasChanges ? diffObj : undefined;
    }

    return undefined;
  }

  /**
   * Extracts only the fields from an object that are present in the given
   * version tree. This is useful for creating update payloads that contain
   * only changed data.
   *
   * @param obj The object to extract fields from
   * @param versions The version tree indicating which fields to extract
   * @returns A partial object with only the fields present in versions
   */
  public extractByVersions<T extends Record<string, unknown>>(obj: T, versions: IVersions<T>): Partial<T> {
    const result: Record<string, unknown> = {};

    for (const key in versions) {
      const version = versions[key];
      const value = obj[key];

      if (value !== undefined) {
        const extractedValue = this.extractFieldByVersion(value, version, key);
        if (extractedValue !== undefined) {
          result[key] = extractedValue;
        }
      }
    }

    return result as Partial<T>;
  }

  private extractFieldByVersion(value: unknown, version: IVersionValue | undefined, path: string): unknown {
    if (isFieldVersion(version)) {
      return value;
    }

    if (isCollectionVersions(version)) {
      return this.extractCollectionByVersion(value, version);
    }

    if (isVersionsObject(version) && this.isRecord(value)) {
      if (this.isControlledType(value)) {
        const controlledFields = this.versionTypes.controlledFields[value.vtype] || [];

        const hasControlledFieldChange = controlledFields.some((field) => field in version);

        if (hasControlledFieldChange) {
          return value;
        }
        return undefined;
      }

      return this.extractByVersions(value, version);
    }

    return value;
  }

  private extractCollectionByVersion(value: unknown, collectionVersion: ICollectionVersions): unknown {
    if (Array.isArray(value)) {
      const hasChanges =
        Object.keys(collectionVersion.items || {}).length > 0 ||
        Object.keys(collectionVersion.deleted || {}).length > 0;

      if (hasChanges) {
        const result = value.filter((item) => {
          const itemId = this.getId(item);
          return itemId && itemId in (collectionVersion.items || {});
        });

        return result.length > 0 ? result : undefined;
      }
      return undefined;
    } else if (this.isRecord(value)) {
      const result: Record<string, unknown> = {};
      let hasChanges = false;

      for (const key in collectionVersion.items) {
        if (key in value) {
          const itemVersion = collectionVersion.items[key];
          const itemValue = value[key];

          if (typeof itemVersion === "object" && this.isRecord(itemValue)) {
            const extracted = this.extractFieldByVersion(itemValue, itemVersion, key);
            if (extracted !== undefined) {
              result[key] = extracted;
              hasChanges = true;
            }
          } else {
            result[key] = itemValue;
            hasChanges = true;
          }
        }
      }

      return hasChanges ? result : undefined;
    }

    return undefined;
  }

  /**
   * Merges changes from an extracted object into a full object based on version timestamps.
   * This is used for conflict resolution when syncing data from multiple sources.
   *
   * @param fullObj The complete object to merge changes into
   * @param fullVersions The complete version tree for the full object
   * @param versionDiff The version diff showing which fields have changed
   * @param extractedObj The partial object containing changed fields to merge
   * @returns A new object with changes merged based on version timestamps
   */
  public mergeByVersions<T extends Record<string, unknown>>(
    fullObj: T,
    fullVersions: IVersions<T>,
    versionDiff: IVersions<T>,
    extractedObj: Partial<T>
  ): T {
    const result: Record<string, unknown> = ObjectUtils.clone(fullObj);

    for (const key in versionDiff) {
      const diffVersion = versionDiff[key];
      const fullVersion = fullVersions[key];
      const extractedValue = extractedObj[key as keyof T];

      if (extractedValue !== undefined) {
        const mergedValue = this.mergeFieldByVersion(result[key], fullVersion, diffVersion, extractedValue, key);
        if (mergedValue !== undefined) {
          result[key] = mergedValue;
        }
      }
    }

    return result as T;
  }

  private mergeFieldByVersion(
    fullValue: unknown,
    fullVersion: IVersionValue | undefined,
    diffVersion: IVersionValue | undefined,
    extractedValue: unknown,
    path: string
  ): unknown {
    if (isFieldVersion(diffVersion) && isFieldVersion(fullVersion)) {
      const comparison = this.compareVersions(diffVersion, fullVersion);
      if (comparison === "a_newer" || comparison === "concurrent") {
        return extractedValue;
      }
      return fullValue;
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      if (isCollectionVersions(diffVersion)) {
        return this.mergeCollectionByVersion(fullValue, undefined, diffVersion, extractedValue);
      }

      if (this.isRecord(fullValue) && this.isRecord(extractedValue) && isVersionsObject(diffVersion)) {
        return this.mergeByVersions(fullValue, {}, diffVersion, extractedValue);
      }
      return extractedValue ?? fullValue;
    }

    if (isCollectionVersions(diffVersion)) {
      const fullCollection = isCollectionVersions(fullVersion) ? fullVersion : undefined;
      return this.mergeCollectionByVersion(fullValue, fullCollection, diffVersion, extractedValue);
    }

    if (isVersionsObject(diffVersion) && this.isRecord(extractedValue)) {
      if (this.isControlledType(extractedValue)) {
        const controlledFields = this.versionTypes.controlledFields[extractedValue.vtype] || [];

        const mergedItem: Record<string, unknown> = this.isRecord(fullValue) ? { ...fullValue } : {};
        const fullVersionObj = isVersionsObject(fullVersion) ? fullVersion : undefined;

        for (const field of controlledFields) {
          if (field in diffVersion) {
            const diffFieldVersion = diffVersion[field];
            const fullFieldVersion = fullVersionObj?.[field];

            if (isFieldVersion(diffFieldVersion)) {
              if (fullFieldVersion === undefined || !isFieldVersion(fullFieldVersion)) {
                mergedItem[field] = extractedValue[field];
              } else {
                const comparison = this.compareVersions(diffFieldVersion, fullFieldVersion);
                if (comparison === "a_newer" || comparison === "concurrent") {
                  mergedItem[field] = extractedValue[field];
                }
              }
            }
          }
        }

        return mergedItem;
      }

      if (this.isRecord(fullValue)) {
        const fullVersionObj = this.ensureVersionsObject(fullVersion);
        return this.mergeByVersions(fullValue, fullVersionObj, diffVersion, extractedValue);
      } else {
        return extractedValue ?? fullValue;
      }
    }

    return fullValue;
  }

  private mergeCollectionByVersion(
    fullValue: unknown,
    fullVersion: ICollectionVersions | undefined,
    diffVersion: ICollectionVersions,
    extractedValue: unknown
  ): unknown {
    const isNukeDeleted = diffVersion.nukedeleted != null || fullVersion?.nukedeleted != null;
    const deletedKeys = isNukeDeleted
      ? new Set()
      : new Set<string>([
          ...(fullVersion?.deleted ? Object.keys(fullVersion.deleted) : []),
          ...(diffVersion.deleted ? Object.keys(diffVersion.deleted) : []),
        ]);
    if (Array.isArray(fullValue) && Array.isArray(extractedValue)) {
      const result: unknown[] = [];
      const processedIds = new Set<string>();

      for (const extractedItem of extractedValue) {
        const itemId = this.getId(extractedItem);
        if (itemId && !deletedKeys.has(itemId)) {
          processedIds.add(itemId);
          const diffItemVersion = diffVersion?.items?.[itemId];
          const fullItemVersion = fullVersion?.items?.[itemId];
          const fullItem = fullValue.find((item) => this.getId(item) === itemId);

          if (
            isVersionsObject(diffItemVersion) &&
            isVersionsObject(fullItemVersion) &&
            fullItem &&
            typeof fullItem === "object" &&
            typeof extractedItem === "object"
          ) {
            const mergedItem = this.mergeFieldByVersion(
              fullItem,
              fullItemVersion,
              diffItemVersion,
              extractedItem,
              `item:${itemId}`
            );
            result.push(mergedItem);
          } else if (this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
            result.push(extractedItem);
          } else {
            if (fullItem) {
              result.push(fullItem);
            } else {
              result.push(extractedItem);
            }
          }
        }
      }

      for (const fullItem of fullValue) {
        const itemId = this.getId(fullItem);
        if (itemId && !processedIds.has(itemId) && !deletedKeys.has(itemId)) {
          result.push(fullItem);
        }
      }

      return result;
    } else if (this.isRecord(fullValue) && this.isRecord(extractedValue)) {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(fullValue)) {
        if (!deletedKeys.has(key)) {
          result[key] = value;
        }
      }

      for (const [key, value] of Object.entries(extractedValue)) {
        const diffItemVersion = diffVersion?.items?.[key];
        const fullItemVersion = fullVersion?.items?.[key];
        const fullItem = fullValue[key];

        if (
          isVersionsObject(diffItemVersion) &&
          isVersionsObject(fullItemVersion) &&
          this.isRecord(fullItem) &&
          this.isRecord(value)
        ) {
          const mergedItem = this.mergeFieldByVersion(fullItem, fullItemVersion, diffItemVersion, value, `item:${key}`);
          result[key] = mergedItem;
        } else if (!deletedKeys.has(key) && this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
          result[key] = value;
        }
      }

      return result;
    }

    return extractedValue;
  }

  private shouldTakeExtractedItem(
    diffVersion: IVersionsObject | IFieldVersion | undefined,
    fullVersion: IVersionsObject | IFieldVersion | undefined
  ): boolean {
    if (isFieldVersion(diffVersion) && isFieldVersion(fullVersion)) {
      const comparison = this.compareVersions(diffVersion, fullVersion);
      return comparison === "a_newer" || comparison === "concurrent";
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      return true;
    }

    if (isVersionsObject(diffVersion) && isVersionsObject(fullVersion)) {
      return true;
    }

    if (diffVersion === undefined && fullVersion === undefined) {
      return true;
    }

    return false;
  }

  /**
   * Merges a version diff into a full version tree, choosing higher timestamps
   * when there are conflicts. This is used to update version information after
   * syncing with another source.
   *
   * @param fullVersions The complete version tree to merge into
   * @param versionDiff The version diff to apply
   * @returns A new version tree with the diff applied
   */
  public mergeVersions<T>(fullVersions: IVersions<T>, versionDiff: IVersions<T>): IVersions<T> {
    const result = ObjectUtils.clone(fullVersions);
    const resultObj = this.asVersionsObject(result);
    const diffObj = this.asVersionsObject(versionDiff);

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

  private mergeVersionField(
    fullVersion: IVersionValue | undefined,
    diffVersion: IVersionValue | undefined,
    path: string = ""
  ): IVersionValue | undefined {
    if (diffVersion === undefined) {
      return fullVersion;
    }

    if (isFieldVersion(fullVersion) && isFieldVersion(diffVersion)) {
      const newVersion = this.mergeFieldVersions(path, fullVersion, diffVersion);
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
      const fullObj = this.ensureVersionsObject(fullVersion);
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
      ...(nukedeleted != null && nukedeleted < VersionTracker.NUKEDELETED_THRESHOLD
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

  private applyCompaction(
    collection: ICollectionVersions,
    path: string,
    currentTimestamp: number
  ): ICollectionVersions {
    const threshold =
      path && this.versionTypes.compactionThresholds ? this.versionTypes.compactionThresholds[path] : undefined;

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
