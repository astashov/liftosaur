import "mocha";
import { expect } from "chai";
import { PushMessage_parse } from "../src/utils/pushMessage";

describe("PushMessage_parse", () => {
  it("accepts a storage hint with a numeric originalId from APNs", () => {
    expect(PushMessage_parse({ reason: "storage", originalId: 1726400000000 })).to.eql({
      type: "storage",
      originalId: 1726400000000,
    });
  });

  it("accepts a storage hint with a string originalId from FCM", () => {
    expect(PushMessage_parse({ reason: "storage", originalId: "1726400000000" })).to.eql({
      type: "storage",
      originalId: 1726400000000,
    });
  });

  it("rejects unknown reasons and malformed ids", () => {
    expect(PushMessage_parse({ reason: "other", originalId: "1" })).to.equal(undefined);
    expect(PushMessage_parse({ reason: "storage", originalId: "abc" })).to.equal(undefined);
    expect(PushMessage_parse({ reason: "storage", originalId: "0" })).to.equal(undefined);
    expect(PushMessage_parse({ reason: "storage" })).to.equal(undefined);
    expect(PushMessage_parse({})).to.equal(undefined);
  });
});
