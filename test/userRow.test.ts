import "mocha";
import { expect } from "chai";
import { Storage_getDefault } from "../src/models/storage";
import { IStorage } from "../src/types";
import { ILimitedUserDao } from "../lambda/dao/userDao";
import { UserRow_pack, UserRow_unpack } from "../lambda/utils/userRow";

function userWith(versions: IStorage["_versions"]): ILimitedUserDao {
  const storage = Storage_getDefault();
  return {
    id: "u1",
    email: "a@b.c",
    createdAt: 1,
    storage: { ...storage, deletedHistory: [5, 6], _versions: versions },
  };
}

describe("UserRow", () => {
  const versions: IStorage["_versions"] = {
    settings: { units: 100 },
    history: { items: { 1: 100, 2: { vc: { a: 1 }, t: 200 } }, deleted: { 3: 300 } },
    programs: { items: { 42: { name: 100 } }, deleted: {} },
    stats: { weight: { weight: { items: { 1700: 100 }, deleted: {} } } },
  };

  it("moves only the history, programs and stats versions into vz", () => {
    const packed = UserRow_pack(userWith(versions), true);
    expect(packed.vz).to.be.instanceOf(Uint8Array);
    expect(packed.storage._versions).to.eql({ settings: { units: 100 } });
    expect(packed.storage.deletedHistory).to.eql([5, 6]);
    expect(packed.storage).to.not.have.any.keys("history", "programs", "stats");
  });

  it("writes plain rows while packed writes are off", () => {
    const packed = UserRow_pack(userWith(versions), false);
    expect(packed.vz).to.equal(undefined);
    expect(packed.storage._versions).to.eql(versions);
    expect(packed.storage).to.not.have.any.keys("history", "programs", "stats");
  });

  it("round-trips to the same versions and fields", () => {
    const user = userWith(versions);
    const { history: _h, programs: _p, stats: _s, ...stored } = user.storage;
    expect(UserRow_unpack(UserRow_pack(user, true))).to.eql({ ...user, storage: stored });
  });

  it("reads a row without vz unchanged", () => {
    const { history: _h, programs: _p, stats: _s, ...storage } = userWith(versions).storage;
    const row = { ...userWith(versions), storage };
    expect(UserRow_unpack(row)).to.eql(row);
  });

  it("prefers the plain subtree an older build wrote over a stale vz", () => {
    const packedRow = UserRow_pack(userWith(versions), true);
    const newerHistory = { items: { 1: 100 }, deleted: { 2: 900, 3: 300 } };
    const mixedRow = {
      ...packedRow,
      storage: { ...packedRow.storage, _versions: { ...packedRow.storage._versions, history: newerHistory } },
    };
    const unpacked = UserRow_unpack(mixedRow).storage._versions;
    expect(unpacked?.history).to.eql(newerHistory);
    expect(unpacked?.programs).to.eql(versions?.programs);
    expect(unpacked?.stats).to.eql(versions?.stats);
  });

  it("writes no vz when there is nothing to pack", () => {
    expect(UserRow_pack(userWith(undefined), true).vz).to.equal(undefined);
    expect(UserRow_pack(userWith({ settings: { units: 1 } }), true).vz).to.equal(undefined);
  });

  it("packs a 10,000-entry stats tree under 100 KB", () => {
    const items: Record<string, { vc: Record<string, number>; t: number }> = {};
    for (let i = 0; i < 10000; i += 1) {
      items[String(1400000000000 + i * 86400000)] = { vc: { ios_abcdefgh: 1 }, t: 1790020760322 };
    }
    const packed = UserRow_pack(userWith({ stats: { weight: { weight: { items, deleted: {} } } } }), true);
    expect(packed.vz!.length).to.be.lessThan(100 * 1024);
  });
});
