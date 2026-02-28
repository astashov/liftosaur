import { ObjectUtils_clone, ObjectUtils_keys } from "../../utils/object";
import {
  IVersionTypes,
  ITypedObject,
  IFieldVersion,
  IVersionsObject,
  IVersionValue,
  IVersions,
  isFieldVersion,
  isCollectionVersions,
  isIdVersion,
} from "./types";
import {
  VersionTrackerUtils_asVersionsObject,
  VersionTrackerUtils_getId,
  VersionTrackerUtils_ensureCollectionVersions,
  VersionTrackerUtils_isControlledType,
  VersionTrackerUtils_createVersion,
  VersionTrackerUtils_isRecord,
  VersionTrackerUtils_isAtomicType,
  VersionTrackerUtils_ensureVersionsObject,
  VersionTrackerUtils_getIdFieldName,
  VersionTrackerUtils_getIdValue,
  VersionTrackerUtils_createIdVersion,
} from "./utils";

export class VersionTrackerFillVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;
  private readonly deviceId?: string;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>, deviceId?: string) {
    this.versionTypes = versionTypes;
    this.deviceId = deviceId;
  }

  public run<T extends Record<string, unknown>>(fullObj: T, versions: IVersions<T>, timestamp: number): IVersions<T> {
    const result = ObjectUtils_clone(versions);
    const resultObj = VersionTrackerUtils_asVersionsObject(result);
    const keys = ObjectUtils_keys(fullObj).filter((key) => key !== "_versions");

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
      const hasTrackableItems = value.some((item) => VersionTrackerUtils_getId(item, this.versionTypes) !== undefined);

      if (hasTrackableItems) {
        const collectionVersions = VersionTrackerUtils_ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };

        for (const item of value) {
          const itemId = VersionTrackerUtils_getId(item, this.versionTypes);
          if (itemId && !(itemId in items)) {
            const itemPath = `${path}.items.${itemId}`;
            const itemVersion = this.getInitialItemVersion(item, timestamp, itemPath);
            if (itemVersion !== undefined) {
              items[itemId] = itemVersion;
            }
          } else if (itemId && items[itemId] && !isFieldVersion(items[itemId])) {
            const itemPath = `${path}.items.${itemId}`;
            if (VersionTrackerUtils_isControlledType(item, this.versionTypes)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[itemId], timestamp, itemPath);
              if (filledItemVersion !== undefined) {
                items[itemId] = filledItemVersion;
              }
            } else {
              const filledItemVersion = this.fillFieldVersion(item, items[itemId], timestamp, itemPath);
              if (filledItemVersion !== undefined && !isCollectionVersions(filledItemVersion)) {
                items[itemId] = filledItemVersion;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else {
        return currentVersion !== undefined
          ? currentVersion
          : VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
      }
    } else if (VersionTrackerUtils_isRecord(value)) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        const collectionVersions = VersionTrackerUtils_ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };
        const dictValue = value;

        for (const [key, item] of Object.entries(dictValue)) {
          if (!(key in items)) {
            const itemPath = `${path}.items.${key}`;
            const itemVersion = this.getInitialItemVersion(item, timestamp, itemPath);
            if (itemVersion !== undefined) {
              items[key] = itemVersion;
            }
          } else if (items[key] && !isFieldVersion(items[key])) {
            const itemPath = `${path}.items.${key}`;
            if (VersionTrackerUtils_isControlledType(item, this.versionTypes)) {
              const filledItemVersion = this.fillControlledObjectVersion(item, items[key], timestamp, itemPath);
              if (filledItemVersion !== undefined) {
                items[key] = filledItemVersion;
              }
            } else {
              const filledItemVersion = this.fillFieldVersion(item, items[key], timestamp, itemPath);
              if (filledItemVersion !== undefined && !isCollectionVersions(filledItemVersion)) {
                items[key] = filledItemVersion;
              }
            }
          }
        }

        return { ...collectionVersions, items };
      } else if (VersionTrackerUtils_isControlledType(value, this.versionTypes)) {
        return this.fillControlledObjectVersion(value, currentVersion, timestamp, path);
      } else if (VersionTrackerUtils_isAtomicType(value, this.versionTypes)) {
        return currentVersion !== undefined ? currentVersion : timestamp;
      } else {
        const nestedVersions = this.fillNestedVersions(
          value,
          VersionTrackerUtils_ensureVersionsObject(currentVersion),
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      return currentVersion !== undefined
        ? currentVersion
        : VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
    }
  }

  private getInitialItemVersion(
    item: unknown,
    timestamp: number,
    path: string = ""
  ): IVersionsObject | IFieldVersion | undefined {
    if (VersionTrackerUtils_isAtomicType(item, this.versionTypes)) {
      return VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
    } else if (VersionTrackerUtils_isControlledType(item, this.versionTypes)) {
      return this.fillControlledObjectVersion(item, undefined, timestamp, path);
    } else if (VersionTrackerUtils_isRecord(item)) {
      return this.fillNestedVersions(item, {}, timestamp, path);
    } else {
      return VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
    }
  }

  private fillControlledObjectVersion(
    value: ITypedObject<TControlledType>,
    currentVersion: IVersionValue | undefined,
    timestamp: number,
    path: string
  ): IVersionsObject | undefined {
    const controlledFields = this.versionTypes.controlledFields[value.vtype] || [];
    const fieldVersions = VersionTrackerUtils_ensureVersionsObject(currentVersion);

    const result: IVersionsObject = { ...fieldVersions };

    // Fill ID version if not present
    const idField = VersionTrackerUtils_getIdFieldName(value.vtype, this.versionTypes);
    if (idField && !isIdVersion(result[idField])) {
      const idValue = VersionTrackerUtils_getIdValue(value, this.versionTypes);
      if (idValue != null) {
        result[idField] = VersionTrackerUtils_createIdVersion(timestamp, idValue, undefined, this.deviceId);
      }
    }

    // If we already have controlled field versions (besides ID), return existing
    const existingFields = Object.keys(result).filter((k) => k !== idField);
    if (existingFields.length > 0) {
      return result;
    }

    for (const controlledField of controlledFields) {
      const fieldValue = value[controlledField];
      if (fieldValue != null && !(controlledField in result)) {
        const fieldPath = path ? `${path}.${controlledField}` : controlledField;
        const filledVersion = this.fillControlledFieldVersion(fieldValue, timestamp, fieldPath);
        if (filledVersion != null) {
          result[controlledField] = filledVersion;
        }
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private fillControlledFieldVersion(value: unknown, timestamp: number, path: string): IVersionValue | undefined {
    if (Array.isArray(value)) {
      const hasTrackableItems = value.some((item) => VersionTrackerUtils_getId(item, this.versionTypes) !== undefined);
      if (hasTrackableItems) {
        const items: Record<string, IVersionsObject | IFieldVersion> = {};
        for (const item of value) {
          const itemId = VersionTrackerUtils_getId(item, this.versionTypes);
          if (itemId) {
            const itemPath = `${path}.items.${itemId}`;
            const itemVersion = this.getInitialItemVersion(item, timestamp, itemPath);
            if (itemVersion != null) {
              items[itemId] = itemVersion;
            }
          }
        }
        return { items };
      }
    }

    if (VersionTrackerUtils_isRecord(value)) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        const items: Record<string, IVersionsObject | IFieldVersion> = {};
        for (const [key, item] of Object.entries(value)) {
          const itemPath = `${path}.items.${key}`;
          const itemVersion = this.getInitialItemVersion(item, timestamp, itemPath);
          if (itemVersion != null) {
            items[key] = itemVersion;
          }
        }
        return { items };
      }
      if (VersionTrackerUtils_isControlledType(value, this.versionTypes)) {
        return this.fillControlledObjectVersion(value, undefined, timestamp, path);
      }
      if (VersionTrackerUtils_isAtomicType(value, this.versionTypes)) {
        return VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
      }
    }

    return VersionTrackerUtils_createVersion(timestamp, undefined, this.deviceId);
  }

  private fillNestedVersions(
    obj: Record<string, unknown>,
    currentVersions: IVersionsObject,
    timestamp: number,
    parentPath: string
  ): IVersionsObject | undefined {
    const versions: IVersionsObject = { ...currentVersions };
    const keys = ObjectUtils_keys(obj);
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
}
