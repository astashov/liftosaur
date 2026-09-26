import "mocha";
import { expect } from "chai";
import { IStats } from "../src/types";
import { StatRowWrites_plan } from "../lambda/utils/statRowWrites";

function stat(
  timestamp: number,
  value: number
): { timestamp: number; updatedAt: number; value: number; vtype: "stat" } {
  return { timestamp, updatedAt: timestamp, value, vtype: "stat" };
}

function stats(args: { weights?: number[]; sleep?: number[] | null }): IStats {
  const weight = (args.weights || []).map((t) => ({ ...stat(t, 80), value: { value: 80, unit: "kg" as const } }));
  return {
    weight: { weight },
    length: {},
    percentage: {},
    ...(args.sleep === null ? {} : { health: { sleep: (args.sleep || []).map((t) => stat(t, 420)) } }),
  } as IStats;
}

describe("StatRowWrites_plan", () => {
  it("deletes removed rows and puts only changed ones with a snapshot", () => {
    const plan = StatRowWrites_plan(
      stats({ weights: [1, 2], sleep: [5] }),
      stats({ weights: [1, 3], sleep: [5] }),
      false
    );
    expect(plan.puts.map((r) => r.name)).to.eql(["3_weight"]);
    expect(plan.deleteNames).to.eql(["2_weight"]);
  });

  it("puts every row without a snapshot, and deletes the same rows", () => {
    const plan = StatRowWrites_plan(
      stats({ weights: [1, 2], sleep: [5] }),
      stats({ weights: [1, 3], sleep: [5] }),
      true
    );
    expect(plan.puts.map((r) => r.name)).to.eql(["1_weight", "3_weight", "5_sleep"]);
    expect(plan.deleteNames).to.eql(["2_weight"]);
  });

  it("keeps health rows when the new stats have no health key", () => {
    const plan = StatRowWrites_plan(stats({ weights: [1], sleep: [5] }), stats({ weights: [1], sleep: null }), false);
    expect(plan.deleteNames).to.eql([]);
  });

  it("deletes health rows when the new stats have an empty health key", () => {
    const plan = StatRowWrites_plan(stats({ weights: [1], sleep: [5] }), stats({ weights: [1], sleep: [] }), false);
    expect(plan.deleteNames).to.eql(["5_sleep"]);
  });
});
