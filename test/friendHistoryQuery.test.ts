import "mocha";
import { expect } from "chai";
import { FriendHistoryQuery_encodeCursor, FriendHistoryQuery_parse } from "../lambda/utils/friendHistoryQuery";

describe("FriendHistoryQuery", () => {
  it("defaults and clamps the limit", () => {
    const limit = (value?: string): number | undefined => {
      const result = FriendHistoryQuery_parse("f", { limit: value });
      return result.success ? result.data.limit : undefined;
    };
    expect(limit(undefined)).to.equal(50);
    expect(limit("0")).to.equal(1);
    expect(limit("-5")).to.equal(1);
    expect(limit("500")).to.equal(100);
    expect(limit("abc")).to.equal(50);
  });

  it("parses the three range forms and makes a date-only end inclusive", () => {
    const start = FriendHistoryQuery_parse("f", { startDate: "2026-11-01" });
    expect(start.success && start.data).to.include({ startDate: "2026-11-01T00:00:00.000Z", endDate: undefined });
    const end = FriendHistoryQuery_parse("f", { endDate: "2026-11-10" });
    expect(end.success && end.data).to.include({ startDate: undefined, endDate: "2026-11-10T23:59:59.999Z" });
    const both = FriendHistoryQuery_parse("f", { startDate: "1761955200", endDate: "2026-11-10T12:00:00Z" });
    expect(both.success && both.data).to.include({
      startDate: "2025-11-01T00:00:00.000Z",
      endDate: "2026-11-10T12:00:00.000Z",
    });
  });

  it("rejects an invalid date or cursor", () => {
    expect(FriendHistoryQuery_parse("f", { startDate: "yesterday" }).success).to.equal(false);
    expect(FriendHistoryQuery_parse("f", { endDate: "2026-13-45" }).success).to.equal(false);
    expect(FriendHistoryQuery_parse("f", { startDate: "2026-02-30" }).success).to.equal(false);
    expect(FriendHistoryQuery_parse("f", { cursor: "garbage" }).success).to.equal(false);
    const wrongShape = Buffer.from(JSON.stringify({ id: "1", date: 5 })).toString("base64url");
    expect(FriendHistoryQuery_parse("f", { cursor: wrongShape }).success).to.equal(false);
    expect(FriendHistoryQuery_parse("f", { startDate: "2026-11-10", endDate: "2026-11-01" }).success).to.equal(false);
    expect(FriendHistoryQuery_parse("f", { startDate: { at: 1 } }).success).to.equal(false);
    const numeric = FriendHistoryQuery_parse("f", { startDate: 1761955200, limit: 5 });
    expect(numeric.success && numeric.data).to.include({ startDate: "2025-11-01T00:00:00.000Z", limit: 5 });
  });

  it("round-trips a cursor and always pins it to the requested friend", () => {
    const cursor = FriendHistoryQuery_encodeCursor({ userId: "someone-else", id: 7, date: "2026-11-01T10:00:00.000Z" });
    const parsed = FriendHistoryQuery_parse("f", { cursor });
    expect(parsed.success && parsed.data.startKey).to.eql({ userId: "f", id: 7, date: "2026-11-01T10:00:00.000Z" });
    expect(FriendHistoryQuery_encodeCursor(undefined)).to.equal(undefined);
  });
});
