import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  ITypedObject,
  IFieldVersion,
  IVersionsObject,
  IVersionValue,
  IVersions,
  isFieldVersion,
  isCollectionVersions,
} from "./types";
import { VersionTrackerUtils } from "./utils";

export class VersionTrackerFillVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;
  private readonly deviceId?: string;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>, deviceId?: string) {
    this.versionTypes = versionTypes;
    this.deviceId = deviceId;
  }

  public run<T extends Record<string, unknown>>(fullObj: T, versions: IVersions<T>, timestamp: number): IVersions<T> {
    const result = ObjectUtils.clone(versions);
    const resultObj = VersionTrackerUtils.asVersionsObject(result);
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
      const hasTrackableItems = value.some((item) => VersionTrackerUtils.getId(item, this.versionTypes) !== undefined);

      if (hasTrackableItems) {
        const collectionVersions = VersionTrackerUtils.ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };

        for (const item of value) {
          const itemId = VersionTrackerUtils.getId(item, this.versionTypes);
          if (itemId && !(itemId in items)) {
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[itemId] = itemVersion;
            }
          } else if (itemId && items[itemId] && !isFieldVersion(items[itemId])) {
            if (VersionTrackerUtils.isControlledType(item, this.versionTypes)) {
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
        return currentVersion !== undefined
          ? currentVersion
          : VersionTrackerUtils.createVersion(timestamp, undefined, this.deviceId);
      }
    } else if (VersionTrackerUtils.isRecord(value)) {
      if (this.versionTypes.dictionaryFields.includes(path)) {
        const collectionVersions = VersionTrackerUtils.ensureCollectionVersions(currentVersion);
        const items = { ...(collectionVersions.items || {}) };
        const dictValue = value;

        for (const [key, item] of Object.entries(dictValue)) {
          if (!(key in items)) {
            const itemVersion = this.getInitialItemVersion(item, timestamp);
            if (itemVersion !== undefined) {
              items[key] = itemVersion;
            }
          } else if (items[key] && !isFieldVersion(items[key])) {
            if (VersionTrackerUtils.isControlledType(item, this.versionTypes)) {
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
      } else if (VersionTrackerUtils.isControlledType(value, this.versionTypes)) {
        return this.fillControlledObjectVersion(value, currentVersion, timestamp);
      } else if (VersionTrackerUtils.isAtomicType(value, this.versionTypes)) {
        return currentVersion !== undefined ? currentVersion : timestamp;
      } else {
        const nestedVersions = this.fillNestedVersions(
          value,
          VersionTrackerUtils.ensureVersionsObject(currentVersion),
          timestamp,
          path
        );
        return nestedVersions;
      }
    } else {
      return currentVersion !== undefined
        ? currentVersion
        : VersionTrackerUtils.createVersion(timestamp, undefined, this.deviceId);
    }
  }

  private getInitialItemVersion(item: unknown, timestamp: number): IVersionsObject | IFieldVersion | undefined {
    if (VersionTrackerUtils.isAtomicType(item, this.versionTypes)) {
      return VersionTrackerUtils.createVersion(timestamp, undefined, this.deviceId);
    } else if (VersionTrackerUtils.isControlledType(item, this.versionTypes)) {
      return this.fillControlledObjectVersion(item, undefined, timestamp);
    } else if (VersionTrackerUtils.isRecord(item)) {
      return this.fillNestedVersions(item, {}, timestamp, "");
    } else {
      return VersionTrackerUtils.createVersion(timestamp, undefined, this.deviceId);
    }
  }

  private fillControlledObjectVersion(
    value: ITypedObject<TControlledType>,
    currentVersion: IVersionValue | undefined,
    timestamp: number
  ): IVersionsObject | undefined {
    const controlledFields = this.versionTypes.controlledFields[value.vtype] || [];
    const fieldVersions = VersionTrackerUtils.ensureVersionsObject(currentVersion);

    const result: IVersionsObject = { ...fieldVersions };
    if (Object.keys(result).length !== 0) {
      return fieldVersions;
    }

    for (const controlledField of controlledFields) {
      const fieldValue = value[controlledField];
      if (fieldValue != null && !(controlledField in result)) {
        result[controlledField] = VersionTrackerUtils.createVersion(timestamp, undefined, this.deviceId);
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
}
