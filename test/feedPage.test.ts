import "mocha";
import { expect } from "chai";
import {
  FeedPage_decodeCursor,
  FeedPage_encodeCursor,
  FeedPage_merge,
  FeedPage_startKey,
  IFeedCursor,
  IFeedOwnerResult,
} from "../lambda/utils/feedPage";
import { FriendsFixtures_record } from "./friendsFixtures";

function result(ownerId: string, ids: number[], date: (id: number) => string, hasMore: boolean): IFeedOwnerResult {
  const records = ids.map((id) => FriendsFixtures_record(id, date(id)));
  const last = records[records.length - 1];
  return {
    ownerId,
    records,
    lastEvaluatedKey: hasMore && last ? { userId: ownerId, id: last.id, date: last.date } : undefined,
    failed: false,
  };
}

const sameDate = (): string => "2026-11-01T10:00:00.000Z";

describe("FeedPage", () => {
  it("round-trips a cursor and ignores garbage", () => {
    const cursor: IFeedCursor = { owners: { a: { userId: "a", id: 5, date: "x" }, b: "done" } };
    expect(FeedPage_decodeCursor(FeedPage_encodeCursor(cursor))).to.eql(cursor);
    expect(FeedPage_decodeCursor("not-base64-json")).to.eql({ owners: {} });
    expect(FeedPage_decodeCursor(undefined)).to.eql({ owners: {} });
  });

  it("takes the newest records across owners", () => {
    const merged = FeedPage_merge({
      results: [
        result("a", [40, 20], (id) => `2026-11-${id === 40 ? "20" : "10"}T10:00:00.000Z`, false),
        result("b", [30], () => "2026-11-15T10:00:00.000Z", false),
      ],
      previous: { owners: {} },
      limit: 2,
    });
    expect(merged.winners.map((w) => `${w.ownerId}:${w.record.id}`)).to.eql(["a:40", "b:30"]);
    expect(merged.hasMore).to.equal(true);
    expect(FeedPage_startKey(merged.next, "a")).to.eql({ userId: "a", id: 40, date: "2026-11-20T10:00:00.000Z" });
    expect(merged.next.owners.b).to.equal("done");
  });

  it("resumes inside a run of equal dates without skipping records", () => {
    const first = FeedPage_merge({
      results: [result("a", [5, 4, 3], sameDate, true)],
      previous: { owners: {} },
      limit: 2,
    });
    expect(first.winners.map((w) => w.record.id)).to.eql([5, 4]);
    expect(FeedPage_startKey(first.next, "a")).to.eql({ userId: "a", id: 4, date: sameDate() });
  });

  it("marks an owner done when all its records are taken and there is no next key", () => {
    const merged = FeedPage_merge({ results: [result("a", [5], sameDate, false)], previous: { owners: {} }, limit: 10 });
    expect(merged.next.owners.a).to.equal("done");
    expect(merged.hasMore).to.equal(false);
  });

  it("keeps a failed owner's position and reports it", () => {
    const previous: IFeedCursor = { owners: { a: { userId: "a", id: 9, date: "x" } } };
    const merged = FeedPage_merge({
      results: [{ ownerId: "a", records: [], failed: true }, result("b", [1], sameDate, false)],
      previous,
      limit: 10,
    });
    expect(merged.failedOwners).to.eql(["a"]);
    expect(merged.next.owners.a).to.eql({ userId: "a", id: 9, date: "x" });
    expect(merged.hasMore).to.equal(true);
  });
});
