import "mocha";
import { expect } from "chai";
import { LogSummary_ofUser } from "../lambda/utils/logSummary";

describe("LogSummary_ofUser", () => {
  it("returns nothing for a user without rows", () => {
    expect(LogSummary_ofUser("u1", [])).to.equal(undefined);
  });

  it("picks the earliest and the latest action regardless of row order", () => {
    const summary = LogSummary_ofUser("u1", [
      { action: "ls-finish-workout", ts: 300 },
      { action: "ls-initialize-user", ts: 100 },
      { action: "ls-start-workout", ts: 200 },
    ]);
    expect(summary).to.eql({
      userId: "u1",
      firstAction: { name: "ls-initialize-user", ts: 100 },
      lastAction: { name: "ls-finish-workout", ts: 300 },
      hasSubscriptions: false,
    });
  });

  it("marks the user subscribed when any row has a subscription", () => {
    const summary = LogSummary_ofUser("u1", [
      { action: "a", ts: 1, subscriptions: [] },
      { action: "b", ts: 2, subscriptions: ["apple"] },
      { action: "c", ts: 3 },
    ]);
    expect(summary?.hasSubscriptions).to.equal(true);
  });
});
