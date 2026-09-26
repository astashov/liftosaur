import "mocha";
import { expect } from "chai";
import { Storage_getDefault } from "../src/models/storage";
import { IStorage } from "../src/types";
import { ILastSynced } from "../src/models/state";
import {
  SyncBaseline_MAX_AGE_MS,
  SyncBaseline_afterClean,
  SyncBaseline_fromServer,
  SyncBaseline_needsFetch,
} from "../src/utils/syncBaseline";

function storageWith(tempUserId: string, versions: IStorage["_versions"]): IStorage {
  return { ...Storage_getDefault(), tempUserId, _versions: versions };
}

describe("SyncBaseline", () => {
  const serverVersions: IStorage["_versions"] = { settings: { units: 100 }, history: { items: { 1: 100 } } };

  it("fromServer keeps the versions object it is given", () => {
    const storage = storageWith("user1", serverVersions);
    const baseline = SyncBaseline_fromServer(storage, 5000);
    expect(baseline).to.eql({ versions: serverVersions, tempUserId: "user1", serverVersionsFetchedAt: 5000 });
    expect(baseline.versions).to.equal(serverVersions);
  });

  it("afterClean takes the sent versions and keeps the fetch time", () => {
    const baseline = SyncBaseline_fromServer(storageWith("user1", serverVersions), 5000);
    const sentVersions: IStorage["_versions"] = { ...serverVersions, settings: { units: 200 } };
    const after = SyncBaseline_afterClean(baseline, storageWith("user1", sentVersions));
    expect(after.versions).to.equal(sentVersions);
    expect(after.serverVersionsFetchedAt).to.equal(5000);
  });

  describe("needsFetch", () => {
    const baseline: ILastSynced = { versions: serverVersions, tempUserId: "user1", serverVersionsFetchedAt: 10_000 };

    it("is missing without a baseline", () => {
      expect(SyncBaseline_needsFetch(undefined, "user1", 10_000)).to.equal("missing");
    });

    it("is other-user when the baseline belongs to another id", () => {
      expect(SyncBaseline_needsFetch(baseline, "user2", 10_000)).to.equal("other-user");
    });

    it("is stale at exactly the max age and not one millisecond before", () => {
      expect(SyncBaseline_needsFetch(baseline, "user1", 10_000 + SyncBaseline_MAX_AGE_MS - 1)).to.equal(undefined);
      expect(SyncBaseline_needsFetch(baseline, "user1", 10_000 + SyncBaseline_MAX_AGE_MS)).to.equal("stale");
    });
  });
});
