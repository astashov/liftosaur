import "mocha";
import { expect } from "chai";
import {
  InboundSocial_parseRequest,
  InboundSocial_shouldRequest,
  InboundSocial_sinceRecordId,
  InboundSocial_summaries,
} from "../src/models/inboundSocial";
import { IReactionRow } from "../src/models/reactions";
import { FriendsFixtures_record } from "./friendsFixtures";

function row(recordId: number, reactorId: string, overrides: Partial<IReactionRow> = {}): IReactionRow {
  return { ownerId: "boris", recordId, reactorId, reaction: "dino_fire", createdAt: recordId, ...overrides };
}

describe("InboundSocial", () => {
  it("accepts only a finite, non-negative sinceRecordId", () => {
    expect(InboundSocial_parseRequest({ sinceRecordId: 1000 })).to.eql({ sinceRecordId: 1000 });
    expect(InboundSocial_parseRequest({ sinceRecordId: 0 })).to.eql({ sinceRecordId: 0 });
    expect(InboundSocial_parseRequest({ sinceRecordId: -1 })).to.equal(undefined);
    expect(InboundSocial_parseRequest({ sinceRecordId: "1000" })).to.equal(undefined);
    expect(InboundSocial_parseRequest(undefined)).to.equal(undefined);
    expect(InboundSocial_parseRequest("social")).to.equal(undefined);
  });

  it("asks from the start for a short history, and from the 100th newest workout otherwise", () => {
    const short = [3, 1, 2].map((id) => FriendsFixtures_record(id, "2026-11-01T10:00:00.000Z"));
    expect(InboundSocial_sinceRecordId(short)).to.equal(0);
    const long = Array.from({ length: 150 }, (_, i) => FriendsFixtures_record(i + 1, "2026-11-01T10:00:00.000Z"));
    expect(InboundSocial_sinceRecordId(long)).to.equal(51);
  });

  it("asks only on forced syncs of the native app", () => {
    expect(InboundSocial_shouldRequest({ isForced: true, isNative: true })).to.equal(true);
    expect(InboundSocial_shouldRequest({ isForced: false, isNative: true })).to.equal(false);
    expect(InboundSocial_shouldRequest({ isForced: true, isNative: false })).to.equal(false);
  });

  it("summarizes per workout and hides people who no longer follow", () => {
    const rows = [row(1000, "anna"), row(1000, "carl"), row(2000, "boris", { reaction: "dino_pr" }), row(3000, "carl")];
    const summaries = InboundSocial_summaries(rows, "boris", ["anna"], { anna: "Anna" });
    expect(Object.keys(summaries).sort()).to.eql(["1000", "2000"]);
    expect(summaries["1000"]?.total).to.equal(1);
    expect(summaries["1000"]?.reactors).to.eql([{ nickname: "Anna" }]);
    expect(summaries["2000"]?.mine).to.equal("dino_pr");
  });

  it("ignores rows of other owners", () => {
    expect(InboundSocial_summaries([row(1000, "anna", { ownerId: "carl" })], "boris", ["anna"], {})).to.eql({});
  });
});
