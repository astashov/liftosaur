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
    const controlledFieldsSet = new Set(controlledFields);
    const excludedFields = this.versionTypes.excludedFields?.[vtype] || [];
    const excludedFieldsSet = new Set(excludedFields);

    const result: Record<string, unknown> = {};
    let hasChanges = false;

    for (const key of Object.keys(value)) {
      if (excludedFieldsSet.has(key)) {
        continue;
      }

      const fieldValue = value[key];
      const fieldVersion = version[key];

      if (controlledFieldsSet.has(key)) {
        if (fieldVersion != null) {
          const extractedValue = this.extractFieldByVersion(fieldValue, fieldVersion);
          if (extractedValue != null) {
            result[key] = extractedValue;
            hasChanges = true;
          }
        }
      } else {
        result[key] = fieldValue;
      }
    }

    return hasChanges ? result : undefined;
  }

  private extractCollectionByVersion(value: unknown, collectionVersion: ICollectionVersions): unknown {
    if (Array.isArray(value)) {
      const hasChanges =
        Object.keys(collectionVersion.items || {}).length > 0 ||
        Object.keys(collectionVersion.deleted || {}).length > 0;

      if (hasChanges) {
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

        return result.length > 0 ? result : undefined;
      }
      return undefined;
    } else if (VersionTrackerUtils.isRecord(value)) {
      const result: Record<string, unknown> = {};
      let hasChanges = false;

      for (const key in collectionVersion.items) {
        if (key in value) {
          const itemVersion = collectionVersion.items[key];
          const itemValue = value[key];

          if (typeof itemVersion === "object" && VersionTrackerUtils.isRecord(itemValue)) {
            const extracted = this.extractFieldByVersion(itemValue, itemVersion);
            if (extracted != null) {
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
}
