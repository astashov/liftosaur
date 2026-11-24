import "mocha";
import { expect } from "chai";
import { LiftoscriptRandom_init, LiftoscriptRandom_int, LiftoscriptRandom_seed } from "../src/liftoscriptRandom";

function draw(seed: number, count: number, min: number, max: number): number[] {
  const state = LiftoscriptRandom_init(seed);
  return Array.from({ length: count }, () => LiftoscriptRandom_int(state, min, max));
}

describe("LiftoscriptRandom", () => {
  it("returns the same numbers for the same seed on every platform", () => {
    expect(draw(0, 5, 1, 100)).to.eql([46, 53, 89, 12, 87]);
    expect(draw(1, 5, 1, 100)).to.eql([43, 3, 18, 81, 8]);
    expect(draw(123456789, 5, 1, 100)).to.eql([47, 51, 97, 14, 45]);
  });

  it("returns a different number on each call", () => {
    const values = draw(7, 20, 1, 1000000);
    expect(new Set(values).size).to.equal(20);
  });

  it("stays within the bounds, both included", () => {
    const values = draw(42, 10000, 2, 11);
    expect(Math.min(...values)).to.equal(2);
    expect(Math.max(...values)).to.equal(11);
  });

  it("spreads values evenly", () => {
    const counts = new Map<number, number>();
    for (const value of draw(42, 100000, 2, 11)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).to.be.within(9500, 10500);
    }
  });

  it("accepts swapped bounds", () => {
    expect(draw(3, 50, 11, 2)).to.eql(draw(3, 50, 2, 11));
  });

  it("returns the bound when min equals max", () => {
    expect(draw(3, 5, 4, 4)).to.eql([4, 4, 4, 4, 4]);
  });

  it("gives the same seed to the same workout, exercise and run", () => {
    const a = LiftoscriptRandom_seed(1764000000000, "squat", { kind: "finish" });
    const b = LiftoscriptRandom_seed(1764000000000, "squat", { kind: "finish" });
    expect(a).to.equal(b);
  });

  it("gives different seeds to different workouts, exercises and runs", () => {
    const base = LiftoscriptRandom_seed(1764000000000, "squat", { kind: "finish" });
    expect(LiftoscriptRandom_seed(1764000000001, "squat", { kind: "finish" })).to.not.equal(base);
    expect(LiftoscriptRandom_seed(1764000000000, "bench", { kind: "finish" })).to.not.equal(base);
    expect(LiftoscriptRandom_seed(1764000000000, "squat", { kind: "update", setIndex: -1 })).to.not.equal(base);
    expect(LiftoscriptRandom_seed(1764000000000, "squat", { kind: "update", setIndex: 0 })).to.not.equal(
      LiftoscriptRandom_seed(1764000000000, "squat", { kind: "update", setIndex: -1 })
    );
  });
});
