import { IVersions } from "../../src/models/versionTracker";
import { isCollectionVersions, isIdVersion, isVectorClock } from "../../src/models/versionTracker/types";

// Every minted version is a vector clock now, but these suites are about the *shape* of the versions
// tree - which fields get a version, how collections and tombstones are laid out - not about the
// counters. Collapsing each clock to its timestamp keeps those assertions readable; the clock
// semantics themselves are covered in versionTracker.test.ts.
export function VersionsFixture_timestamps<T>(versions: IVersions<T>): IVersions<T> {
  return strip(versions) as IVersions<T>;
}

function strip(value: unknown): unknown {
  if (typeof value !== "object" || value == null) {
    return value;
  }
  if (isIdVersion(value)) {
    return { vc: {}, t: value.t, value: value.value };
  }
  if (isVectorClock(value)) {
    return value.t;
  }
  if (isCollectionVersions(value)) {
    const items: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value.items || {})) {
      items[key] = strip(item);
    }
    return { ...value, items };
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = strip(item);
  }
  return result;
}
