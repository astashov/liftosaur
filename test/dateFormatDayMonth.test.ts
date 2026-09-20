import "mocha";
import { expect } from "chai";
import { DateUtils_formatDayMonth } from "../src/utils/date";

describe("DateUtils_formatDayMonth", () => {
  const now = new Date(2026, 8, 19, 12).getTime();

  it("drops the year inside the current year", () => {
    expect(DateUtils_formatDayMonth(new Date(2026, 8, 16, 12).getTime(), now)).to.not.match(/2026/);
  });

  it("keeps the year for another year", () => {
    expect(DateUtils_formatDayMonth(new Date(2025, 11, 14, 12).getTime(), now)).to.match(/2025/);
  });
});
