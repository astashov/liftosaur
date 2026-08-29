import "mocha";
import { expect } from "chai";
import { LiftoEditorParseCache } from "../src/components/primitives/liftoEditorBrain";
import { IAllCustomExercises } from "../src/types";
import {
  ICompletionResult,
  PlannerCompletions_at,
  PlannerCompletionsIndex,
} from "../src/pages/planner/plannerCompletions";

const index = new PlannerCompletionsIndex();

function completeAt(text: string, marker: string = "|"): ICompletionResult | undefined {
  const pos = text.indexOf(marker);
  expect(pos).to.not.equal(-1, "the text needs a | marking the cursor");
  const doc = text.replace(marker, "");
  return PlannerCompletions_at(doc, pos, {
    cache: new LiftoEditorParseCache(),
    customExercises: {},
    exerciseFullNames: ["Squat, Barbell", "Bench Press, Barbell[1-3]"],
    index,
  });
}

function labels(result: ICompletionResult | undefined): string[] {
  return (result?.options ?? []).map((o) => o.label);
}

describe("PlannerCompletions", () => {
  it("completes bare exercise names, without an equipment suffix", () => {
    const result = completeAt("# Week 1\n## Day 1\nBench Pr|");
    expect(result?.kind).to.equal("exercise");
    expect(result?.query).to.equal("Bench Pr");
    expect(labels(result)).to.include("Bench Press");
    expect(labels(result).filter((l) => l.indexOf(",") !== -1)).to.deep.equal([]);
  });

  it("offers each name once rather than once per equipment", () => {
    const result = completeAt("# Week 1\n## Day 1\nDeadlift|");
    const deadlifts = labels(result).filter((l) => l.toLowerCase().indexOf("deadlift") !== -1);
    expect(deadlifts).to.include("Deadlift");
    expect(new Set(deadlifts).size).to.equal(deadlifts.length);
    // The whole reason for the split: "Deadlift, Band" used to sit above "Deadlift, Barbell".
    expect(deadlifts.indexOf("Deadlift")).to.equal(0);
  });

  it("switches to equipment variants once a comma is typed, default first", () => {
    const result = completeAt("# Week 1\n## Day 1\nDeadlift, |");
    expect(result?.kind).to.equal("exerciseVariant");
    // The variant order survives the ranker: alphabetically and by length Band would win.
    expect(labels(result)[0]).to.equal("Deadlift, Barbell");
    expect(labels(result)).to.include("Deadlift, Band");
  });

  it("narrows the variants by what follows the comma", () => {
    const result = completeAt("# Week 1\n## Day 1\nDeadlift, ba|");
    // Barbell before Band despite Band being shorter and alphabetically first.
    expect(labels(result)).to.deep.equal(["Deadlift, Barbell", "Deadlift, Band"]);
  });

  it("replaces the whole reference, so picking a variant fixes the casing too", () => {
    const text = "# Week 1\n## Day 1\ndeadlift, ba|";
    const result = completeAt(text);
    expect(result?.from).to.equal(18);
    expect(labels(result)[0]).to.equal("Deadlift, Barbell");
  });

  it("invents no equipment variants for a name that isn't an exercise", () => {
    const result = completeAt("# Week 1\n## Day 1\nNotAnExercise, ba|");
    expect(result?.kind).to.not.equal("exerciseVariant");
  });

  it("falls back to whole-label search when the name before the comma is unknown", () => {
    const custom = {
      mygrip: {
        id: "mygrip" as const,
        name: "My Lift, Wide Grip",
        defaultEquipment: "barbell" as const,
        types: [],
        meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [], sortedEquipment: [] },
      },
    } as unknown as IAllCustomExercises;
    const text = "# Week 1\n## Day 1\nMy Lift, Wi";
    const result = PlannerCompletions_at(text, text.length, {
      cache: new LiftoEditorParseCache(),
      customExercises: custom,
      index: new PlannerCompletionsIndex(),
    });
    expect(result?.kind).to.equal("exercise");
    expect(labels(result)).to.deep.equal(["My Lift, Wide Grip"]);
  });

  // The comma is ambiguous when a custom exercise is named with one AND its prefix is a built-in:
  // reading it only as an equipment split would hide that exercise from autocomplete for good.
  it("keeps a comma-bearing custom exercise reachable alongside the equipment variants", () => {
    const custom = {
      benchpresstempo: {
        id: "benchpresstempo" as const,
        name: "Bench Press, Tempo",
        defaultEquipment: "barbell" as const,
        types: [],
        meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [], sortedEquipment: [] },
      },
    } as unknown as IAllCustomExercises;
    const text = "# Week 1\n## Day 1\nBench Press, Te";
    const result = PlannerCompletions_at(text, text.length, {
      cache: new LiftoEditorParseCache(),
      customExercises: custom,
      index: new PlannerCompletionsIndex(),
    });
    expect(labels(result)).to.include("Bench Press, Tempo");
  });

  // Accepting from inside a word has to replace the word, not insert into it — otherwise
  // completing "Deadlift" with the cursor after "Dead" leaves "Deadliftlift".
  it("replaces to the end of the token, not to the cursor", () => {
    const result = completeAt("# Week 1\n## Day 1\nDead|lift");
    expect(result?.from).to.equal(18);
    expect(result?.to).to.equal(26);
    expect(labels(result)).to.include("Deadlift");
  });

  it("stops the replacement at the section separator", () => {
    const result = completeAt("# Week 1\n## Day 1\nDead|lift / 3x5 100lb");
    // The name ends at 26; the " / 3x5 100lb" after it is not the completion's to replace.
    expect(result?.to).to.equal(26);
  });

  // The grammar parses `Squat[1-12]` as ExerciseName followed by a separate Repeat, and only it
  // knows that — a regex over the raw text swallows the repeat range with the name.
  it("leaves the [1-12] repeat alone", () => {
    const result = completeAt("# Week 1\n## Day 1\nSqu|at[1-12] / 3x5");
    expect(result?.from).to.equal(18);
    expect(result?.to).to.equal(23);
  });

  it("leaves a reuse target's [w:d] alone", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / ...t|1[1:2] / 3x5");
    expect(result?.kind).to.equal("reuse");
    expect(result?.to).to.equal(31);
  });

  it("replaces to the end of the word inside a script", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / 3x5 / progress: custom() {~ comp|letedReps ~}");
    expect(result?.kind).to.equal("liftoscript");
    const text = "# Week 1\n## Day 1\nSquat / 3x5 / progress: custom() {~ completedReps ~}";
    expect(result?.to).to.equal(text.indexOf("completedReps") + "completedReps".length);
  });

  it("dedupes reuse targets so repeats can't fill the cap", () => {
    const text = "# Week 1\n## Day 1\nSquat / ...Squ";
    const result = PlannerCompletions_at(text, text.length, {
      cache: new LiftoEditorParseCache(),
      customExercises: {},
      // What a four-week program hands over for one lift.
      exerciseFullNames: ["Squat, Barbell", "Squat, Barbell", "Squat, Barbell", "Squat, Barbell"],
      index: new PlannerCompletionsIndex(),
    });
    expect(labels(result)).to.deep.equal(["Squat, Barbell"]);
  });

  it("keeps the indentation out of the replaced range", () => {
    const text = "# Week 1\n## Day 1\n  Squ|";
    const result = completeAt(text);
    // "  Squ" starts at 18, so the replacement has to start at 20 — past the two spaces.
    expect(result?.from).to.equal(20);
    expect(result?.query).to.equal("Squ");
  });

  it("does not offer exercises past the first slash", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / 3x5 |");
    expect(result?.kind).to.not.equal("exercise");
  });

  it("completes reuse names after ...", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / ...Ben|");
    expect(result?.kind).to.equal("reuse");
    expect(labels(result)).to.deep.equal(["Bench Press, Barbell[1-3]"]);
    expect(result?.from).to.equal(29);
  });

  it("completes the progress section name", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / 3x5 / prog|");
    expect(result?.kind).to.equal("section");
    expect(labels(result)).to.deep.equal(["progress: "]);
    expect(result?.options[0].display).to.equal("progress");
  });

  it("completes progression functions", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / 3x5 / progress: d|");
    expect(result?.kind).to.equal("progressFn");
    expect(labels(result)).to.deep.equal(["dp"]);
  });

  it("completes liftoscript bindings inside a script block", () => {
    const result = completeAt("# Week 1\n## Day 1\nSquat / 3x5 / progress: custom() {~ complet| ~}");
    expect(result?.kind).to.equal("liftoscript");
    expect(labels(result)).to.include("completedReps");
    expect(labels(result)).to.not.include("cr");
  });

  it("completes state vars from the enclosing custom() args", () => {
    const result = completeAt(
      "# Week 1\n## Day 1\nSquat / 3x5 / progress: custom(increment: 5lb, attempts: 3) {~ state.att| ~}"
    );
    expect(result?.kind).to.equal("stateVar");
    expect(labels(result)).to.deep.equal(["attempts"]);
  });

  it("offers nothing inside a script with no word under the cursor", () => {
    expect(completeAt("# Week 1\n## Day 1\nSquat / 3x5 / progress: custom() {~ | ~}")).to.equal(undefined);
  });

  // Ranking is internal now, so it's asserted through the one public entrypoint rather than by
  // calling the ranker — which is the contract a host actually depends on.
  describe("ranking", () => {
    it("puts an exact match first, then prefix matches, then word matches", () => {
      const ranked = labels(completeAt("# Week 1\n## Day 1\nsquat|"));
      expect(ranked[0]).to.equal("Squat");
      const boxSquat = ranked.indexOf("Box Squat");
      const squatRow = ranked.indexOf("Squat Row");
      expect(squatRow).to.be.greaterThan(-1);
      expect(boxSquat).to.be.greaterThan(squatRow);
    });

    it("returns nothing when nothing matches", () => {
      expect(completeAt("# Week 1\n## Day 1\nzzzqqq|")).to.equal(undefined);
    });

    it("caps how many options a host is handed", () => {
      const many = completeAt("# Week 1\n## Day 1\ne|");
      expect((many?.options ?? []).length).to.be.at.most(30);
    });
  });
});
