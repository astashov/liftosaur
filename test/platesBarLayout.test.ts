import "mocha";
import { expect } from "chai";
import { PlatesBarLayout_build, PlatesBarLayout_color } from "../src/utils/platesBarLayout";
import { Weight_build } from "../src/models/weight";
import { IUnit } from "../src/types";

function plates(unit: IUnit, ...values: number[]): ReturnType<typeof Weight_build>[] {
  return values.map((v) => Weight_build(v, unit));
}

describe("PlatesBarLayout", () => {
  it("uses the IWF colors for kg plates", () => {
    expect(plates("kg", 25, 20, 15, 10, 5, 2.5, 2, 1.5, 1, 0.5).map(PlatesBarLayout_color)).to.eql([
      "red",
      "blue",
      "yellow",
      "green",
      "white",
      "red",
      "blue",
      "yellow",
      "green",
      "white",
    ]);
  });

  it("uses the calibrated lb colors and iron for the rest", () => {
    expect(plates("lb", 55, 45, 35, 25, 10, 5, 2.5, 1.25).map(PlatesBarLayout_color)).to.eql([
      "red",
      "blue",
      "yellow",
      "green",
      "white",
      "iron",
      "iron",
      "iron",
    ]);
  });

  it("uses iron for a plate weight outside the standard sets", () => {
    expect(PlatesBarLayout_color(Weight_build(7.5, "kg"))).to.eql("iron");
    expect(PlatesBarLayout_color(Weight_build(33, "lb"))).to.eql("iron");
  });

  it("places plates left to right in the given order after the collar", () => {
    const layout = PlatesBarLayout_build(plates("lb", 45, 25, 10));
    expect(layout.plates.map((p) => p.color)).to.eql(["blue", "green", "white"]);
    expect(layout.plates[0].x).to.be.greaterThan(layout.collar.x + layout.collar.width);
    expect(layout.plates[1].x).to.be.greaterThan(layout.plates[0].x + layout.plates[0].width);
    expect(layout.plates[2].x).to.be.greaterThan(layout.plates[1].x + layout.plates[1].width);
    expect(layout.sleeve.x).to.be.greaterThan(layout.plates[2].x);
    expect(layout.width).to.eql(layout.sleeve.x + layout.sleeve.width);
  });

  it("draws lighter plates shorter and centered on the bar", () => {
    const layout = PlatesBarLayout_build(plates("kg", 20, 5, 2.5, 1.25));
    const heights = layout.plates.map((p) => p.height);
    expect(heights[0]).to.eql(layout.height);
    expect(heights[0]).to.be.greaterThan(heights[1]);
    expect(heights[1]).to.be.greaterThan(heights[2]);
    expect(heights[2]).to.be.greaterThan(heights[3]);
    for (const plate of layout.plates) {
      expect(plate.y + plate.height / 2).to.eql(layout.height / 2);
    }
  });

  it("gives 45 lb and 20 kg the same full size", () => {
    const lb = PlatesBarLayout_build(plates("lb", 45)).plates[0];
    const kg = PlatesBarLayout_build(plates("kg", 20)).plates[0];
    expect(lb.width).to.eql(kg.width);
    expect(lb.height).to.eql(kg.height);
  });

  it("stays narrow for a common loadout", () => {
    expect(PlatesBarLayout_build(plates("lb", 45, 25, 10)).width).to.be.lessThan(45);
  });

  it("stops drawing after twelve plates", () => {
    const layout = PlatesBarLayout_build(plates("lb", ...new Array(30).fill(45)));
    expect(layout.plates.length).to.eql(12);
    expect(layout.width).to.be.lessThan(120);
  });

  it("renders only the bar when there are no plates", () => {
    const layout = PlatesBarLayout_build([]);
    expect(layout.plates).to.eql([]);
    expect(layout.sleeve.x).to.eql(layout.collar.x + layout.collar.width);
  });
});
