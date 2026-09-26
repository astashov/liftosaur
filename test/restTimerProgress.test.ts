import "mocha";
import { expect } from "chai";
import { RestTimerProgress_at } from "../src/models/restTimerProgress";

describe("RestTimerProgress_at", () => {
  it("starts empty with the whole rest remaining", () => {
    expect(RestTimerProgress_at(1000, 90, 1000)).to.eql({
      elapsedMs: 0,
      remainingMs: 90000,
      fraction: 0,
      isTimeOut: false,
    });
  });

  it("fills in proportion to the elapsed time", () => {
    expect(RestTimerProgress_at(1000, 90, 46000)).to.eql({
      elapsedMs: 45000,
      remainingMs: 45000,
      fraction: 0.5,
      isTimeOut: false,
    });
  });

  it("is full but not timed out at exactly the rest duration", () => {
    expect(RestTimerProgress_at(1000, 90, 91000)).to.eql({
      elapsedMs: 90000,
      remainingMs: 0,
      fraction: 1,
      isTimeOut: false,
    });
  });

  it("times out once the rest runs past its duration", () => {
    expect(RestTimerProgress_at(1000, 90, 200000)).to.eql({
      elapsedMs: 199000,
      remainingMs: 0,
      fraction: 1,
      isTimeOut: true,
    });
  });

  it("treats a start time in the future as zero elapsed", () => {
    expect(RestTimerProgress_at(5000, 60, 1000)).to.eql({
      elapsedMs: 0,
      remainingMs: 60000,
      fraction: 0,
      isTimeOut: false,
    });
  });

  it("is full for a zero or negative duration", () => {
    expect(RestTimerProgress_at(1000, 0, 1000).fraction).to.equal(1);
    expect(RestTimerProgress_at(1000, -15, 1000)).to.eql({
      elapsedMs: 0,
      remainingMs: 0,
      fraction: 1,
      isTimeOut: true,
    });
  });
});
