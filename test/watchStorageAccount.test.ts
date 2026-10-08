import "mocha";
import { expect } from "chai";
import { WatchStorageAccount_isOtherAccount } from "../src/models/watchStorageAccount";

describe("WatchStorageAccount_isOtherAccount", () => {
  it("accepts the same account", () => {
    expect(WatchStorageAccount_isOtherAccount({ tempUserId: "aaa" }, { tempUserId: "aaa" })).to.equal(false);
  });

  it("rejects a different account", () => {
    expect(WatchStorageAccount_isOtherAccount({ tempUserId: "aaa" }, { tempUserId: "bbb" })).to.equal(true);
  });

  it("accepts incoming storage without an account", () => {
    expect(WatchStorageAccount_isOtherAccount({ tempUserId: "aaa" }, {})).to.equal(false);
  });

  it("accepts any account when the current storage has none", () => {
    expect(WatchStorageAccount_isOtherAccount({}, { tempUserId: "bbb" })).to.equal(false);
  });
});
