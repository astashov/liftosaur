import { ObjectUtils } from "../../utils/object";
import {
  IVersionTypes,
  IFieldVersion,
  IVersionsObject,
  IVersionValue,
  IVersions,
  ICollectionVersions,
  isFieldVersion,
  isCollectionVersions,
  isVersionsObject,
} from "./types";
import { VersionTrackerUtils } from "./utils";

export class VersionTrackerMergeByVersions<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>) {
    this.versionTypes = versionTypes;
  }

  public run<T extends Record<string, unknown>>(
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
      const comparison = VersionTrackerUtils.compareVersions(diffVersion, fullVersion);
      if (comparison === "a_newer" || comparison === "concurrent") {
        return extractedValue;
      }
      return fullValue;
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      if (isCollectionVersions(diffVersion)) {
        return this.mergeCollectionByVersion(fullValue, undefined, diffVersion, extractedValue);
      }

      if (
        VersionTrackerUtils.isRecord(fullValue) &&
        VersionTrackerUtils.isRecord(extractedValue) &&
        isVersionsObject(diffVersion)
      ) {
        return this.run(fullValue, {}, diffVersion, extractedValue);
      }
      return extractedValue ?? fullValue;
    }

    if (isCollectionVersions(diffVersion)) {
      const fullCollection = isCollectionVersions(fullVersion) ? fullVersion : undefined;
      return this.mergeCollectionByVersion(fullValue, fullCollection, diffVersion, extractedValue);
    }

    if (isVersionsObject(diffVersion) && VersionTrackerUtils.isRecord(extractedValue)) {
      if (VersionTrackerUtils.isControlledType(extractedValue, this.versionTypes)) {
        const controlledFields = this.versionTypes.controlledFields[extractedValue.vtype] || [];

        const mergedItem: Record<string, unknown> = VersionTrackerUtils.isRecord(fullValue) ? { ...fullValue } : {};
        const fullVersionObj = isVersionsObject(fullVersion) ? fullVersion : undefined;

        for (const field of controlledFields) {
          if (field in diffVersion) {
            const diffFieldVersion = diffVersion[field];
            const fullFieldVersion = fullVersionObj?.[field];

            if (isFieldVersion(diffFieldVersion)) {
              if (fullFieldVersion === undefined || !isFieldVersion(fullFieldVersion)) {
                mergedItem[field] = extractedValue[field];
              } else {
                const comparison = VersionTrackerUtils.compareVersions(diffFieldVersion, fullFieldVersion);
                if (comparison === "a_newer" || comparison === "concurrent") {
                  mergedItem[field] = extractedValue[field];
                }
              }
            }
          }
        }

        return mergedItem;
      }

      if (VersionTrackerUtils.isRecord(fullValue)) {
        const fullVersionObj = VersionTrackerUtils.ensureVersionsObject(fullVersion);
        return this.run(fullValue, fullVersionObj, diffVersion, extractedValue);
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
        const itemId = VersionTrackerUtils.getId(extractedItem, this.versionTypes);
        if (itemId && !deletedKeys.has(itemId)) {
          processedIds.add(itemId);
          const diffItemVersion = diffVersion?.items?.[itemId];
          const fullItemVersion = fullVersion?.items?.[itemId];
          const fullItem = fullValue.find((item) => VersionTrackerUtils.getId(item, this.versionTypes) === itemId);

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
        const itemId = VersionTrackerUtils.getId(fullItem, this.versionTypes);
        if (itemId && !processedIds.has(itemId) && !deletedKeys.has(itemId)) {
          result.push(fullItem);
        }
      }

      return result;
    } else if (VersionTrackerUtils.isRecord(fullValue) && VersionTrackerUtils.isRecord(extractedValue)) {
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
          VersionTrackerUtils.isRecord(fullItem) &&
          VersionTrackerUtils.isRecord(value)
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
      const comparison = VersionTrackerUtils.compareVersions(diffVersion, fullVersion);
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
}
