import "mocha";
import { expect } from "chai";
import { UngroupedMuscles_list, UngroupedMuscles_pointsPerSet } from "../src/models/ungroupedMuscles";
import { Settings_build } from "../src/models/settings";
import { MuscleRangeDisplay_weekIntensities } from "../src/models/muscleRangeDisplay";
import { MuscleMapRegions_styles } from "../src/models/muscleMapRegions";

describe("UngroupedMuscles", () => {
  it("lists the muscles that no built-in group holds", () => {
    expect(UngroupedMuscles_list(Settings_build()).sort()).to.deep.equal(["Serratus Anterior", "Tibialis Anterior"]);
  });

  it("drops a muscle from the list once a custom group holds it", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.serratus = { name: "Serratus", muscles: ["Serratus Anterior"] };
    expect(UngroupedMuscles_list(settings)).to.not.include("Serratus Anterior");
  });

  it("adds a muscle to the list when its only group is hidden", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.neck = { isHidden: true };
    expect(UngroupedMuscles_list(settings)).to.include.members(["Sternocleidomastoid", "Splenius"]);
  });

  it("counts a target as 1 and a synergist with its multiplier", () => {
    const settings = Settings_build();
    expect(UngroupedMuscles_pointsPerSet({ id: "cycling", equipment: "bodyweight" }, settings)).to.deep.equal({
      "Tibialis Anterior": 1,
    });
    expect(UngroupedMuscles_pointsPerSet({ id: "lateralRaise", equipment: "dumbbell" }, settings)).to.deep.equal({
      "Serratus Anterior": 0.5,
    });
  });

  it("scales ungrouped muscles like a group with no range", () => {
    const planner = Settings_build().planner;
    const intensities = MuscleRangeDisplay_weekIntensities(
      { chest: { strength: 0, hypertrophy: 9 } },
      { "Serratus Anterior": 3 },
      planner
    );
    expect(intensities.groups.chest).to.equal(0.5);
    expect(intensities.ungroupedMuscles["Serratus Anterior"]).to.equal(3 / 18);
  });

  it("lights the regions of an ungrouped muscle on the map", () => {
    const styles = MuscleMapRegions_styles({}, { "Tibialis Anterior": 0.4 }, Settings_build(), "#000");
    expect(styles.front["085"]).to.deep.equal({ opacity: 0.4, fill: "#000" });
    expect(styles.front["086"]).to.deep.equal({ opacity: 0.4, fill: "#000" });
  });
});
