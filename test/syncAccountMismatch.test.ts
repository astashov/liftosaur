import "mocha";
import { expect } from "chai";
import { SyncAccountMismatch_fromResponse, SyncAccountMismatch_plan } from "../src/utils/syncAccountMismatch";

describe("SyncAccountMismatch", () => {
  it("reads the cookie account from an account_mismatch response", () => {
    expect(
      SyncAccountMismatch_fromResponse({
        type: "error",
        error: "account_mismatch",
        user_id: "husband",
        email: "h@example.com",
      })
    ).to.eql({ userId: "husband", email: "h@example.com" });
  });

  it("ignores every other response", () => {
    expect(SyncAccountMismatch_fromResponse({ type: "error", error: "not_authorized" })).to.equal(undefined);
    expect(
      SyncAccountMismatch_fromResponse({ type: "clean", new_original_id: 1, email: "h@example.com", user_id: "husband" })
    ).to.equal(undefined);
  });

  it("ignores the response when the local account changed while the request was in flight", () => {
    expect(
      SyncAccountMismatch_plan({ sentTempUserId: "oldaccount", currentTempUserId: "newaccount", hasLocalCopy: true })
    ).to.equal("ignore");
  });

  it("loads the cookie account's local copy when the browser has one", () => {
    expect(SyncAccountMismatch_plan({ sentTempUserId: "wife", currentTempUserId: "wife", hasLocalCopy: true })).to.equal(
      "load-local"
    );
  });

  it("fetches the cookie account from the server when the browser has no copy of it", () => {
    expect(
      SyncAccountMismatch_plan({ sentTempUserId: "wife", currentTempUserId: "wife", hasLocalCopy: false })
    ).to.equal("fetch-server");
  });
});
