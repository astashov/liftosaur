import "mocha";
import { expect } from "chai";
import { NavOptionsChanged_isChanged } from "../src/navigation/navOptionsChanged";

describe("NavOptionsChanged_isChanged", () => {
  it("is changed on the first call", () => {
    expect(NavOptionsChanged_isChanged(undefined, { navTitle: "Workout" })).to.equal(true);
  });

  it("is unchanged when every value keeps its identity", () => {
    const subtitle = {};
    expect(
      NavOptionsChanged_isChanged(
        { navTitle: "Workout", navSubtitle: subtitle },
        { navTitle: "Workout", navSubtitle: subtitle }
      )
    ).to.equal(false);
  });

  it("is changed when a value changes identity", () => {
    expect(NavOptionsChanged_isChanged({ navSubtitle: {} }, { navSubtitle: {} })).to.equal(true);
  });

  it("is changed when a key is added or removed", () => {
    expect(NavOptionsChanged_isChanged({ navTitle: "a" }, { navTitle: "a", navSubtitle: undefined })).to.equal(true);
    expect(NavOptionsChanged_isChanged({ navTitle: "a", navOnTitleClick: undefined }, { navTitle: "a" })).to.equal(
      true
    );
  });
});
