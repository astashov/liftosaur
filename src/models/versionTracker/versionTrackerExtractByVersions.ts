import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  IVersions,
  IVersionValue,
  IVersionsObject,
  ICollectionVersions,
  isFieldVersion,
  isCollectionVersions,
  isVersionsObject,
} from "./types";
import { VersionTrackerUtils } from "./utils";

export class VersionTrackerExtractByVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>) {
    this.versionTypes = versionTypes;
  }

  public run<T extends Record<string, unknown>>(obj: T, versionsDiff: IVersions<T>): Partial<T> {
    const result: Partial<T> = {};

    for (const key of ObjectUtils.keys(versionsDiff)) {
      const version = versionsDiff[key];
      const value = obj[key];

      if (value != null) {
        const extractedValue = this.extractFieldByVersion(value, version);
        if (extractedValue != null) {
          result[key] = extractedValue as T[typeof key];
        }
      }
    }

    return result;
  }

  private extractFieldByVersion(value: unknown, version: IVersionValue | undefined): unknown {
    if (isFieldVersion(version)) {
      return value;
    }

    if (isCollectionVersions(version)) {
      return this.extractCollectionByVersion(value, version);
    }

    if (isVersionsObject(version) && VersionTrackerUtils.isRecord(value)) {
      if (VersionTrackerUtils.isControlledType(value, this.versionTypes)) {
        return this.extractControlledTypeByVersion(value, version);
      }

      return this.run(value, version);
    }

    return value;
  }

  private extractControlledTypeByVersion(value: Record<string, unknown>, version: IVersionsObject): unknown {
    const vtype = value.vtype as TControlledType;
    const controlledFields = this.versionTypes.controlledFields[vtype] || [];
    const excludedFields = this.versionTypes.excludedFields?.[vtype] || [];
    const excludedFieldsSet = new Set(excludedFields);

    const hasControlledFieldChange = controlledFields.some((field) => version[field] != null);

    if (!hasControlledFieldChange) {
      return undefined;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (!excludedFieldsSet.has(key)) {
        result[key] = value[key];
      }
    }
    return result;
  }

  private extractCollectionByVersion(value: unknown, collectionVersion: ICollectionVersions): unknown {
    const hasItemChanges = Object.keys(collectionVersion.items || {}).length > 0;
    const hasDeletions = Object.keys(collectionVersion.deleted || {}).length > 0;
    const hasChanges = hasItemChanges || hasDeletions;

    if (!hasChanges) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const result: unknown[] = [];

      for (const item of value) {
        const itemId = VersionTrackerUtils.getId(item, this.versionTypes);
        if (itemId && itemId in (collectionVersion.items || {})) {
          const itemVersion = collectionVersion.items![itemId];
          if (typeof itemVersion === "object" && VersionTrackerUtils.isRecord(item)) {
            const extracted = this.extractFieldByVersion(item, itemVersion);
            if (extracted != null) {
              result.push(extracted);
            }
          } else {
            result.push(item);
          }
        }
      }

      // Return the array even if empty - deletions are still changes
      return result;
    } else if (VersionTrackerUtils.isRecord(value)) {
      const result: Record<string, unknown> = {};

      for (const key in collectionVersion.items) {
        if (key in value) {
          const itemVersion = collectionVersion.items[key];
          const itemValue = value[key];

          if (typeof itemVersion === "object" && VersionTrackerUtils.isRecord(itemValue)) {
            const extracted = this.extractFieldByVersion(itemValue, itemVersion);
            if (extracted != null) {
              result[key] = extracted;
            }
          } else {
            result[key] = itemValue;
          }
        }
      }

      // Return the object even if empty - deletions are still changes
      return result;
    }

    return undefined;
  }
}
