import "mocha";
import { expect } from "chai";
import {
  HealthDaily_localDayStartMs,
  HealthDaily_windowStartMs,
  HealthDaily_dayKey,
  HealthDaily_sumByDay,
  HealthDaily_sleepMinutesByDay,
  HealthDaily_buildValues,
} from "../src/utils/healthDaily";

describe("HealthDaily", () => {
  it("localDayStartMs buckets a timestamp to local midnight", () => {
    const midday = new Date(2026, 6, 14, 9, 30, 15).getTime();
    expect(HealthDaily_localDayStartMs(midday)).to.equal(new Date(2026, 6, 14, 0, 0, 0, 0).getTime());
  });

  it("dayKey formats local YYYY-MM-DD with zero padding", () => {
    const jan5 = new Date(2026, 0, 5, 12, 0).getTime();
    expect(HealthDaily_dayKey(HealthDaily_localDayStartMs(jan5))).to.equal("2026-01-05");
  });

  it("sumByDay aggregates samples on the same local day and separates different days", () => {
    const day14morning = new Date(2026, 6, 14, 8, 0).getTime();
    const day14evening = new Date(2026, 6, 14, 20, 0).getTime();
    const day15 = new Date(2026, 6, 15, 8, 0).getTime();
    const byDay = HealthDaily_sumByDay([
      { timestamp: day14morning, value: 500 },
      { timestamp: day14evening, value: 700 },
      { timestamp: day15, value: 300 },
    ]);
    expect(byDay.size).to.equal(2);
    expect(byDay.get(HealthDaily_localDayStartMs(day14morning))).to.equal(1200);
    expect(byDay.get(HealthDaily_localDayStartMs(day15))).to.equal(300);
  });

  it("sumByDay ignores zero and negative values", () => {
    const t = new Date(2026, 6, 14, 8, 0).getTime();
    const byDay = HealthDaily_sumByDay([
      { timestamp: t, value: 0 },
      { timestamp: t, value: -5 },
    ]);
    expect(byDay.size).to.equal(0);
  });

  it("windowStartMs aligns the read window to local midnight so the boundary day is read in full", () => {
    // Sync mid-afternoon: a naive `now - windowDays*24h` start would begin the oldest day at 15:30,
    // reading only a partial total for it and overwriting a complete aggregate on replace.
    const now = new Date(2026, 6, 14, 15, 30, 0).getTime();
    const start = HealthDaily_windowStartMs(now, 30);

    // Start is exactly local midnight (no time-of-day component carried over).
    expect(HealthDaily_localDayStartMs(start)).to.equal(start);
    // ...on the day `windowDays` back, and never later than the naive cutoff (so the day is fully covered).
    expect(start).to.equal(HealthDaily_localDayStartMs(now - 30 * 24 * 60 * 60 * 1000));
    expect(start).to.be.at.most(now - 30 * 24 * 60 * 60 * 1000);
  });

  it("sleepMinutesByDay merges overlapping intervals so multi-source sleep isn't double-counted", () => {
    const wakeDay = new Date(2026, 6, 14, 0, 0, 0, 0).getTime();
    const h = 60 * 60 * 1000;
    // Three overlapping records of the same night from different sources (Apple Watch + Oura, etc.):
    // 23:00->07:00, 23:30->06:30 (inside), 06:30->07:30 (extends the tail). Union = 23:00->07:30 = 8.5h.
    const byDay = HealthDaily_sleepMinutesByDay([
      { start: wakeDay - 1 * h, end: wakeDay + 7 * h },
      { start: wakeDay - 0.5 * h, end: wakeDay + 6.5 * h },
      { start: wakeDay + 6.5 * h, end: wakeDay + 7.5 * h },
    ]);
    // Raw sum would be 8 + 7 + 1 = 16h; merged union is 8.5h = 510 min, attributed to the wake day.
    expect(byDay.size).to.equal(1);
    expect(byDay.get(wakeDay)).to.equal(510);
  });

  it("sleepMinutesByDay keeps non-overlapping naps separate", () => {
    const day = new Date(2026, 6, 14, 0, 0, 0, 0).getTime();
    const h = 60 * 60 * 1000;
    const byDay = HealthDaily_sleepMinutesByDay([
      { start: day + 2 * h, end: day + 3 * h }, // 1h nap
      { start: day + 14 * h, end: day + 15.5 * h }, // 1.5h nap, no overlap
    ]);
    expect(byDay.get(day)).to.equal(150);
  });

  it("buildValues rounds sleep/calories to integers, protein to 0.1, with stable per-day uuid", () => {
    const dayStart = new Date(2026, 6, 14, 0, 0, 0, 0).getTime();

    const sleep = HealthDaily_buildValues("sleep", new Map([[dayStart, 452.6]]));
    expect(sleep).to.have.lengthOf(1);
    expect(sleep[0]).to.deep.include({
      type: "sleep",
      value: 453,
      timestamp: dayStart,
      uuid: "sleep-2026-07-14",
    });

    const calories = HealthDaily_buildValues("calories", new Map([[dayStart, 2119.7]]));
    expect(calories[0].value).to.equal(2120);
    expect(calories[0].uuid).to.equal("calories-2026-07-14");

    const protein = HealthDaily_buildValues("protein", new Map([[dayStart, 150.46]]));
    expect(protein[0].value).to.equal(150.5);
    expect(protein[0].uuid).to.equal("protein-2026-07-14");
  });
});
