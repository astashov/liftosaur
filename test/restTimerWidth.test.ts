import "mocha";
import { expect } from "chai";
import { RestTimerWidth_em } from "../src/models/restTimerWidth";

describe("RestTimerWidth_em", () => {
  it("gives every MM:SS time the same width", () => {
    expect(RestTimerWidth_em("01:11")).to.equal(RestTimerWidth_em("44:44"));
  });

  it("sizes four widest digits and one colon", () => {
    expect(RestTimerWidth_em("04:32")).to.be.closeTo(4 * 0.677 + 0.284, 1e-9);
  });

  it("grows with an hours part", () => {
    expect(RestTimerWidth_em("1:04:32")).to.be.greaterThan(RestTimerWidth_em("04:32"));
  });
});
