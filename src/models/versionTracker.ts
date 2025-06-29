import {
  IVersions,
  ATOMIC_TYPES,
  IAtomicType,
  CONTROLLED_TYPES,
  IControlledType,
  TYPE_ID_MAPPING,
  CONTROLLED_FIELDS,
  ICollectionVersions,
} from "../types";
import { ObjectUtils } from "../utils/object";

type AtomicObject = { type: IAtomicType };
type ControlledObject = { type: IControlledType };

function isAtomicType(value: unknown): value is AtomicObject {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  return typeof value.type === "string" && ATOMIC_TYPES.includes(value.type as IAtomicType);
}

function isControlledType(value: unknown): value is ControlledObject {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  return typeof value.type === "string" && CONTROLLED_TYPES.includes(value.type as IControlledType);
}

function getId(obj: unknown): string | undefined {
  if (typeof obj !== "object" || obj === null || !("type" in obj)) {
    return undefined;
  }
  if (typeof obj.type !== "string") {
    return undefined;
  }
  const idField = TYPE_ID_MAPPING[obj.type as IAtomicType | IControlledType];
  if (!idField || !(idField in obj)) {
    return undefined;
  }
  const typedObj = obj as { type: unknown } & Record<string, unknown>;
  const id = typedObj[idField];
  return id != null ? String(id) : undefined;
}

export class VersionTracker {
  public static updateVersions<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    timestamp: number,
    dictionaryFields: readonly string[] = []
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
          field as string,
          dictionaryFields
        );
        if (updatedVersion !== undefined) {
          (versions as any)[field] = updatedVersion;
        }
      } else if (oldValue != null) {
        const updatedVersion = this.updateFieldVersion(
          oldValue,
          newValue,
          versions[field],
          timestamp,
          field as string,
          dictionaryFields
        );
        if (updatedVersion !== undefined) {
          (versions as any)[field] = updatedVersion;
        }
      }
    }

    return versions;
  }

  private static updateFieldVersion(
    oldValue: unknown,
    newValue: unknown,
    currentVersion: IVersions<unknown> | number | undefined,
    timestamp: number,
    path: string,
    dictionaryFields: readonly string[]
  ): IVersions<unknown> | number | undefined {
    if (Array.isArray(newValue)) {
      // Check if array items have IDs (are trackable as collection)
      const hasTrackableItems = newValue.some((item) => getId(item) !== undefined);
      // Also check if old array had trackable items (to preserve collection structure)
      const oldHasTrackableItems =
        Array.isArray(oldValue) && oldValue.some((item: unknown) => getId(item) !== undefined);

      if (hasTrackableItems || oldHasTrackableItems) {
        // Handle as collection
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (!collectionVersions || typeof collectionVersions !== "object" || !("items" in collectionVersions)) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = collectionVersions.items;

        // First, handle deleted items (items that were in old array but not in new)
        if (Array.isArray(oldValue)) {
          for (const oldItem of oldValue) {
            const oldItemId = getId(oldItem);
            if (oldItemId && !newValue.some((item) => getId(item) === oldItemId)) {
              // Item was deleted
              collectionVersions.deleted = collectionVersions.deleted || {};
              collectionVersions.deleted[oldItemId] = timestamp;
              // Remove from items if it exists
              delete items[oldItemId];
            }
          }
        }

        // Then handle new/updated items
        for (const item of newValue) {
          const itemId = getId(item);
          if (itemId) {
            const oldItem = Array.isArray(oldValue) ? oldValue.find((o: unknown) => getId(o) === itemId) : undefined;

            if (oldItem !== item) {
              const itemVersion = this.getItemVersion(oldItem, item, items[itemId], timestamp);
              if (itemVersion !== undefined) {
                items[itemId] = itemVersion;
              }
            }

            // Remove from deleted if it was previously deleted
            if (collectionVersions.deleted && itemId in collectionVersions.deleted) {
              delete collectionVersions.deleted[itemId];
            }
          }
        }

        // Always return collection structure to preserve deleted entries
        return collectionVersions;
      } else {
        // Array with non-trackable items - version as simple timestamp
        return timestamp;
      }
    } else if (typeof newValue === "object" && newValue !== null) {
      if (dictionaryFields.includes(path)) {
        let collectionVersions = currentVersion as ICollectionVersions<unknown> | undefined;
        if (!collectionVersions || typeof collectionVersions !== "object" || !("items" in collectionVersions)) {
          collectionVersions = { items: {}, deleted: {} } as ICollectionVersions<unknown>;
        }
        const items = collectionVersions.items as ICollectionVersions<unknown>["items"];

        const oldDict = oldValue as Record<string, unknown> | undefined;
        const newDict = newValue as Record<string, unknown>;

        // First, handle deleted items (keys that were in old dict but not in new)
        if (oldDict) {
          for (const key of ObjectUtils.keys(oldDict)) {
            if (!(key in newDict)) {
              // Item was deleted
              collectionVersions.deleted = collectionVersions.deleted || {};
              collectionVersions.deleted[key] = timestamp;
              // Remove from items if it exists
              delete items[key];
            }
          }
        }

        // Then handle new/updated items
        for (const [key, item] of Object.entries(newDict)) {
          const oldItem = oldDict?.[key];
          if (oldItem !== item) {
            const itemVersion = this.getItemVersion(oldItem, item, items[key], timestamp);
            if (itemVersion !== undefined) {
              items[key] = itemVersion;
            }
          }

          // Remove from deleted if it was previously deleted
          if (collectionVersions.deleted && key in collectionVersions.deleted) {
            delete collectionVersions.deleted[key];
          }
        }

        // Always return collection structure to preserve deleted entries
        return collectionVersions;
      } else if (isControlledType(newValue)) {
        return this.updateControlledObjectVersion(oldValue, newValue, currentVersion, timestamp);
      } else if (isAtomicType(newValue)) {
        return timestamp;
      } else {
        const oldObjValue = typeof oldValue === "object" && oldValue !== null ? oldValue : undefined;
        const nestedVersions = this.updateNestedVersions(
          oldObjValue as Record<string, unknown> | undefined,
          newValue as Record<string, unknown>,
          (currentVersion || {}) as IVersions<Record<string, unknown>>,
          timestamp,
          path,
          dictionaryFields
        );
        return nestedVersions;
      }
    } else {
      return timestamp;
    }
  }

  private static getItemVersion(
    oldItem: unknown,
    newItem: unknown,
    currentItemVersion: number | IVersions<unknown> | undefined,
    timestamp: number
  ): number | IVersions<unknown> | undefined {
    if (isAtomicType(newItem)) {
      return timestamp;
    } else if (isControlledType(newItem)) {
      return this.updateControlledObjectVersion(oldItem, newItem, currentItemVersion, timestamp);
    } else {
      return timestamp;
    }
  }

  private static updateControlledObjectVersion(
    oldValue: unknown,
    newValue: ControlledObject,
    currentVersion: IVersions<unknown> | number | undefined,
    timestamp: number
  ): IVersions<unknown> | undefined {
    const controlledFields = CONTROLLED_FIELDS[newValue.type];
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

    // Only return if there were changes or if we have existing versions to preserve
    return hasChanges || Object.keys(fieldVersions as Record<string, unknown>).length > 0
      ? (fieldVersions as IVersions<unknown>)
      : undefined;
  }

  private static updateNestedVersions<T extends Record<string, unknown>>(
    oldObj: T | undefined,
    newObj: T,
    currentVersions: IVersions<T>,
    timestamp: number,
    parentPath: string,
    dictionaryFields: readonly string[]
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
          String(currentPath),
          dictionaryFields
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
          String(currentPath),
          dictionaryFields
        );
        if (updatedVersion !== undefined) {
          (versions as any)[key] = updatedVersion;
          hasChanges = true;
        }
      }
    }

    // Only return the versions object if there were actual changes
    return hasChanges || Object.keys(currentVersions).length > 0 ? versions : undefined;
  }
}
