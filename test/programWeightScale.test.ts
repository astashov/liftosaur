import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getDayExerciseKeys, Program_nextHistoryRecord } from "../src/models/program";
import { Progress_applyProgramDay, Progress_daySetCounts } from "../src/models/progress";
import { Stats_getEmpty } from "../src/models/stats";
import { Weight_build } from "../src/models/weight";
import { WeightDeviation_hint } from "../src/models/weightDeviation";
import {
  IProgramWeightDraft,
  IProgramWeightTab,
  IProgramWeightTarget,
  ProgramWeightScale_apply,
  ProgramWeightScale_canApply,
  ProgramWeightScale_dayProgramExercise,
  ProgramWeightScale_draftKey,
  ProgramWeightScale_draftValue,
  ProgramWeightScale_rewrite,
  ProgramWeightScale_sections,
  ProgramWeightScale_setLabel,
  ProgramWeightScale_sheet,
  ProgramWeightScale_tabLabel,
  ProgramWeightScale_tabs,
} from "../src/models/programWeightScale";
import { PlannerProgram_generateFullText } from "../src/pages/planner/models/plannerProgram";
import { IHistoryRecord, IProgram, IWeight } from "../src/types";

const settings = Settings_build();
const lb = (value: number): IWeight => Weight_build(value, "lb");

class Workout {
  public program: IProgram;
  public progress: IHistoryRecord;

  constructor(text: string) {
    this.program = PlannerTestUtils_get(text).program;
    this.progress = Program_nextHistoryRecord(this.program, settings, Stats_getEmpty());
  }

  public complete(setIndex: number, weight: IWeight, entryIndex: number = 0): Workout {
    const set = this.progress.entries[entryIndex].sets[setIndex];
    set.isCompleted = true;
    set.completedReps = set.reps;
    set.completedWeight = weight;
    return this;
  }

  public tabs(entryIndex: number = 0): IProgramWeightTab[] {
    const evaluated = Program_evaluate(this.program, settings);
    const entry = this.progress.entries[entryIndex];
    const programExercise = ProgramWeightScale_dayProgramExercise(
      evaluated,
      this.progress.day,
      entry.programExerciseId!
    )!;
    const deviation = WeightDeviation_hint(entry, programExercise, settings)!;
    expect(deviation, "expected a deviation").to.not.equal(undefined);
    return ProgramWeightScale_tabs(evaluated, this.progress, programExercise, deviation, settings);
  }

  public target(entryIndex: number = 0): IProgramWeightTarget {
    const entry = this.progress.entries[entryIndex];
    return {
      programId: this.progress.programId,
      planner: this.program.planner!,
      startTime: this.progress.startTime,
      day: this.progress.day,
      programExerciseId: entry.programExerciseId!,
      setId: entry.sets.filter((s) => s.isCompleted).slice(-1)[0].id,
    };
  }

  public rewriteText(draft: IProgramWeightDraft = {}, entryIndex: number = 0): string {
    const key = this.progress.entries[entryIndex].programExerciseId!;
    const result = ProgramWeightScale_rewrite(this.program.planner!, key, this.tabs(entryIndex), draft, settings);
    if ("error" in result) {
      throw new Error(result.error.message);
    }
    return PlannerProgram_generateFullText(result.planner.weeks);
  }
}

const values = (tab: IProgramWeightTab): (number | undefined)[] => tab.rows.map((r) => r.newWeight?.value);

describe("ProgramWeightScale_tabs", () => {
  it("scales every set by one ratio, keeping the authored shape", () => {
    const tabs = new Workout("# Week 1\n## Day 1\nSquat / 1x8 200lb, 1x8 180lb, 1x5 200lb\n")
      .complete(0, lb(170))
      .tabs();
    expect(values(tabs[0])).to.eql([170, 152.5, 170]);
  });

  it("pins the row that showed the line to the completed weight", () => {
    const tabs = new Workout("# Week 1\n## Day 1\nBench Press / 3x5 / 49lb\n").complete(0, lb(90)).tabs();
    const trigger = tabs[0].rows.find((r) => r.isTrigger);
    expect(trigger?.newWeight).to.eql(lb(90));
  });

  it("merges consecutive weeks with the same weights, and only consecutive ones", () => {
    const text = [
      "# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n",
      "# Week 2\n## Day 1\nSquat / 3x5 / 200lb\n",
      "# Week 3\n## Day 1\nSquat / 3x3 / 220lb\n",
      "# Week 4\n## Day 1\nSquat / 3x5 / 200lb\n",
    ].join("");
    const tabs = new Workout(text).complete(0, lb(170)).tabs();
    expect(tabs.map((t) => [t.fromWeek, t.toWeek])).to.eql([
      [1, 2],
      [3, 3],
      [4, 4],
    ]);
    expect(tabs[0].rows[0].addresses.map((a) => [a.week, a.set])).to.eql([
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
  });

  it("keeps a percentage set read-only", () => {
    const tabs = new Workout("# Week 1\n## Day 1\nSquat / 1x5 80%, 3x5 200lb\n").complete(1, lb(170)).tabs();
    expect(tabs[0].rows.map((r) => [ProgramWeightScale_setLabel(r), r.isEditable])).to.eql([
      ["Set 1", false],
      ["Set 2-4", true],
    ]);
    expect(tabs[0].rows[0].newWeight).to.equal(undefined);
  });
});

describe("ProgramWeightScale_sheet", () => {
  const text = "# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n# Week 2\n## Day 1\nSquat / 3x3 / 220lb\n";

  it("opens on the tab of the current week, with the target captured", () => {
    const workout = new Workout(text).complete(0, lb(170));
    const entry = workout.progress.entries[0];
    const sheet = ProgramWeightScale_sheet(
      workout.program,
      workout.progress,
      entry.programExerciseId!,
      entry.sets[0].id,
      settings
    );
    expect(sheet?.tabs.map(ProgramWeightScale_tabLabel)).to.eql(["Week 1", "Week 2"]);
    expect(sheet?.currentTabIndex).to.equal(0);
    expect(sheet?.target).to.eql(workout.target());
  });

  it("is empty when the line no longer points at that set", () => {
    const workout = new Workout(text).complete(0, lb(170));
    const entry = workout.progress.entries[0];
    expect(
      ProgramWeightScale_sheet(workout.program, workout.progress, entry.programExerciseId!, entry.sets[1].id, settings)
    ).to.equal(undefined);
  });
});

describe("ProgramWeightScale_sections", () => {
  it("starts a section per day, naming each day once", () => {
    const text = "# Week 1\n## Day A\nSquat / 2x5 / 200lb\n## Day B\nSquat / 1x3 / 220lb\n";
    const tabs = new Workout(text).complete(0, lb(170)).tabs();
    const sections = ProgramWeightScale_sections(tabs[0]);
    expect(sections.map((s) => [s.dayName, s.variationLabel, s.rows.map(ProgramWeightScale_setLabel)])).to.eql([
      ["Day A", undefined, ["Set 1-2"]],
      ["Day B", undefined, ["Set 1"]],
    ]);
  });

  it("labels variations only on the day that has more than one", () => {
    const text = "# Week 1\n## Heavy\nSquat / 2x5 / 200lb\n## Light\nSquat / 1x3 160lb / 1x5 140lb\n";
    const tabs = new Workout(text).complete(0, lb(170)).tabs();
    const sections = ProgramWeightScale_sections(tabs[0]);
    expect(sections.map((s) => [s.dayName, s.variationLabel])).to.eql([
      ["Heavy", undefined],
      ["Light", "Variation 1"],
      [undefined, "Variation 2"],
    ]);
  });

  it("labels set variations, and names the day only on its first variation", () => {
    const text = "# Week 1\n## Day 1\nSquat / 2x5 200lb / 1x3 220lb\n";
    const tabs = new Workout(text).complete(0, lb(170)).tabs();
    const sections = ProgramWeightScale_sections(tabs[0]);
    expect(sections.map((s) => [s.dayName, s.variationLabel, s.rows.map(ProgramWeightScale_setLabel)])).to.eql([
      ["Day 1", "Variation 1", ["Set 1-2"]],
      [undefined, "Variation 2", ["Set 1"]],
    ]);
  });
});

describe("ProgramWeightScale_draftValue", () => {
  it("keeps a weight and clears anything else", () => {
    expect(ProgramWeightScale_draftValue(lb(100))).to.eql(lb(100));
    expect(ProgramWeightScale_draftValue({ value: 80, unit: "%" })).to.equal(undefined);
    expect(ProgramWeightScale_draftValue(undefined)).to.equal(undefined);
  });
});

describe("ProgramWeightScale_canApply", () => {
  it("refuses while an editable field is empty", () => {
    const tabs = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(170)).tabs();
    expect(ProgramWeightScale_canApply(tabs, {})).to.equal(true);
    const key = ProgramWeightScale_draftKey(0, tabs[0].rows[0]);
    expect(ProgramWeightScale_canApply(tabs, { [key]: undefined })).to.equal(false);
  });
});

describe("ProgramWeightScale_rewrite", () => {
  it("writes the scaled weights into the program text", () => {
    const text = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(170)).rewriteText();
    expect(text).to.contain("Squat / 3x5 / 170lb");
  });

  it("writes a draft value to every set of a grouped row", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 1x3 220lb, 3x5 200lb\n").complete(1, lb(170));
    const rows = workout.tabs()[0].rows;
    expect(rows.map(ProgramWeightScale_setLabel)).to.eql(["Set 1", "Set 2-4"]);
    const draft = { [ProgramWeightScale_draftKey(0, rows[1])]: lb(160) };
    expect(workout.rewriteText(draft)).to.contain("Squat / 1x3 185lb, 3x5 160lb");
  });

  it("keeps a pinned set apart when its value differs from its neighbours", () => {
    const rows = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(171)).tabs()[0].rows;
    expect(rows.map((r) => [ProgramWeightScale_setLabel(r), r.newWeight?.value, r.isTrigger])).to.eql([
      ["Set 1", 171, true],
      ["Set 2-3", 170, false],
    ]);
  });

  it("keeps the week repeat when every repeated week changes the same way", () => {
    const text = "# Week 1\n## Day 1\nSquat[1-3] / 3x5 / 200lb\n# Week 2\n## Day 1\n# Week 3\n## Day 1\n";
    const result = new Workout(text).complete(0, lb(170)).rewriteText();
    expect(result).to.contain("Squat[1-3] / 3x5 / 170lb");
  });

  it("keeps the weights of an exercise that reuses the scaled one", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\nFront Squat / ...Squat\n").complete(
      0,
      lb(170)
    );
    const text = workout.rewriteText();
    const evaluated = Program_evaluate(PlannerTestUtils_get(text).program, settings);
    const [squat, frontSquat] = evaluated.weeks[0].days[0].exercises;
    expect(squat.evaluatedSetVariations[0].sets.map((s) => s.weight)).to.eql([lb(170), lb(170), lb(170)]);
    expect(frontSquat.evaluatedSetVariations[0].sets.map((s) => s.weight)).to.eql([lb(200), lb(200), lb(200)]);
  });

  it("leaves percentage sets alone", () => {
    const text = new Workout("# Week 1\n## Day 1\nSquat / 1x5 80%, 3x5 200lb\n").complete(1, lb(170)).rewriteText();
    expect(text).to.contain("1x5 80%");
    expect(text).to.contain("3x5 170lb");
  });
});

describe("ProgramWeightScale_apply", () => {
  it("retargets completed sets by their program set, after a set was deleted", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 1x8 200lb, 1x8 180lb, 1x5 200lb\n");
    workout.progress.entries[0].sets.splice(1, 1);
    workout.complete(0, lb(170)).complete(1, lb(170));
    const result = ProgramWeightScale_apply(
      workout.program,
      workout.progress,
      workout.target(),
      workout.tabs(),
      {},
      settings
    );
    if ("error" in result) {
      throw new Error(result.error);
    }
    expect(result.entry.sets.map((s) => s.weight)).to.eql([lb(170), lb(170)]);
    expect(result.entry.sets.map((s) => s.completedWeight)).to.eql([lb(170), lb(170)]);
  });

  it("keeps a deleted set deleted through the reducer's re-apply pass", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 1x8 200lb, 1x8 180lb, 1x5 160lb\n");
    workout.progress.entries[0].sets.splice(1, 1);
    workout.complete(0, lb(170));
    const result = ProgramWeightScale_apply(
      workout.program,
      workout.progress,
      workout.target(),
      workout.tabs(),
      {},
      settings
    );
    if ("error" in result) {
      throw new Error(result.error);
    }
    const oldEvaluated = Program_evaluate(workout.program, settings);
    const progress = { ...workout.progress, entries: [result.entry] };
    const reapplied = Progress_applyProgramDay(
      progress,
      Program_evaluate(result.program, settings),
      progress.day,
      settings,
      {
        oldDayKeys: Program_getDayExerciseKeys(oldEvaluated, progress.day),
        oldSetCounts: Progress_daySetCounts(oldEvaluated, progress.day),
      }
    );
    expect(reapplied.entries[0].sets.map((s) => [s.reps, s.weight?.value, s.programSetIndex])).to.eql([
      [8, 170, 0],
      [5, 135, 2],
    ]);
  });

  it("refuses when the workout has changed since the sheet opened", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(170));
    const tabs = workout.tabs();
    const target = workout.target();
    const apply = (progress: IHistoryRecord | undefined): boolean =>
      "error" in ProgramWeightScale_apply(workout.program, progress, target, tabs, {}, settings);

    expect(apply(workout.progress)).to.equal(false);
    expect(apply(undefined)).to.equal(true);
    expect(apply({ ...workout.progress, startTime: target.startTime + 1 })).to.equal(true);
    expect(apply({ ...workout.progress, entries: [] })).to.equal(true);
    const entry = workout.progress.entries[0];
    const withoutSet = { ...entry, sets: entry.sets.filter((s) => s.id !== target.setId) };
    expect(apply({ ...workout.progress, entries: [withoutSet] })).to.equal(true);
  });

  it("refuses when the program changed since the sheet opened", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(170));
    const tabs = workout.tabs();
    const target = workout.target();
    const changed = PlannerTestUtils_get("# Week 1\n## Day 1\nSquat / 1x3 80%, 2x5 220lb\n").program;
    const result = ProgramWeightScale_apply(
      { ...workout.program, planner: changed.planner },
      workout.progress,
      target,
      tabs,
      {},
      settings
    );
    expect(result).to.have.property("error");
  });

  it("refuses a draft with an empty field instead of saving the other rows", () => {
    const workout = new Workout("# Week 1\n## Day 1\nSquat / 3x5 / 200lb\n").complete(0, lb(170));
    const tabs = workout.tabs();
    const draft = { [ProgramWeightScale_draftKey(0, tabs[0].rows[0])]: undefined };
    const result = ProgramWeightScale_apply(workout.program, workout.progress, workout.target(), tabs, draft, settings);
    expect(result).to.have.property("error");
  });
});
