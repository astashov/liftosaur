import "mocha";
import { expect } from "chai";
import {
  MuscleMapRegions_iconView,
  MuscleMapRegions_ofMuscle,
  MuscleMapRegions_paths,
  MuscleMapRegions_styles,
} from "../src/models/muscleMapRegions";
import { Muscle_getMusclesFromScreenMuscle } from "../src/models/muscle";
import { Settings_build } from "../src/models/settings";
import { IMuscle, screenMuscles } from "../src/types";

function groupedMuscles(): IMuscle[] {
  const settings = Settings_build();
  return Array.from(new Set(screenMuscles.flatMap((group) => Muscle_getMusclesFromScreenMuscle(group, settings))));
}

describe("MuscleMapRegions_styles", () => {
  it("gives every grouped muscle except levator scapulae a region that exists in the paths", () => {
    for (const muscle of groupedMuscles()) {
      const regions = (["front", "back"] as const).flatMap((side) =>
        MuscleMapRegions_ofMuscle(side, muscle).map((region) => ({ side, region }))
      );
      if (muscle === "Levator Scapulae") {
        expect(regions).to.be.empty;
        continue;
      }
      expect(regions, muscle).to.not.be.empty;
      for (const { side, region } of regions) {
        expect(MuscleMapRegions_paths(side)[region], `${muscle} ${side} ${region}`).to.not.equal(undefined);
      }
    }
  });

  it("takes the higher intensity on a region two groups share", () => {
    const styles = MuscleMapRegions_styles({ obliques: 0.2, hipFlexors: 0.7 }, {}, Settings_build(), "#000");
    expect(styles.front["031"]).to.deep.equal({ opacity: 0.7, fill: "#000" });
    expect(styles.front["041"]).to.deep.equal({ opacity: 0.2, fill: "#000" });
  });

  it("lights calves on both sides", () => {
    const styles = MuscleMapRegions_styles({ calves: 1 }, {}, Settings_build(), "#000");
    expect(Object.keys(styles.front).sort()).to.deep.equal(["080", "081", "082", "083", "084"]);
    expect(styles.back["081"]).to.deep.equal({ opacity: 1, fill: "#000" });
  });

  it("lights only the side where the group's muscles are", () => {
    const styles = MuscleMapRegions_styles({ rearDelts: 1 }, {}, Settings_build(), "#000");
    expect(Object.keys(styles.back).sort()).to.deep.equal(["008", "009"]);
    expect(styles.front).to.deep.equal({});
  });

  it("colors a custom group through its muscles", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.grip = { name: "Grip", muscles: ["Wrist Flexors"] };
    const styles = MuscleMapRegions_styles({ grip: 0.4 }, {}, settings, "#000");
    expect(styles.front["039"]).to.deep.equal({ opacity: 0.4, fill: "#000" });
  });
});

describe("MuscleMapRegions_iconView", () => {
  it("picks the back for rotator cuff and calves, and the front for hip flexors", () => {
    const settings = Settings_build();
    expect(MuscleMapRegions_iconView("rotatorCuff", settings)?.side).to.equal("back");
    expect(MuscleMapRegions_iconView("calves", settings)?.side).to.equal("back");
    expect(MuscleMapRegions_iconView("hipFlexors", settings)?.side).to.equal("front");
  });

  it("gives every built-in group an icon with the same aspect ratio and a minimum size", () => {
    const settings = Settings_build();
    for (const group of screenMuscles) {
      const view = MuscleMapRegions_iconView(group, settings);
      expect(view, group).to.not.equal(undefined);
      const [, , width, height] = view!.viewBox;
      expect(width / height).to.be.closeTo(61 / 48, 0.0001);
      expect(height).to.be.at.least(60);
      expect(view!.regions.some((region) => region.isGroup)).to.equal(true);
    }
    expect(MuscleMapRegions_iconView("neck", settings)!.viewBox[3]).to.equal(60);
  });

  it("gives a custom group an icon, and none when no muscle has a region", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.grip = { name: "Grip", muscles: ["Wrist Flexors"] };
    settings.muscleGroups.data.levator = { name: "Levator", muscles: ["Levator Scapulae"] };
    expect(MuscleMapRegions_iconView("grip", settings)?.side).to.equal("front");
    expect(MuscleMapRegions_iconView("levator", settings)).to.equal(undefined);
  });
});
