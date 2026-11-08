import "mocha";
import { expect } from "chai";
import { LiftographPalette_entry, LiftographPalette_isHex } from "../src/liftograph/liftographPalette";

describe("LiftographPalette", () => {
  it("recognizes 3, 6 and 8 digit hex colors", () => {
    expect(LiftographPalette_isHex("#abc")).to.equal(true);
    expect(LiftographPalette_isHex("#8356F6")).to.equal(true);
    expect(LiftographPalette_isHex("#8356F680")).to.equal(true);
    expect(LiftographPalette_isHex("8356F6")).to.equal(false);
    expect(LiftographPalette_isHex("#8356G6")).to.equal(false);
    expect(LiftographPalette_isHex("#8356F")).to.equal(false);
  });

  it("uses a hex color as given and falls back to the palette otherwise", () => {
    expect(LiftographPalette_entry("#8356F6", 0)).to.eql({ stroke: "#8356F6", text: "#8356F6" });
    expect(LiftographPalette_entry("#nope", 1)).to.eql(LiftographPalette_entry(undefined, 1));
  });
});
