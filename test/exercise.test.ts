import "mocha";
import { expect } from "chai";
import {
  Exercise_all,
  Exercise_allExpanded,
  Exercise_searchNames,
  Exercise_filterCustomExercises,
  Exercise_filterCustomExercisesByType,
  Exercise_findById,
  Exercise_findIdByName,
  Exercise_findByNameAndEquipment,
  Exercise_getWarmupSets,
} from "../src/models/exercise";
import {
  IAllCustomExercises,
  ICustomExercise,
  IExerciseType,
  IProgramExerciseWarmupSet,
  ISettings,
  IWeight,
} from "../src/types";
import { Settings_build } from "../src/models/settings";
import { EquipmentSetup_save } from "../src/models/equipmentSetup";
import { Weight_build } from "../src/models/weight";

function buildCustom(id: string, name: string, isDeleted: boolean): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id: id as ICustomExercise["id"],
    name,
    isDeleted,
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
  };
}

describe("Exercise — deleted custom exercises", () => {
  const customExercises: IAllCustomExercises = {
    "custom-active": buildCustom("custom-active", "Active Curl", false),
    "custom-deleted": buildCustom("custom-deleted", "Deleted Curl", true),
  };

  it("Exercise_all excludes deleted custom exercises", () => {
    const names = Exercise_all(customExercises).map((e) => e.name);
    expect(names).to.include("Active Curl");
    expect(names).to.not.include("Deleted Curl");
  });

  it("Exercise_allExpanded excludes deleted custom exercises", () => {
    const names = Exercise_allExpanded(customExercises).map((e) => e.name);
    expect(names).to.include("Active Curl");
    expect(names).to.not.include("Deleted Curl");
  });

  it("Exercise_searchNames excludes deleted custom exercises", () => {
    expect(Exercise_searchNames("Active Curl", customExercises)).to.include("Active Curl");
    expect(Exercise_searchNames("Deleted Curl", customExercises)).to.not.include("Deleted Curl");
  });

  it("Exercise_filterCustomExercises excludes deleted", () => {
    const filtered = Exercise_filterCustomExercises(customExercises, "Curl");
    expect(filtered["custom-active"]).to.exist;
    expect(filtered["custom-deleted"]).to.not.exist;
  });

  it("Exercise_filterCustomExercisesByType excludes deleted", () => {
    const settings = { exercises: customExercises } as Parameters<typeof Exercise_filterCustomExercisesByType>[1];
    const filtered = Exercise_filterCustomExercisesByType([], settings);
    expect(filtered["custom-deleted"]).to.not.exist;
  });

  it("name/id resolution still finds deleted custom exercises (history/import path)", () => {
    expect(Exercise_findIdByName("Deleted Curl", customExercises)).to.eql("custom-deleted");
    expect(Exercise_findById("custom-deleted" as ICustomExercise["id"], customExercises)?.name).to.eql("Deleted Curl");
  });
});

describe("Exercise — custom exercise wins over built-in on name collision", () => {
  const customExercises: IAllCustomExercises = {
    "custom-squat": buildCustom("custom-squat", "Squat", false),
  };

  it("Exercise_findIdByName prefers the custom exercise when the name matches a built-in", () => {
    expect(Exercise_findIdByName("Squat", customExercises)).to.eql("custom-squat");
  });

  it("Exercise_findIdByName resolves to the built-in when there is no colliding custom exercise", () => {
    expect(Exercise_findIdByName("Squat", {})).to.eql("squat");
  });

  it("Exercise_findByNameAndEquipment prefers the custom exercise (with and without equipment)", () => {
    expect(Exercise_findByNameAndEquipment("Squat", customExercises)?.id).to.eql("custom-squat");
    expect(Exercise_findByNameAndEquipment("Squat, Barbell", customExercises)?.id).to.eql("custom-squat");
  });

  it("Exercise_findByNameAndEquipment falls back to the built-in when no custom collides", () => {
    expect(Exercise_findByNameAndEquipment("Squat", {})?.id).to.eql("squat");
  });
});

describe("Exercise — deleted custom exercise colliding with a built-in", () => {
  const customExercises: IAllCustomExercises = {
    "custom-legext": buildCustom("custom-legext", "Leg Extension", true),
  };

  it("Exercise_findIdByName resolves to the built-in, not the deleted custom", () => {
    expect(Exercise_findIdByName("Leg Extension", customExercises)).to.eql("legExtension");
  });

  it("Exercise_findByNameAndEquipment resolves to the built-in with parsed equipment", () => {
    const exercise = Exercise_findByNameAndEquipment("Leg Extension, Leverage Machine", customExercises);
    expect(exercise?.id).to.eql("legExtension");
    expect(exercise?.equipment).to.eql("leverageMachine");
  });

  it("a live custom with the same name still wins over the built-in", () => {
    const withLive: IAllCustomExercises = {
      ...customExercises,
      "custom-live": buildCustom("custom-live", "Leg Extension", false),
    };
    expect(Exercise_findIdByName("Leg Extension", withLive)).to.eql("custom-live");
  });
});

describe("Exercise — custom exercises named 'X' and 'X, <Equipment>' coexist", () => {
  const customExercises: IAllCustomExercises = {
    "custom-bare": buildCustom("custom-bare", "Chest Supported Row", false),
    "custom-full": buildCustom("custom-full", "Chest Supported Row, Dumbbell", false),
  };

  it("exact full-name custom match wins over bare-name custom + parsed equipment", () => {
    const exercise = Exercise_findByNameAndEquipment("Chest Supported Row, Dumbbell", customExercises);
    expect(exercise?.id).to.eql("custom-full");
    expect(exercise?.equipment).to.eql(undefined);
  });

  it("bare name still resolves to the bare custom exercise", () => {
    expect(Exercise_findByNameAndEquipment("Chest Supported Row", customExercises)?.id).to.eql("custom-bare");
  });

  it("bare custom + parsed equipment still resolves when no full-name custom exists", () => {
    const onlyBare: IAllCustomExercises = { "custom-bare": buildCustom("custom-bare", "Chest Supported Row", false) };
    const exercise = Exercise_findByNameAndEquipment("Chest Supported Row, Dumbbell", onlyBare);
    expect(exercise?.id).to.eql("custom-bare");
    expect(exercise?.equipment).to.eql("dumbbell");
  });

  it("a deleted full-name custom no longer beats the live bare-name custom", () => {
    const withDeletedFull: IAllCustomExercises = {
      "custom-bare": buildCustom("custom-bare", "Chest Supported Row", false),
      "custom-full": buildCustom("custom-full", "Chest Supported Row, Dumbbell", true),
    };
    const exercise = Exercise_findByNameAndEquipment("Chest Supported Row, Dumbbell", withDeletedFull);
    expect(exercise?.id).to.eql("custom-bare");
    expect(exercise?.equipment).to.eql("dumbbell");
  });

  it("when both customs are deleted, the exact full-name custom still wins", () => {
    const bothDeleted: IAllCustomExercises = {
      "custom-bare": buildCustom("custom-bare", "Chest Supported Row", true),
      "custom-full": buildCustom("custom-full", "Chest Supported Row, Dumbbell", true),
    };
    const exercise = Exercise_findByNameAndEquipment("Chest Supported Row, Dumbbell", bothDeleted);
    expect(exercise?.id).to.eql("custom-full");
    expect(exercise?.equipment).to.eql(undefined);
  });

  it("a live full-name custom wins over a deleted bare-name custom", () => {
    const deletedBare: IAllCustomExercises = {
      "custom-bare": buildCustom("custom-bare", "Chest Supported Row", true),
      "custom-full": buildCustom("custom-full", "Chest Supported Row, Dumbbell", false),
    };
    expect(Exercise_findByNameAndEquipment("Chest Supported Row, Dumbbell", deletedBare)?.id).to.eql("custom-full");
  });

  it("built-in bare-name match still wins over a full-name custom", () => {
    const fullOnly: IAllCustomExercises = {
      "custom-full": buildCustom("custom-full", "Squat, Barbell", false),
    };
    expect(Exercise_findByNameAndEquipment("Squat, Barbell", fullOnly)?.id).to.eql("squat");
  });
});

describe("Exercise — warmup rounding", () => {
  const squat: IExerciseType = { id: "squat", equipment: "barbell" };
  const threshold = Weight_build(0, "lb");

  function settingsWithWarmupPlates(): ISettings {
    const settings = Settings_build();
    settings.units = "lb";
    settings.gyms[0].equipment.barbell = EquipmentSetup_save(settings.gyms[0].equipment.barbell!, {
      type: "plates",
      unit: "lb",
      base: 45,
      plates: [
        { weight: 45, num: 8 },
        { weight: 25, num: 4 },
        { weight: 10, num: 4 },
        { weight: 2.5, num: 4 },
      ],
      sides: 2,
      warmupPlates: [45, 25],
    });
    return settings;
  }

  function warmupWeights(
    settings: ISettings,
    working: IWeight,
    sets: IProgramExerciseWarmupSet[],
    exerciseType: IExerciseType = squat
  ): number[] {
    return Exercise_getWarmupSets(exerciseType, working, settings, sets).map((s) => s.weight!.value);
  }

  it("uses only the warmup plates", () => {
    const settings = settingsWithWarmupPlates();
    expect(warmupWeights(settings, Weight_build(225, "lb"), [{ reps: 5, value: 0.8, threshold }])).to.eql([145]);
  });

  it("never rounds a warmup above the first working weight", () => {
    const settings = settingsWithWarmupPlates();
    const setup = settings.gyms[0].equipment.barbell!.setup!;
    settings.gyms[0].equipment.barbell = EquipmentSetup_save(settings.gyms[0].equipment.barbell!, {
      ...setup,
      rounding: "nearest",
    });
    expect(warmupWeights(settings, Weight_build(180, "lb"), [{ reps: 3, value: 1, threshold }])).to.eql([145]);
  });

  it("skips percentage warmups when the working weight is negative assistance", () => {
    const settings = Settings_build();
    const sets: IProgramExerciseWarmupSet[] = [
      { reps: 5, value: 0.5, threshold: Weight_build(-1000, "lb") },
      { reps: 5, value: Weight_build(-40, "lb"), threshold: Weight_build(-1000, "lb") },
    ];
    const pulldown: IExerciseType = { id: "latPulldown", equipment: "cable" };
    expect(warmupWeights(settings, Weight_build(-20, "lb"), sets, pulldown)).to.eql([-40]);
  });
});
