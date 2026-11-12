import "mocha";
import { expect } from "chai";
import {
  ThanksgivingPromo_codes,
  ThanksgivingPromo_isActive,
  ThanksgivingPromo_isEligible,
  ThanksgivingPromo_shouldShowModal,
} from "../src/models/thanksgivingPromo";

const duringPromo = new Date(2026, 10, 26, 12).getTime();

function eligible(overrides: Partial<Parameters<typeof ThanksgivingPromo_isEligible>[0]>): boolean {
  return ThanksgivingPromo_isEligible({
    now: duringPromo,
    platform: "ios",
    hasWorkouts: true,
    hasSubscription: false,
    ...overrides,
  });
}

describe("ThanksgivingPromo", () => {
  it("is active from the start of 24 Nov to the end of 2 Dec", () => {
    expect(ThanksgivingPromo_isActive(new Date(2026, 10, 23, 23, 59, 59).getTime())).to.equal(false);
    expect(ThanksgivingPromo_isActive(new Date(2026, 10, 24).getTime())).to.equal(true);
    expect(ThanksgivingPromo_isActive(new Date(2026, 11, 2, 23, 59, 59).getTime())).to.equal(true);
    expect(ThanksgivingPromo_isActive(new Date(2026, 11, 3).getTime())).to.equal(false);
  });

  it("shows only to native users with workouts and no subscription", () => {
    expect(eligible({})).to.equal(true);
    expect(eligible({ platform: "android" })).to.equal(true);
    expect(eligible({ platform: "web" })).to.equal(false);
    expect(eligible({ hasWorkouts: false })).to.equal(false);
    expect(eligible({ hasSubscription: true })).to.equal(false);
    expect(eligible({ now: new Date(2026, 11, 3).getTime() })).to.equal(false);
  });

  it("shows the modal once", () => {
    expect(ThanksgivingPromo_shouldShowModal(true, [])).to.equal(true);
    expect(ThanksgivingPromo_shouldShowModal(true, ["thanks25"])).to.equal(true);
    expect(ThanksgivingPromo_shouldShowModal(true, ["thanks26"])).to.equal(false);
    expect(ThanksgivingPromo_shouldShowModal(false, [])).to.equal(false);
  });

  it("gives iOS a code per plan and Android one code", () => {
    expect(ThanksgivingPromo_codes("ios").map((c) => c.code)).to.deep.equal(["THANKS26", "THANKS26Y"]);
    expect(ThanksgivingPromo_codes("android").map((c) => c.code)).to.deep.equal(["THANKS26"]);
  });
});
