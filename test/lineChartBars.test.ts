import "mocha";
import { expect } from "chai";
import { LineChartBars_width, LineChartBars_withZero } from "../src/components/lineChartBars";

describe("LineChartBars", () => {
  it("sizes bars to 70% of the closest gap, within 2 to 28 px", () => {
    expect(LineChartBars_width([0, 20, 60])).to.equal(14);
    expect(LineChartBars_width([0, 1, 2])).to.equal(2);
    expect(LineChartBars_width([0, 100])).to.equal(28);
    expect(LineChartBars_width([50])).to.equal(14);
  });

  it("stretches the y domain down to zero so bars start at 0", () => {
    expect(LineChartBars_withZero({ yMin: 90, yMax: 210 })).to.eql({ yMin: 0, yMax: 210 });
    expect(LineChartBars_withZero({ yMin: -5, yMax: 10 })).to.eql({ yMin: -5, yMax: 10 });
  });
});
