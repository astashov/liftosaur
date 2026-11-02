import "mocha";
import { expect } from "chai";
import {
  ILineChartBarsSeries,
  LineChartBars_axisDomain,
  LineChartBars_width,
  LineChartBars_withZero,
} from "../src/components/lineChartBars";

describe("LineChartBars", () => {
  it("sizes bars to 70% of the closest gap, within 2 to 28 px", () => {
    expect(LineChartBars_width([0, 20, 60])).to.equal(14);
    expect(LineChartBars_width([0, 1, 2])).to.equal(2);
    expect(LineChartBars_width([0, 100])).to.equal(28);
    expect(LineChartBars_width([50])).to.equal(14);
  });

  it("stretches only the axis that holds a visible bars series down to zero", () => {
    const minMax = (lists: [number, number][][]): { yMin: number; yMax: number } => {
      const ys = lists.flat().map(([, y]) => y);
      return { yMin: Math.min(...ys), yMax: Math.max(...ys) };
    };
    const series: ILineChartBarsSeries[] = [
      { show: true, mark: "bars" },
      { show: true, mark: "line", axis: "right" },
    ];
    const points: [number, number][][] = [
      [[1, 100]],
      [
        [1, 50],
        [2, 80],
      ],
    ];
    expect(LineChartBars_axisDomain(series, points, "left", minMax)).to.eql({ yMin: 0, yMax: 100 });
    expect(LineChartBars_axisDomain(series, points, "right", minMax)).to.eql({ yMin: 50, yMax: 80 });
    const hiddenBars = [{ ...series[0], show: false }, series[1]];
    expect(LineChartBars_axisDomain(hiddenBars, points, "left", minMax)).to.eql({ yMin: 100, yMax: 100 });
  });

  it("stretches the y domain down to zero so bars start at 0", () => {
    expect(LineChartBars_withZero({ yMin: 90, yMax: 210 })).to.eql({ yMin: 0, yMax: 210 });
    expect(LineChartBars_withZero({ yMin: -5, yMax: 10 })).to.eql({ yMin: -5, yMax: 10 });
  });
});
