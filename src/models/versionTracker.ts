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
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { lg } from "../utils/posthog";
import { SetUtils } from "../utils/setUtils";

export interface IVersions<T> {
  [key: string]: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined;
}

export interface ICollectionVersions<T> {
  items?: Record<string, IVersions<T> | number>;
  deleted?: Record<string, number>;
  nukedeleted?: number;
}

export interface IVersionTypes<TAtomicType extends string, TControlledType extends string> {
  atomicTypes: readonly TAtomicType[];
  controlledTypes: readonly TControlledType[];
  typeIdMapping: Record<TAtomicType | TControlledType, string>;
  controlledFields: Record<TControlledType, readonly string[]>;
  dictionaryFields: readonly string[];
  compactionThresholds?: Record<string, number>; // path -> threshold in ms
}

export class VersionTracker<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>) {
    this.versionTypes = versionTypes;
  }

  private isAtomicType(value: unknown): value is { type: TAtomicType } {
    if (typeof value !== "object" || value === null || !("vtype" in value)) {
      return false;
    }
    return typeof value.vtype === "string" && this.versionTypes.atomicTypes.includes(value.vtype as TAtomicType);
  }

  private isControlledType(value: unknown): value is { type: TControlledType } {
    if (typeof value !== "object" || value === null || !("vtype" in value)) {
      return false;
    }
    return (
      typeof value.vtype === "string" && this.versionTypes.controlledTypes.includes(value.vtype as TControlledType)
    );
  }

  private getId(obj: unknown): string | undefined {
    if (typeof obj !== "object" || obj === null || !("vtype" in obj)) {
      return undefined;
    }
    if (typeof obj.vtype !== "string") {
      return undefined;
    }
    const idField = this.versionTypes.typeIdMapping[obj.vtype as TAtomicType | TControlledType];
    if (!idField || !(idField in obj)) {
      return undefined;
    }
    const typedObj = obj as { vtype: unknown } & Record<string, unknown>;
    const id = typedObj[idField];
    return id != null ? String(id) : undefined;
  }

  public updateVersions<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    newVersions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    const versions = ObjectUtils.clone(currentVersions);

    const keys = ObjectUtils.keys(newObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const oldValue = oldObj[field];
      const newValue = newObj[field];

      if (ObjectUtils.isEqual(oldValue as Record<string, unknown>, newValue as Record<string, unknown>)) {
        continue;
      }

      if (oldValue != null || (oldValue == null && newValue != null)) {
        const updatedVersion = this.updateFieldVersion(
          oldObj,
          newObj,
          currentVersions,
          newVersions,
          oldValue,
          newValue,
          versions[field],
          newVersions[field],
          timestamp,
          field as string
        );
        if (updatedVersion !== undefined) {
          (versions as any)[field] = updatedVersion;
        }
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
    currentVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    newVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    timestamp: number,
    path: string
  ): IVersions<unknown> | ICollectionVersions<unknown> | number | undefined {
    if (Array.isArray(newValue)) {
      const hasTrackableItems = newValue.some((item) => this.getId(item) !== undefined);
      const oldHasTrackableItems =
        Array.isArray(oldValue) && oldValue.some((item: unknown) => this.getId(item) !== undefined);

      if (hasTrackableItems || oldHasTrackableItems) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (
          !collectionVersions ||
          typeof collectionVersions !== "object" ||
          !("items" in collectionVersions || "deleted" in collectionVersions)
        ) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = collectionVersions.items || {};
        if (collectionVersions.nukedeleted != null) {
          collectionVersions = { ...collectionVersions, nukedeleted: collectionVersions.nukedeleted + 1 };
          if ((collectionVersions.nukedeleted ?? 0) > 3) {
            delete collectionVersions.nukedeleted;
          }
        }

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
            const oldItem = Array.isArray(oldValue)
              ? oldValue.find((o: unknown) => this.getId(o) === itemId)
              : undefined;

            if (!ObjectUtils.isEqual(oldItem, item)) {
              const itemVersion = this.getItemVersion(oldItem, item, items[itemId], timestamp);
              if (itemVersion !== undefined) {
                items[itemId] = itemVersion;
              }
            }

            if (collectionVersions.deleted && itemId in collectionVersions.deleted) {
              delete collectionVersions.deleted[itemId];
            }
          }
        }

        try {
          const grouped = CollectionUtils.groupByExpr(
            ObjectUtils.entries(collectionVersions.deleted || {}),
            ([, v]) => `${v}`
          );
          const keys = ObjectUtils.keys(grouped).filter((group) => {
            const values = grouped[group];
            return values != null && values.length > 1;
          });
          if (keys.length > 0) {
            for (const key of keys) {
              for (const k of grouped[key] || []) {
                const deletekey = k[0];
                if (deletekey != null) {
                  delete (collectionVersions.deleted || {})[deletekey];
                }
              }
            }
            try {
              if (typeof global !== "undefined") {
                (global as any).suspiciousDeletion = true;
              }
              if (typeof window !== "undefined") {
                (window as any).suspiciousDeletion = true;
              }
              lg("ls-suspicious-deletion", {
                trace: new Error().stack ?? "",
                path: path,
                oldFull: JSON.stringify(oldFull),
                newFull: JSON.stringify(newFull),
                oldFullVersion: JSON.stringify(oldFullVersion),
                newFullVersion: JSON.stringify(newFullVersion),
              });
            } catch (e) {
              console.error(e);
              lg("ls-suspicious-deletion-error");
            }
          }
        } catch (e) {
          lg("ls-deletion-escape-error", { error: `${e}` });
        }

        const hasChanges =
          Object.keys(items).length > 0 ||
          (collectionVersions.deleted && Object.keys(collectionVersions.deleted).length > 0);

        const compactedCollection = this.applyCompaction(collectionVersions, path, timestamp);
        return hasChanges || currentVersion ? compactedCollection : undefined;
      } else {
        return timestamp;
      }
    } else if (typeof newValue === "object" && newValue !== null) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (
          !collectionVersions ||
          typeof collectionVersions !== "object" ||
          !("items" in collectionVersions || "deleted" in collectionVersions)
        ) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = (collectionVersions.items as ICollectionVersions<unknown>["items"]) || {};
        if (collectionVersions.nukedeleted != null) {
          collectionVersions = { ...collectionVersions, nukedeleted: collectionVersions.nukedeleted + 1 };
          if ((collectionVersions.nukedeleted ?? 0) > 3) {
            delete collectionVersions.nukedeleted;
          }
        }

        const oldDict = oldValue as Record<string, unknown> | undefined;
        const newDict = newValue as Record<string, unknown>;

        if (oldDict) {
          for (const key of ObjectUtils.keys(oldDict)) {
            if (!(key in newDict)) {
              collectionVersions.deleted = collectionVersions.deleted || {};
              collectionVersions.deleted[key] = timestamp;
              delete items[key];
            }
          }
        }

        for (const [key, item] of Object.entries(newDict)) {
          const oldItem = oldDict?.[key];
          if (oldItem !== item) {
            const itemVersion = this.getItemVersion(oldItem, item, items[key], timestamp);
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
      } else if (this.isControlledType(newValue)) {
        return this.updateControlledObjectVersion(oldValue, newValue, currentVersion, timestamp);
      } else if (this.isAtomicType(newValue)) {
        return timestamp;
      } else {
        const oldObjValue = typeof oldValue === "object" && oldValue !== null ? oldValue : undefined;
        const nestedVersions = this.updateNestedVersions(
          oldFull,
          newFull,
          oldFullVersion,
          newFullVersion,
          oldObjValue as Record<string, unknown> | undefined,
          newValue as Record<string, unknown>,
          (currentVersion || {}) as IVersions<Record<string, unknown>>,
          (newVersion || {}) as IVersions<Record<string, unknown>>,
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      return timestamp;
    }
  }

  private getItemVersion(
    oldItem: unknown,
    newItem: unknown,
    currentItemVersion: number | IVersions<unknown> | undefined,
    timestamp: number
  ): number | IVersions<unknown> | undefined {
    if (this.isAtomicType(newItem)) {
      return timestamp;
    } else if (this.isControlledType(newItem)) {
      return this.updateControlledObjectVersion(oldItem, newItem, currentItemVersion, timestamp);
    } else {
      return timestamp;
    }
  }

  private updateControlledObjectVersion(
    oldValue: unknown,
    newValue: unknown,
    currentVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    timestamp: number
  ): IVersions<unknown> | undefined {
    const controlledFields = this.versionTypes.controlledFields[(newValue as { vtype: TControlledType }).vtype] || [];
    let fieldVersions = currentVersion;
    if (!fieldVersions || typeof fieldVersions !== "object") {
      fieldVersions = {};
    }
    let hasChanges = false;

    for (const controlledField of controlledFields) {
      const oldFieldValue =
        oldValue && typeof oldValue === "object" && controlledField in oldValue
          ? (oldValue as Record<string, unknown>)[controlledField]
          : undefined;
      const newFieldValue = (newValue as Record<string, unknown>)[controlledField];

      if (
        !ObjectUtils.isEqual(oldFieldValue as Record<string, unknown>, newFieldValue as Record<string, unknown>) &&
        newFieldValue != null
      ) {
        (fieldVersions as Record<string, number>)[controlledField] = timestamp;
        hasChanges = true;
      }
    }

    return hasChanges || Object.keys(fieldVersions as Record<string, unknown>).length > 0
      ? (fieldVersions as IVersions<unknown>)
      : undefined;
  }

  private updateNestedVersions<T extends Record<string, unknown>>(
    oldFull: unknown,
    newFull: unknown,
    oldFullVersion: unknown,
    newFullVersion: unknown,
    oldObj: T | undefined,
    newObj: T,
    currentVersions: IVersions<T>,
    newVersions: IVersions<T>,
    timestamp: number,
    parentPath: string
  ): IVersions<T> | undefined {
    const versions = { ...currentVersions };
    const keys = ObjectUtils.keys(newObj);
    let hasChanges = false;

    for (const key of keys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj[key];
      const currentPath = parentPath ? `${parentPath}.${String(key)}` : String(key);

      if (ObjectUtils.isEqual(oldValue as Record<string, unknown>, newValue as Record<string, unknown>)) {
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
          String(currentPath)
        );
        if (updatedVersion !== undefined) {
          (versions as any)[key] = updatedVersion;
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
          String(currentPath)
        );
        if (updatedVersion !== undefined) {
          (versions as any)[key] = updatedVersion;
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
    const keys = ObjectUtils.keys(fullObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const value = fullObj[field];

      if (value == null) {
        continue;
      }

      const currentVersion = (result as any)[field];
      const filledVersion = this.fillFieldVersion(value, currentVersion, timestamp, field as string);

      if (filledVersion !== undefined) {
        (result as any)[field] = filledVersion;
      }
    }

    return result;
  }

  private fillFieldVersion(
    value: unknown,
    currentVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    timestamp: number,
    path: string
  ): IVersions<unknown> | ICollectionVersions<unknown> | number | undefined {
    if (typeof currentVersion === "number") {
      return currentVersion;
    }

    if (Array.isArray(value)) {
      const hasTrackableItems = value.some((item) => this.getId(item) !== undefined);

      if (hasTrackableItems) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (
          !collectionVersions ||
          typeof collectionVersions !== "object" ||
          !("items" in collectionVersions || "deleted" in collectionVersions)
        ) {
          collectionVersions = { items: {}, deleted: {} };
        }

        const items = { ...(collectionVersions.items || {}) };

        for (const item of value) {
          const itemId = this.getId(item);
          if (itemId && !(itemId in items)) {
            // Add version for missing item
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[itemId] = itemVersion;
            }
          } else if (itemId && items[itemId] && typeof items[itemId] === "object") {
            // For controlled types, we need to fill missing fields
            if (this.isControlledType(item)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[itemId], timestamp);
              if (filledItemVersion !== undefined) {
                items[itemId] = filledItemVersion;
              }
            } else {
              // For other objects, recursively fill nested versions
              const filledItemVersion = this.fillFieldVersion(item, items[itemId], timestamp, `${path}[${itemId}]`);
              if (filledItemVersion !== undefined) {
                items[itemId] = filledItemVersion as IVersions<unknown> | number;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else {
        // Non-trackable array - return timestamp if missing
        return currentVersion !== undefined ? currentVersion : timestamp;
      }
    } else if (typeof value === "object" && value !== null) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (
          !collectionVersions ||
          typeof collectionVersions !== "object" ||
          !("items" in collectionVersions || "deleted" in collectionVersions)
        ) {
          collectionVersions = { items: {}, deleted: {} };
        }

        const items = { ...(collectionVersions.items || {}) };
        const dictValue = value as Record<string, unknown>;

        for (const [key, item] of Object.entries(dictValue)) {
          if (!(key in items)) {
            // Add version for missing item
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[key] = itemVersion;
            }
          } else if (items[key] && typeof items[key] === "object") {
            // For controlled types, we need to fill missing fields
            if (this.isControlledType(item)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[key], timestamp);
              if (filledItemVersion !== undefined) {
                items[key] = filledItemVersion;
              }
            } else {
              // For other objects, recursively fill nested versions
              const filledItemVersion = this.fillFieldVersion(item, items[key], timestamp, `${path}.${key}`);
              if (filledItemVersion !== undefined) {
                items[key] = filledItemVersion as IVersions<unknown> | number;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else if (this.isControlledType(value)) {
        return this.fillControlledObjectVersion(value, currentVersion, timestamp);
      } else if (this.isAtomicType(value)) {
        // Atomic type - return timestamp if missing
        return currentVersion !== undefined ? currentVersion : timestamp;
      } else {
        // Regular nested object
        const nestedVersions = this.fillNestedVersions(
          value as Record<string, unknown>,
          (currentVersion || {}) as IVersions<Record<string, unknown>>,
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      // Primitive value - return timestamp if missing
      return currentVersion !== undefined ? currentVersion : timestamp;
    }
  }

  private getInitialItemVersion(item: unknown, timestamp: number): number | IVersions<unknown> | undefined {
    if (this.isAtomicType(item)) {
      return timestamp;
    } else if (this.isControlledType(item)) {
      return this.fillControlledObjectVersion(item, undefined, timestamp);
    } else if (typeof item === "object" && item !== null) {
      return this.fillNestedVersions(item as Record<string, unknown>, {}, timestamp, "");
    } else {
      return timestamp;
    }
  }

  private fillControlledObjectVersion(
    value: unknown,
    currentVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    timestamp: number
  ): IVersions<unknown> | undefined {
    const controlledFields = this.versionTypes.controlledFields[(value as { vtype: TControlledType }).vtype] || [];
    let fieldVersions = currentVersion;
    if (!fieldVersions || typeof fieldVersions !== "object") {
      fieldVersions = {};
    }

    const result = { ...fieldVersions } as Record<string, number>;

    for (const controlledField of controlledFields) {
      const fieldValue = (value as Record<string, unknown>)[controlledField];
      if (fieldValue !== undefined && fieldValue !== null && !(controlledField in result)) {
        result[controlledField] = timestamp;
      }
    }

    return Object.keys(result).length > 0 ? (result as IVersions<unknown>) : undefined;
  }

  private fillNestedVersions<T extends Record<string, unknown>>(
    obj: T,
    currentVersions: IVersions<T>,
    timestamp: number,
    parentPath: string
  ): IVersions<T> | undefined {
    const versions = { ...currentVersions };
    const keys = ObjectUtils.keys(obj);
    let hasAnyVersion = false;

    for (const key of keys) {
      const value = obj[key];
      const currentPath = parentPath ? `${parentPath}.${String(key)}` : String(key);

      if (value !== undefined && value !== null) {
        const filledVersion = this.fillFieldVersion(value, versions[key], timestamp, currentPath);
        if (filledVersion !== undefined) {
          (versions as any)[key] = filledVersion;
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
    const diff: any = {};
    let hasChanges = false;

    for (const key in newVersions) {
      const oldVersion = oldVersions?.[key];
      const newVersion = newVersions[key];

      const fieldDiff = this.diffFieldVersion(oldVersion, newVersion);
      if (fieldDiff !== undefined) {
        diff[key] = fieldDiff;
        hasChanges = true;
      }
    }

    return hasChanges ? diff : undefined;
  }

  private diffFieldVersion(
    oldVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    newVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined
  ): IVersions<unknown> | ICollectionVersions<unknown> | number | undefined {
    if (typeof oldVersion !== typeof newVersion) {
      return newVersion;
    }

    if (typeof newVersion === "number") {
      return oldVersion !== newVersion ? newVersion : undefined;
    }

    if (newVersion && typeof newVersion === "object" && ("items" in newVersion || "deleted" in newVersion)) {
      const oldCollection = oldVersion as ICollectionVersions<unknown> | undefined;
      const diffCollection: ICollectionVersions<unknown> = { items: {} };
      let hasChanges = false;

      const newCollection = newVersion as ICollectionVersions<unknown>;
      const oldDeletedKeys = new Set(Object.keys(oldCollection?.deleted || {}));
      const newDeletedKeys = new Set(Object.keys(newCollection.deleted || {}));
      if (!SetUtils.areEqual(oldDeletedKeys, newDeletedKeys)) {
        hasChanges = true;
      }
      diffCollection.deleted = { ...(oldCollection?.deleted || {}), ...(newCollection.deleted || {}) };
      for (const id in newCollection.items) {
        if (diffCollection.deleted && id in diffCollection.deleted) {
          continue;
        }
        const oldItemVersion = oldCollection?.items?.[id];
        const newItemVersion = newCollection.items[id];

        const itemDiff = this.diffFieldVersion(oldItemVersion, newItemVersion);
        if (itemDiff !== undefined) {
          diffCollection.items = diffCollection.items || {};
          diffCollection.items[id] = itemDiff as IVersions<unknown> | number;
          hasChanges = true;
        }
      }

      return hasChanges ? diffCollection : undefined;
    }

    if (newVersion && typeof newVersion === "object") {
      const oldObj = oldVersion as IVersions<unknown> | undefined;
      const diffObj: any = {};
      let hasChanges = false;

      const newObj = newVersion as IVersions<unknown>;
      for (const key in newObj) {
        const fieldDiff = this.diffFieldVersion(oldObj?.[key], newObj[key]);
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
    const result: any = {};

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

    return result;
  }

  private extractFieldByVersion(
    value: unknown,
    version: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    path: string
  ): unknown {
    if (typeof version === "number") {
      return value;
    }

    if (version && typeof version === "object" && ("items" in version || "deleted" in version)) {
      return this.extractCollectionByVersion(value, version as ICollectionVersions<unknown>);
    }

    if (version && typeof version === "object" && typeof value === "object" && value !== null) {
      if (this.isControlledType(value)) {
        const controlledType = (value as any).vtype as TControlledType;
        const controlledFields = this.versionTypes.controlledFields[controlledType] || [];

        const hasControlledFieldChange = controlledFields.some((field) => field in version);

        if (hasControlledFieldChange) {
          return value;
        }
        return undefined;
      }

      return this.extractByVersions(value as Record<string, unknown>, version as IVersions<Record<string, unknown>>);
    }

    return value;
  }

  private extractCollectionByVersion(value: unknown, collectionVersion: ICollectionVersions<unknown>): unknown {
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
    } else {
      const result: Record<string, unknown> = {};
      const dictValue = value as Record<string, unknown>;
      let hasChanges = false;

      for (const key in collectionVersion.items) {
        if (key in dictValue) {
          const itemVersion = collectionVersion.items[key];
          const itemValue = dictValue[key];

          if (typeof itemVersion === "object" && typeof itemValue === "object" && itemValue !== null) {
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
    const result = ObjectUtils.clone(fullObj);

    for (const key in versionDiff) {
      const diffVersion = versionDiff[key];
      const fullVersion = fullVersions[key];
      const extractedValue = extractedObj[key];

      if (extractedValue !== undefined) {
        const mergedValue = this.mergeFieldByVersion(result[key], fullVersion, diffVersion, extractedValue, key);
        if (mergedValue !== undefined) {
          (result as any)[key] = mergedValue;
        }
      }
    }

    return result;
  }

  private mergeFieldByVersion(
    fullValue: unknown,
    fullVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    diffVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    extractedValue: unknown,
    path: string
  ): unknown {
    if (typeof diffVersion === "number" && typeof fullVersion === "number") {
      return diffVersion > fullVersion ? extractedValue : fullValue;
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      // Handle collections specially when fullVersion is undefined
      if (diffVersion && typeof diffVersion === "object" && ("items" in diffVersion || "deleted" in diffVersion)) {
        // This is a collection diff, use collection merge logic
        return this.mergeCollectionByVersion(
          fullValue,
          undefined, // no full version
          diffVersion as ICollectionVersions<unknown>,
          extractedValue
        );
      }

      // For nested objects, we need to recursively merge
      if (
        typeof fullValue === "object" &&
        fullValue !== null &&
        typeof extractedValue === "object" &&
        extractedValue !== null &&
        typeof diffVersion === "object"
      ) {
        // Recursively merge with empty full versions
        return this.mergeByVersions(
          fullValue as Record<string, unknown>,
          {}, // empty full versions
          diffVersion as IVersions<Record<string, unknown>>,
          extractedValue as Record<string, unknown>
        );
      }
      // For primitives or non-matching types, take extracted value
      return extractedValue ?? fullValue;
    }

    if (diffVersion && typeof diffVersion === "object" && ("items" in diffVersion || "deleted" in diffVersion)) {
      return this.mergeCollectionByVersion(
        fullValue,
        fullVersion as ICollectionVersions<unknown> | undefined,
        diffVersion as ICollectionVersions<unknown>,
        extractedValue
      );
    }

    if (
      diffVersion &&
      typeof diffVersion === "object" &&
      typeof extractedValue === "object" &&
      extractedValue !== null
    ) {
      if (this.isControlledType(extractedValue)) {
        const controlledType = (extractedValue as any).vtype as TControlledType;
        const controlledFields = this.versionTypes.controlledFields[controlledType] || [];

        let shouldTakeExtracted = false;
        for (const field of controlledFields) {
          if (field in diffVersion) {
            const diffFieldVersion = (diffVersion as any)[field];
            const fullFieldVersion =
              fullVersion && typeof fullVersion === "object" ? (fullVersion as any)[field] : undefined;

            if (
              typeof diffFieldVersion === "number" &&
              (fullFieldVersion === undefined || diffFieldVersion > fullFieldVersion)
            ) {
              shouldTakeExtracted = true;
              break;
            }
          }
        }

        return shouldTakeExtracted ? extractedValue : fullValue;
      }

      if (typeof fullValue === "object" && fullValue !== null) {
        return this.mergeByVersions(
          fullValue as Record<string, unknown>,
          (fullVersion || {}) as IVersions<Record<string, unknown>>,
          diffVersion as IVersions<Record<string, unknown>>,
          extractedValue as Record<string, unknown>
        );
      } else {
        return extractedValue ?? fullValue;
      }
    }

    return fullValue;
  }

  private mergeCollectionByVersion(
    fullValue: unknown,
    fullVersion: ICollectionVersions<unknown> | undefined,
    diffVersion: ICollectionVersions<unknown>,
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

      // First, process items from extractedValue that have version changes
      for (const extractedItem of extractedValue) {
        const itemId = this.getId(extractedItem);
        if (itemId && !deletedKeys.has(itemId)) {
          processedIds.add(itemId);
          const diffItemVersion = diffVersion?.items?.[itemId];
          const fullItemVersion = fullVersion?.items?.[itemId];

          if (this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
            result.push(extractedItem);
          } else {
            const fullItem = fullValue.find((item) => this.getId(item) === itemId);
            if (fullItem) {
              result.push(fullItem);
            } else {
              result.push(extractedItem);
            }
          }
        }
      }

      // Then, add all items from fullValue that weren't processed and aren't deleted
      for (const fullItem of fullValue) {
        const itemId = this.getId(fullItem);
        if (itemId && !processedIds.has(itemId) && !deletedKeys.has(itemId)) {
          result.push(fullItem);
        }
      }

      return result;
    } else if (
      typeof fullValue === "object" &&
      fullValue !== null &&
      typeof extractedValue === "object" &&
      extractedValue !== null
    ) {
      const result: Record<string, unknown> = {};
      const fullDict = fullValue as Record<string, unknown>;
      const extractedDict = extractedValue as Record<string, unknown>;

      for (const [key, value] of Object.entries(fullDict)) {
        if (!deletedKeys.has(key)) {
          result[key] = value;
        }
      }

      for (const [key, value] of Object.entries(extractedDict)) {
        const diffItemVersion = diffVersion?.items?.[key];
        const fullItemVersion = fullVersion?.items?.[key];

        if (!deletedKeys.has(key) && this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
          result[key] = value;
        }
      }

      return result;
    }

    return extractedValue;
  }

  private shouldTakeExtractedItem(
    diffVersion: IVersions<unknown> | number | undefined,
    fullVersion: IVersions<unknown> | number | undefined
  ): boolean {
    if (typeof diffVersion === "number" && typeof fullVersion === "number") {
      return diffVersion > fullVersion;
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      return true;
    }

    if (typeof diffVersion === "object" && typeof fullVersion === "object") {
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

    for (const key in versionDiff) {
      const fullVersion = result[key];
      const diffVersion = versionDiff[key];

      const mergedVersion = this.mergeVersionField(fullVersion, diffVersion, key);
      if (mergedVersion !== undefined) {
        (result as any)[key] = mergedVersion;
      }
    }

    return result;
  }

  private mergeVersionField(
    fullVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    diffVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    path: string = ""
  ): IVersions<unknown> | ICollectionVersions<unknown> | number | undefined {
    if (diffVersion === undefined) {
      return fullVersion;
    }

    if (typeof fullVersion === "number" && typeof diffVersion === "number") {
      return Math.max(fullVersion, diffVersion);
    }

    if (typeof diffVersion === "number") {
      return diffVersion;
    }

    if (diffVersion && typeof diffVersion === "object" && ("items" in diffVersion || "deleted" in diffVersion)) {
      return this.mergeCollectionVersions(
        fullVersion as ICollectionVersions<unknown> | undefined,
        diffVersion as ICollectionVersions<unknown>,
        path
      );
    }

    if (diffVersion && typeof diffVersion === "object") {
      const fullObj = (fullVersion || {}) as IVersions<unknown>;
      const result: any = { ...fullObj };

      for (const key in diffVersion) {
        const mergedField = this.mergeVersionField(
          fullObj[key],
          (diffVersion as any)[key],
          path ? `${path}.${key}` : key
        );
        if (mergedField !== undefined) {
          result[key] = mergedField;
        }
      }

      return result;
    }

    return diffVersion;
  }

  private mergeCollectionVersions(
    fullCollection: ICollectionVersions<unknown> | undefined,
    diffCollection: ICollectionVersions<unknown>,
    path?: string
  ): ICollectionVersions<unknown> {
    const nukedeleted =
      diffCollection.nukedeleted != null || fullCollection?.nukedeleted != null
        ? Math.max(diffCollection.nukedeleted || 0, fullCollection?.nukedeleted || 0)
        : undefined;
    const result: ICollectionVersions<unknown> = {
      items: { ...(fullCollection?.items || {}) },
      deleted: nukedeleted != null ? {} : { ...(fullCollection?.deleted || {}), ...(diffCollection?.deleted || {}) },
      ...(nukedeleted != null && nukedeleted < 3 ? { nukedeleted: nukedeleted + 1 } : {}),
    };

    for (const id in diffCollection.items) {
      const fullItemVersion = result.items?.[id];
      const diffItemVersion = diffCollection.items[id];

      const mergedItemVersion = this.mergeVersionField(fullItemVersion, diffItemVersion);
      if (mergedItemVersion !== undefined) {
        result.items = result.items || {};
        result.items[id] = mergedItemVersion as IVersions<unknown> | number;
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
    collection: ICollectionVersions<unknown>,
    path: string,
    currentTimestamp: number
  ): ICollectionVersions<unknown> {
    const threshold =
      path && this.versionTypes.compactionThresholds ? this.versionTypes.compactionThresholds[path] : undefined;

    if (!threshold || !collection.deleted || Object.keys(collection.deleted).length === 0) {
      return collection;
    }

    const result: ICollectionVersions<unknown> = {
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
