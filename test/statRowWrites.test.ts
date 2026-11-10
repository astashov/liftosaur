import "mocha";
import { expect } from "chai";
import { IStats } from "../src/types";
import { StatRowWrites_deletedNames, StatRowWrites_deletes, StatRowWrites_plan, StatRowWrites_rows } from "../lambda/utils/statRowWrites";

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

describe("StatRowWrites_deletedNames", () => {
  it("returns no names without stats versions", () => {
    expect(StatRowWrites_deletedNames(undefined)).to.eql([]);
  });

  it("builds row names from nested markers", () => {
    const names = StatRowWrites_deletedNames({
      weight: { weight: { items: {}, deleted: { "5": 100 } } },
      length: { neck: { deleted: { "6": 100 } } },
      percentage: { bodyfat: { deleted: { "7": 100 } } },
      health: { sleep: { deleted: { "8": 100 } } },
    });
    expect(names).to.have.members(["5_weight", "6_neck", "7_bodyfat", "8_sleep"]);
  });

  it("deletes only the marked measurement at a shared timestamp", () => {
    const names = StatRowWrites_deletedNames({
      weight: { weight: { deleted: { "5": 100 } } },
      length: { waist: { items: { "5": 100 } } },
    });
    expect(names).to.eql(["5_weight"]);
  });

  it("matches the names of stored rows", () => {
    const rows = StatRowWrites_rows(stats({ weights: [5, 6] }));
    const names = StatRowWrites_deletedNames({ weight: { weight: { deleted: { "5": 100 } } } });
    expect(rows.filter((row) => names.includes(row.name)).map((row) => row.timestamp)).to.eql([5]);
  });
});

describe("StatRowWrites_deletes", () => {
  it("skips an incoming marker the merged versions no longer hold", () => {
    const incoming = { weight: { weight: { deleted: { "5": 100, "6": 100 } } } };
    const merged = { weight: { weight: { items: { "5": 200 }, deleted: { "6": 100 } } } };
    expect(StatRowWrites_deletes(incoming, merged)).to.eql(["6_weight"]);
  });

  it("does not repeat old merged deletes the update did not send", () => {
    const merged = { weight: { weight: { deleted: { "5": 100 } } } };
    expect(StatRowWrites_deletes(undefined, merged)).to.eql([]);
  });
});

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
