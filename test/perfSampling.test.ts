import "mocha";
import { expect } from "chai";
import { PerfSampling_decideFor } from "../src/utils/perfSampling";

describe("PerfSampling_decideFor", () => {
  it("includes the lowest draws in tier1", () => {
    expect(PerfSampling_decideFor(0).tier1).to.equal(true);
    expect(PerfSampling_decideFor(0.005).tier1).to.equal(true);
  });

  it("keeps tier1 monotonic in the sampling draw (a smaller draw is never excluded when a larger one is included)", () => {
    for (let i = 1; i < 100; i += 1) {
      const lower = PerfSampling_decideFor((i - 1) / 100);
      const higher = PerfSampling_decideFor(i / 100);
      if (higher.tier1) {
        expect(lower.tier1).to.equal(true);
      }
    }
  });

  it("keeps tier2 disabled while the raw-stream backend is deferred", () => {
    expect(PerfSampling_decideFor(0).tier2).to.equal(false);
    expect(PerfSampling_decideFor(0.005).tier2).to.equal(false);
    expect(PerfSampling_decideFor(0.5).tier2).to.equal(false);
  });

  it("keeps tier2 a strict subset of tier1 across the unit interval", () => {
    for (let i = 0; i < 100; i += 1) {
      const d = PerfSampling_decideFor(i / 100);
      if (d.tier2) {
        expect(d.tier1).to.equal(true);
      }
    }
  });
});
