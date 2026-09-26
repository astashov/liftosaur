import "mocha";
import { expect } from "chai";
import { WatchAuthHandoff_accountId, WatchAuthHandoff_decide } from "../src/utils/watchAuthHandoff";
import { AdminDebug_scrambledTempUserId } from "../src/models/adminDebug";

describe("WatchAuthHandoff", () => {
  const token = { token: "session", expiresAt: 0, userId: "user1" };

  describe("accountId", () => {
    it("takes the signed-in user id", () => {
      expect(WatchAuthHandoff_accountId({ id: "user1", email: "a@b.c" }, { tempUserId: "user1" })).to.equal("user1");
    });

    it("takes tempUserId on a cold start of a signed-in account", () => {
      expect(WatchAuthHandoff_accountId(undefined, { tempUserId: "user1", email: "a@b.c" })).to.equal("user1");
    });

    it("has no id for a signed-out account", () => {
      expect(WatchAuthHandoff_accountId(undefined, { tempUserId: "user1", email: undefined })).to.equal(undefined);
    });

    it("has no id for a debug account", () => {
      const debugId = AdminDebug_scrambledTempUserId("user2");
      expect(
        WatchAuthHandoff_accountId({ id: debugId, email: "a@b.c" }, { tempUserId: debugId, email: "a@b.c" })
      ).to.equal(undefined);
    });
  });

  describe("decide", () => {
    for (const source of ["startup", "request"] as const) {
      it(`sends a token that belongs to the account on ${source}`, () => {
        expect(WatchAuthHandoff_decide(token, "user1", source)).to.eql({ kind: "send", auth: token });
      });

      it(`only signs the watch out for another account's token on ${source}`, () => {
        expect(WatchAuthHandoff_decide(token, "user2", source)).to.eql({ kind: "clearWatch", storedUserId: "user1" });
      });
    }

    it("tells the watch there is no auth when it asks and there is no token", () => {
      expect(WatchAuthHandoff_decide(undefined, "user1", "request")).to.eql({ kind: "sendNoAuth" });
      expect(WatchAuthHandoff_decide({ ...token, token: "" }, "user1", "request")).to.eql({ kind: "sendNoAuth" });
    });

    it("does nothing at startup without a token", () => {
      expect(WatchAuthHandoff_decide(undefined, "user1", "startup")).to.eql({ kind: "nothing" });
    });

    it("keeps the watch auth when the account is unknown", () => {
      expect(WatchAuthHandoff_decide(token, undefined, "startup")).to.eql({ kind: "nothing" });
      expect(WatchAuthHandoff_decide(token, undefined, "request")).to.eql({ kind: "sendNoAuth" });
    });

    it("only signs the watch out when a read of account A returns after a login as B", () => {
      const accountId = WatchAuthHandoff_accountId({ id: "userB", email: "b@b.c" }, { tempUserId: "userB" });
      expect(WatchAuthHandoff_decide({ ...token, userId: "userA" }, accountId, "request")).to.eql({
        kind: "clearWatch",
        storedUserId: "userA",
      });
    });

    it("sends the token on the cold start from the qxtlrhqsoy incident", () => {
      const auth = { ...token, userId: "qxtlrhqsoy" };
      const accountId = WatchAuthHandoff_accountId(undefined, { tempUserId: "qxtlrhqsoy", email: "a@b.c" });
      expect(WatchAuthHandoff_decide(auth, accountId, "startup")).to.eql({ kind: "send", auth });
    });
  });
});
