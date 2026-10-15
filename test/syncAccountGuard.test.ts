import "mocha";
import { expect } from "chai";
import { SyncAccountGuard_decide } from "../lambda/utils/syncAccountGuard";

describe("SyncAccountGuard", () => {
  it("proceeds when the client sends no local account id", () => {
    expect(SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: undefined })).to.equal("proceed");
    expect(SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: "" })).to.equal("proceed");
  });

  it("proceeds when the local account is the cookie account", () => {
    expect(SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: "husband" })).to.equal("proceed");
  });

  it("asks for a lookup when the ids differ and nothing is known about the local id", () => {
    expect(SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: "wife" })).to.equal("lookup");
  });

  it("proceeds for an anonymous local copy, so a website login can adopt it", () => {
    expect(
      SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: "anonrandom", tempUserIsAccount: false })
    ).to.equal("proceed");
  });

  it("refuses a local copy that belongs to another real account", () => {
    expect(SyncAccountGuard_decide({ cookieUserId: "husband", tempUserId: "wife", tempUserIsAccount: true })).to.equal(
      "mismatch"
    );
  });
});
