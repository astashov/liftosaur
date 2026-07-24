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
import { IVersionTypes, IVersions } from "./versionTracker/types";
import { VersionTrackerDiffVersions } from "./versionTracker/versionTrackerDiffVersions";
import { VersionTrackerExtractByVersions } from "./versionTracker/versionTrackerExtractByVersions";
import { VersionTrackerFillVersions } from "./versionTracker/versionTrackerFillVersions";
import { VersionTrackerMergeByVersions } from "./versionTracker/versionTrackerMergeByVersions";
import { VersionTrackerMergeVersions } from "./versionTracker/versionTrackerMergeVersions";
import { VersionTrackerUpdateVersions } from "./versionTracker/versionTrackerUpdateVersions";

export * from "./versionTracker/types";

export class VersionTracker<TAtomicType extends string, TControlledType extends string> {
  private readonly versionTypes: IVersionTypes<TAtomicType, TControlledType>;
  private readonly deviceId?: string;

  constructor(versionTypes: IVersionTypes<TAtomicType, TControlledType>, options?: { deviceId?: string }) {
    this.versionTypes = versionTypes;
    this.deviceId = options?.deviceId;
  }

  public updateVersions<T extends Record<string, unknown>>(
    oldObj: T,
    newObj: T,
    currentVersions: IVersions<T>,
    newVersions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    return new VersionTrackerUpdateVersions(this.versionTypes, this.deviceId).run(
      oldObj,
      newObj,
      currentVersions,
      newVersions,
      timestamp
    );
  }

  public fillVersions<T extends Record<string, unknown>>(
    fullObj: T,
    versions: IVersions<T>,
    timestamp: number
  ): IVersions<T> {
    return new VersionTrackerFillVersions(this.versionTypes, this.deviceId).run(fullObj, versions, timestamp);
  }

  public diffVersions<T>(oldVersions: IVersions<T> | undefined, newVersions: IVersions<T>): IVersions<T> | undefined {
    return new VersionTrackerDiffVersions().run(oldVersions, newVersions);
  }

  public extractByVersions<T extends Record<string, unknown>>(obj: T, versionsDiff: IVersions<T>): Partial<T> {
    return new VersionTrackerExtractByVersions(this.versionTypes).run(obj, versionsDiff);
  }

  public mergeByVersions<T extends Record<string, unknown>>(
    fullObj: T,
    fullVersions: IVersions<T>,
    versionDiff: IVersions<T>,
    extractedObj: Partial<T>
  ): T {
    return new VersionTrackerMergeByVersions(this.versionTypes).run(fullObj, fullVersions, versionDiff, extractedObj);
  }

  public mergeVersions<T>(fullVersions: IVersions<T>, versionDiff: IVersions<T>): IVersions<T> {
    return new VersionTrackerMergeVersions(this.versionTypes).run(fullVersions, versionDiff);
  }
}
