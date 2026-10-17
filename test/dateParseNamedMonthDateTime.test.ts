import "mocha";
import { expect } from "chai";
import { DateUtils_parseNamedMonthDateTime } from "../src/utils/date";

describe("DateUtils_parseNamedMonthDateTime", () => {
  it("parses day-first 24-hour dates", () => {
    expect(DateUtils_parseNamedMonthDateTime("13 Mar 2026, 15:22")).to.equal(new Date(2026, 2, 13, 15, 22).getTime());
  });

  it("parses month-first 12-hour dates", () => {
    expect(DateUtils_parseNamedMonthDateTime("Oct 17, 2026, 8:30 PM")).to.equal(
      new Date(2026, 9, 17, 20, 30).getTime()
    );
  });

  it("maps 12 AM to midnight and 12 PM to noon", () => {
    expect(DateUtils_parseNamedMonthDateTime("Oct 17, 2026, 12:05 AM")).to.equal(
      new Date(2026, 9, 17, 0, 5).getTime()
    );
    expect(DateUtils_parseNamedMonthDateTime("Oct 17, 2026, 12:05 PM")).to.equal(
      new Date(2026, 9, 17, 12, 5).getTime()
    );
  });

  it("accepts full month names, seconds and narrow no-break spaces", () => {
    expect(DateUtils_parseNamedMonthDateTime("17 September 2026 08:30:15")).to.equal(
      new Date(2026, 8, 17, 8, 30, 15).getTime()
    );
    expect(DateUtils_parseNamedMonthDateTime("Sept 17, 2026, 8:30 AM")).to.equal(
      new Date(2026, 8, 17, 8, 30).getTime()
    );
  });

  it("rejects strings missing a part or with an extra one", () => {
    expect(DateUtils_parseNamedMonthDateTime("Oct 2026, 8:30 AM")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("Oct 17, 2026")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("Fri, Oct 17, 2026, 8:30 AM")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("Oct 17 18, 2026, 8:30 AM")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("10/17/2026 08:30")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("garbage")).to.equal(undefined);
  });

  it("rejects out-of-range values instead of rolling them over", () => {
    expect(DateUtils_parseNamedMonthDateTime("31 Feb 2026, 10:00")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("13 Mar 2026, 24:00")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("13 Mar 2026, 13:00 PM")).to.equal(undefined);
    expect(DateUtils_parseNamedMonthDateTime("13 Mar 2026, 10:60")).to.equal(undefined);
  });
});
