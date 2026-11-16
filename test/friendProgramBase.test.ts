import "mocha";
import { expect } from "chai";
import { FriendProgramBase_decode, FriendProgramBase_encode } from "../lambda/utils/friendProgramBase";

function raw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

describe("FriendProgramBase", () => {
  it("round-trips a base with and without a planner clock", () => {
    const base = { v: 1 as const, ownerId: "o", programId: "p", clonedAt: 5, plannerVersion: { vc: { s: 2 }, t: 9 } };
    expect(FriendProgramBase_decode(FriendProgramBase_encode(base))).to.deep.equal(base);
    const unversioned = { v: 1 as const, ownerId: "o", programId: "p", clonedAt: 5 };
    expect(FriendProgramBase_decode(FriendProgramBase_encode(unversioned))).to.deep.equal({
      ...unversioned,
      plannerVersion: undefined,
    });
  });

  it("rejects missing, garbage and malformed tokens", () => {
    expect(FriendProgramBase_decode(undefined)).to.equal(undefined);
    expect(FriendProgramBase_decode("")).to.equal(undefined);
    expect(FriendProgramBase_decode(42)).to.equal(undefined);
    expect(FriendProgramBase_decode("not-a-token")).to.equal(undefined);
    expect(FriendProgramBase_decode(raw({ v: 2, ownerId: "o", programId: "p", clonedAt: 5 }))).to.equal(undefined);
    expect(FriendProgramBase_decode(raw({ v: 1, ownerId: "o", clonedAt: 5 }))).to.equal(undefined);
    const badClock = { v: 1, ownerId: "o", programId: "p", clonedAt: 5, plannerVersion: { vc: { s: "2" }, t: 9 } };
    expect(FriendProgramBase_decode(raw(badClock))).to.equal(undefined);
  });
});
