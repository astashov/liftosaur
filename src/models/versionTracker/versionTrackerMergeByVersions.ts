import { CollectionUtils_uniqByExpr } from "../../utils/collection";
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
import {
  VersionTrackerUtils_compareVersions,
  VersionTrackerUtils_normalizeVersion,
  VersionTrackerUtils_isRecord,
  VersionTrackerUtils_isControlledType,
  VersionTrackerUtils_getIdVersionFromVersions,
  VersionTrackerUtils_pickWinningIdVersion,
  VersionTrackerUtils_ensureVersionsObject,
  VersionTrackerUtils_getId,
} from "./utils";

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
    let result: Record<string, unknown> | null = null;
    const writeKey = (key: string, value: unknown): void => {
      if (fullObj[key] === value) {
        return;
      }
      if (result == null) {
        result = { ...fullObj };
      }
      result[key] = value;
    };
    const deleteKey = (key: string): void => {
      if (!(key in fullObj)) {
        return;
      }
      if (result == null) {
        result = { ...fullObj };
      }
      delete result[key];
    };

    for (const key of Object.keys(versionDiff)) {
      const diffVersion = versionDiff[key];
      const fullVersion = fullVersions[key];
      const extractedValue = extractedObj[key as keyof T];

      if (extractedValue !== undefined) {
        const mergedValue = this.mergeFieldByVersion(fullObj[key], fullVersion, diffVersion, extractedValue, key);
        if (mergedValue !== undefined) {
          writeKey(key, mergedValue);
        }
      } else if (isFieldVersion(diffVersion)) {
        if (fullVersion === undefined || !isFieldVersion(fullVersion)) {
          deleteKey(key);
        } else {
          const comparison = VersionTrackerUtils_compareVersions(diffVersion, fullVersion);
          if (comparison === "a_newer") {
            deleteKey(key);
          } else if (comparison === "concurrent") {
            const diffNorm = VersionTrackerUtils_normalizeVersion(diffVersion);
            const fullNorm = VersionTrackerUtils_normalizeVersion(fullVersion);
            if (diffNorm.t > fullNorm.t) {
              deleteKey(key);
            }
          }
        }
      }
    }

    return (result ?? fullObj) as T;
  }

  private mergeFieldByVersion(
    fullValue: unknown,
    fullVersion: IVersionValue | undefined,
    diffVersion: IVersionValue | undefined,
    extractedValue: unknown,
    path: string
  ): unknown {
    if (isFieldVersion(diffVersion) && isFieldVersion(fullVersion)) {
      const comparison = VersionTrackerUtils_compareVersions(diffVersion, fullVersion);
      if (comparison === "a_newer") {
        return extractedValue;
      }
      if (comparison === "concurrent") {
        const diffNorm = VersionTrackerUtils_normalizeVersion(diffVersion);
        const fullNorm = VersionTrackerUtils_normalizeVersion(fullVersion);
        if (diffNorm.t > fullNorm.t) {
          return extractedValue;
        }
      }
      return fullValue;
    }

    if (diffVersion !== undefined && fullVersion === undefined) {
      if (isCollectionVersions(diffVersion)) {
        return this.mergeCollectionByVersion(fullValue, undefined, diffVersion, extractedValue);
      }

      if (
        VersionTrackerUtils_isRecord(fullValue) &&
        VersionTrackerUtils_isRecord(extractedValue) &&
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

    if (isVersionsObject(diffVersion) && VersionTrackerUtils_isRecord(extractedValue)) {
      if (VersionTrackerUtils_isControlledType(extractedValue, this.versionTypes)) {
        const fullVersionObj = isVersionsObject(fullVersion) ? fullVersion : undefined;
        const diffVersionObj = diffVersion;

        // Get ID versions from both full and diff to determine the winner
        const fullIdVersion = VersionTrackerUtils_getIdVersionFromVersions(
          extractedValue.vtype,
          fullVersionObj,
          this.versionTypes
        );
        const diffIdVersion = VersionTrackerUtils_getIdVersionFromVersions(
          extractedValue.vtype,
          diffVersionObj,
          this.versionTypes
        );

        // If both have ID versions with different values, determine which one wins
        if (fullIdVersion && diffIdVersion && fullIdVersion.value !== diffIdVersion.value) {
          const winner = VersionTrackerUtils_pickWinningIdVersion(fullIdVersion, diffIdVersion);
          if (winner === fullIdVersion) {
            // Full wins - keep full value, ignore extracted
            return fullValue;
          }
          // Diff wins - use extracted value entirely (it's a different object)
          return extractedValue;
        }

        const controlledFields = this.versionTypes.controlledFields[extractedValue.vtype] || [];
        const controlledFieldSet = new Set(controlledFields);

        const fullIsRecord = VersionTrackerUtils_isRecord(fullValue);
        const fullRecord = fullIsRecord ? (fullValue as Record<string, unknown>) : undefined;
        let mergedItem: Record<string, unknown> | null = fullIsRecord ? null : {};
        const writeField = (field: string, value: unknown): void => {
          if (fullRecord && fullRecord[field] === value) {
            return;
          }
          if (mergedItem == null) {
            mergedItem = { ...fullRecord };
          }
          mergedItem[field] = value;
        };

        for (const field in extractedValue) {
          if (!controlledFieldSet.has(field) && (!fullRecord || !(field in fullRecord))) {
            writeField(field, extractedValue[field]);
          }
        }

        for (const field of controlledFields) {
          if (field in diffVersion) {
            const diffFieldVersion = diffVersion[field];
            const fullFieldVersion = fullVersionObj?.[field];
            const fullFieldValue = fullRecord ? fullRecord[field] : undefined;
            const extractedFieldValue = extractedValue[field];

            if (isFieldVersion(diffFieldVersion)) {
              if (fullFieldVersion === undefined || !isFieldVersion(fullFieldVersion)) {
                writeField(field, extractedFieldValue);
              } else {
                const comparison = VersionTrackerUtils_compareVersions(diffFieldVersion, fullFieldVersion);
                if (comparison === "a_newer") {
                  writeField(field, extractedFieldValue);
                } else if (comparison === "concurrent") {
                  const diffNorm = VersionTrackerUtils_normalizeVersion(diffFieldVersion);
                  const fullNorm = VersionTrackerUtils_normalizeVersion(fullFieldVersion);
                  if (diffNorm.t > fullNorm.t) {
                    writeField(field, extractedFieldValue);
                  }
                }
              }
            } else if (isCollectionVersions(diffFieldVersion)) {
              const fullCollection = isCollectionVersions(fullFieldVersion) ? fullFieldVersion : undefined;
              const merged = this.mergeCollectionByVersion(
                fullFieldValue,
                fullCollection,
                diffFieldVersion,
                extractedFieldValue
              );
              writeField(field, merged);
            } else if (isVersionsObject(diffFieldVersion) && VersionTrackerUtils_isRecord(extractedFieldValue)) {
              const merged = this.mergeFieldByVersion(
                fullFieldValue,
                fullFieldVersion,
                diffFieldVersion,
                extractedFieldValue,
                `${path}.${field}`
              );
              writeField(field, merged);
            }
          }
        }

        if (mergedItem == null) {
          return fullValue;
        }

        const validator = this.versionTypes.typeValidators?.[extractedValue.vtype];
        if (validator && !validator.is(mergedItem)) {
          console.log(`[MERGE_DEBUG] Validator REJECTED merged ${extractedValue.vtype}, reverting to fullValue`);
          return fullValue;
        }

        return mergedItem;
      }

      if (VersionTrackerUtils_isRecord(fullValue)) {
        const fullVersionObj = VersionTrackerUtils_ensureVersionsObject(fullVersion);
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
      const dedupedFull = CollectionUtils_uniqByExpr(fullValue, (item) =>
        VersionTrackerUtils_getId(item, this.versionTypes)
      );
      const dedupedExtracted = CollectionUtils_uniqByExpr(extractedValue, (item) =>
        VersionTrackerUtils_getId(item, this.versionTypes)
      );
      if (dedupedExtracted.length === 0 && deletedKeys.size === 0 && dedupedFull.length === fullValue.length) {
        return fullValue;
      }
      const dedupedFullById = new Map<string, unknown>();
      for (const item of dedupedFull) {
        const itemId = VersionTrackerUtils_getId(item, this.versionTypes);
        if (itemId) {
          dedupedFullById.set(itemId, item);
        }
      }
      const result: unknown[] = [];
      const processedIds = new Set<string>();
      let allSame = true;
      const pushItem = (item: unknown): void => {
        const idx = result.length;
        result.push(item);
        if (allSame && (idx >= fullValue.length || fullValue[idx] !== item)) {
          allSame = false;
        }
      };

      for (const extractedItem of dedupedExtracted) {
        const itemId = VersionTrackerUtils_getId(extractedItem, this.versionTypes);
        if (itemId && !deletedKeys.has(itemId)) {
          processedIds.add(itemId);
          const diffItemVersion = diffVersion?.items?.[itemId];
          const fullItemVersion = fullVersion?.items?.[itemId];
          const fullItem = dedupedFullById.get(itemId);

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
            pushItem(mergedItem);
          } else if (this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
            pushItem(extractedItem);
          } else {
            pushItem(fullItem ?? extractedItem);
          }
        }
      }

      for (const fullItem of dedupedFull) {
        const itemId = VersionTrackerUtils_getId(fullItem, this.versionTypes);
        if (itemId && !processedIds.has(itemId) && !deletedKeys.has(itemId)) {
          pushItem(fullItem);
        }
      }

      if (allSame && result.length === fullValue.length) {
        return fullValue;
      }
      return result;
    } else if (VersionTrackerUtils_isRecord(fullValue) && VersionTrackerUtils_isRecord(extractedValue)) {
      if (Object.keys(extractedValue).length === 0 && deletedKeys.size === 0) {
        return fullValue;
      }
      const fullRecord = fullValue;
      let result: Record<string, unknown> | null = null;
      const ensureResult = (): Record<string, unknown> => {
        if (result == null) {
          result = { ...fullRecord };
          for (const dk of deletedKeys) {
            delete result[dk as string];
          }
        }
        return result;
      };
      for (const dk of deletedKeys) {
        if ((dk as string) in fullRecord) {
          ensureResult();
          break;
        }
      }
      const writeKey = (key: string, value: unknown): void => {
        const current = result ?? fullRecord;
        if (key in current && current[key] === value) {
          return;
        }
        ensureResult()[key] = value;
      };

      for (const [key, value] of Object.entries(extractedValue)) {
        const diffItemVersion = diffVersion?.items?.[key];
        const fullItemVersion = fullVersion?.items?.[key];
        const fullItem = fullRecord[key];

        if (
          isVersionsObject(diffItemVersion) &&
          isVersionsObject(fullItemVersion) &&
          VersionTrackerUtils_isRecord(fullItem) &&
          VersionTrackerUtils_isRecord(value)
        ) {
          const mergedItem = this.mergeFieldByVersion(fullItem, fullItemVersion, diffItemVersion, value, `item:${key}`);
          writeKey(key, mergedItem);
        } else if (!deletedKeys.has(key) && this.shouldTakeExtractedItem(diffItemVersion, fullItemVersion)) {
          writeKey(key, value);
        }
      }

      return result ?? fullRecord;
    }

    return extractedValue;
  }

  private shouldTakeExtractedItem(
    diffVersion: IVersionsObject | IFieldVersion | undefined,
    fullVersion: IVersionsObject | IFieldVersion | undefined
  ): boolean {
    if (isFieldVersion(diffVersion) && isFieldVersion(fullVersion)) {
      const comparison = VersionTrackerUtils_compareVersions(diffVersion, fullVersion);
      if (comparison === "a_newer") {
        return true;
      }
      if (comparison === "concurrent") {
        const diffNorm = VersionTrackerUtils_normalizeVersion(diffVersion);
        const fullNorm = VersionTrackerUtils_normalizeVersion(fullVersion);
        return diffNorm.t > fullNorm.t;
      }
      return false;
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
