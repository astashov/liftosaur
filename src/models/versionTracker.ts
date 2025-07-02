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

export interface IVersions<T> {
  [key: string]: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined;
}

export interface ICollectionVersions<T> {
  items: Record<string, IVersions<T> | number>;
  deleted?: Record<string, number>;
}

export interface IVersionTypes<TAtomicType extends string, TControlledType extends string> {
  atomicTypes: readonly TAtomicType[];
  controlledTypes: readonly TControlledType[];
  typeIdMapping: Record<TAtomicType | TControlledType, string>;
  controlledFields: Record<TControlledType, readonly string[]>;
  dictionaryFields: readonly string[];
}

export class VersionTracker<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>) {
    this.versionTypes = versionTypes;
  }

  private isAtomicType(value: unknown): value is { type: TAtomicType } {
    if (typeof value !== "object" || value === null || !("type" in value)) {
      return false;
    }
    return typeof value.type === "string" && this.versionTypes.atomicTypes.includes(value.type as TAtomicType);
  }

  private isControlledType(value: unknown): value is { type: TControlledType } {
    if (typeof value !== "object" || value === null || !("type" in value)) {
      return false;
    }
    return typeof value.type === "string" && this.versionTypes.controlledTypes.includes(value.type as TControlledType);
  }

  private getId(obj: unknown): string | undefined {
    if (typeof obj !== "object" || obj === null || !("type" in obj)) {
      return undefined;
    }
    if (typeof obj.type !== "string") {
      return undefined;
    }
    const idField = this.versionTypes.typeIdMapping[obj.type as TAtomicType | TControlledType];
    if (!idField || !(idField in obj)) {
      return undefined;
    }
    const typedObj = obj as { type: unknown } & Record<string, unknown>;
    const id = typedObj[idField];
    return id != null ? String(id) : undefined;
  }

  public updateVersions<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    const versions = { ...currentVersions };

    const keys = ObjectUtils.keys(newObj).filter((key) => key !== "_versions");

    for (const field of keys) {
      const oldValue = oldObj[field];
      const newValue = newObj[field];

      if (oldValue === newValue) {
        continue;
      }

      if (oldValue == null && newValue != null) {
        const updatedVersion = this.updateFieldVersion(
          undefined,
          newValue,
          versions[field],
          timestamp,
          field as string
        );
        if (updatedVersion !== undefined) {
          (versions as any)[field] = updatedVersion;
        }
      } else if (oldValue != null) {
        const updatedVersion = this.updateFieldVersion(oldValue, newValue, versions[field], timestamp, field as string);
        if (updatedVersion !== undefined) {
          (versions as any)[field] = updatedVersion;
        }
      }
    }

    return versions;
  }

  private updateFieldVersion(
    oldValue: unknown,
    newValue: unknown,
    currentVersion: IVersions<unknown> | ICollectionVersions<unknown> | number | undefined,
    timestamp: number,
    path: string
  ): IVersions<unknown> | ICollectionVersions<unknown> | number | undefined {
    if (Array.isArray(newValue)) {
      const hasTrackableItems = newValue.some((item) => this.getId(item) !== undefined);
      const oldHasTrackableItems =
        Array.isArray(oldValue) && oldValue.some((item: unknown) => this.getId(item) !== undefined);

      if (hasTrackableItems || oldHasTrackableItems) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (!collectionVersions || typeof collectionVersions !== "object" || !("items" in collectionVersions)) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = collectionVersions.items;

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

            if (oldItem !== item) {
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

        return collectionVersions;
      } else {
        return timestamp;
      }
    } else if (typeof newValue === "object" && newValue !== null) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (!collectionVersions || typeof collectionVersions !== "object" || !("items" in collectionVersions)) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = collectionVersions.items as ICollectionVersions<unknown>["items"];

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

        return collectionVersions;
      } else if (this.isControlledType(newValue)) {
        return this.updateControlledObjectVersion(oldValue, newValue, currentVersion, timestamp);
      } else if (this.isAtomicType(newValue)) {
        return timestamp;
      } else {
        const oldObjValue = typeof oldValue === "object" && oldValue !== null ? oldValue : undefined;
        const nestedVersions = this.updateNestedVersions(
          oldObjValue as Record<string, unknown> | undefined,
          newValue as Record<string, unknown>,
          (currentVersion || {}) as IVersions<Record<string, unknown>>,
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
    const controlledFields = this.versionTypes.controlledFields[(newValue as { type: TControlledType }).type] || [];
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

      if (oldFieldValue !== newFieldValue && newFieldValue != null) {
        (fieldVersions as Record<string, number>)[controlledField] = timestamp;
        hasChanges = true;
      }
    }

    return hasChanges || Object.keys(fieldVersions as Record<string, unknown>).length > 0
      ? (fieldVersions as IVersions<unknown>)
      : undefined;
  }

  private updateNestedVersions<T extends Record<string, unknown>>(
    oldObj: T | undefined,
    newObj: T,
    currentVersions: IVersions<T>,
    timestamp: number,
    parentPath: string
  ): IVersions<T> | undefined {
    const versions = { ...currentVersions };
    const keys = ObjectUtils.keys(newObj);
    let hasChanges = false;

    for (const key of keys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj[key];
      const currentPath = parentPath ? `${parentPath}.${String(key)}` : key;

      if (oldValue === newValue) {
        continue;
      }

      if (oldValue == null && newValue != null) {
        const updatedVersion = this.updateFieldVersion(
          undefined,
          newValue,
          versions[key],
          timestamp,
          String(currentPath)
        );
        if (updatedVersion !== undefined) {
          (versions as any)[key] = updatedVersion;
          hasChanges = true;
        }
      } else if (oldValue != null) {
        const updatedVersion = this.updateFieldVersion(
          oldValue,
          newValue,
          versions[key],
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
}
