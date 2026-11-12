import "mocha";
import { expect } from "chai";
import {
  IReactionRow,
  Reactions_applyMine,
  Reactions_isReaction,
  Reactions_ordered,
  Reactions_summarize,
} from "../src/models/reactions";

function row(reactorId: string, reaction: IReactionRow["reaction"], createdAt: number): IReactionRow {
  return { ownerId: "owner", recordId: 1, reactorId, reaction, createdAt };
}

describe("Reactions", () => {
  it("accepts only the dino allow-list", () => {
    expect(Reactions_isReaction("dino_flex")).to.equal(true);
    expect(Reactions_isReaction("dino_goodform")).to.equal(false);
    expect(Reactions_isReaction("<script>")).to.equal(false);
    expect(Reactions_isReaction(5)).to.equal(false);
  });

  it("counts reactions, marks mine and lists newest reactors first", () => {
    const summary = Reactions_summarize(
      [row("a", "dino_fire", 1), row("me", "dino_fire", 3), row("b", "dino_pr", 2)],
      "me",
      { a: "anna" }
    );
    expect(summary.counts).to.eql({ dino_fire: 2, dino_pr: 1 });
    expect(summary.mine).to.equal("dino_fire");
    expect(summary.total).to.equal(3);
    expect(summary.reactors.map((r) => r.userId)).to.eql(["me", "b", "a"]);
    expect(summary.reactors[2].nickname).to.equal("anna");
  });

  it("swaps my reaction without changing the total", () => {
    const before = Reactions_summarize([row("me", "dino_fire", 1), row("a", "dino_fire", 2)], "me", {});
    const after = Reactions_applyMine(before, { userId: "me" }, "dino_hug2");
    expect(after.counts).to.eql({ dino_fire: 1, dino_hug2: 1 });
    expect(after.mine).to.equal("dino_hug2");
    expect(after.total).to.equal(2);
  });

  it("removes my reaction and drops the empty count", () => {
    const before = Reactions_summarize([row("me", "dino_pr", 1)], "me", {});
    const after = Reactions_applyMine(before, { userId: "me" }, undefined);
    expect(after.counts).to.eql({});
    expect(after.mine).to.equal(undefined);
    expect(after.total).to.equal(0);
  });

  it("adds a first reaction to a workout with no summary", () => {
    const after = Reactions_applyMine(undefined, { userId: "me", nickname: "anton" }, "dino_flex");
    expect(after.counts).to.eql({ dino_flex: 1 });
    expect(after.reactors).to.eql([{ userId: "me", nickname: "anton" }]);
  });

  it("orders count pills by the picker order", () => {
    const summary = Reactions_summarize([row("a", "dino_hug2", 1), row("b", "dino_flex", 2)], "me", {});
    expect(Reactions_ordered(summary).map((r) => r.reaction)).to.eql(["dino_flex", "dino_hug2"]);
  });
});
