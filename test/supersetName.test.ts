import "mocha";
import { expect } from "chai";
import { Program_evaluate } from "../src/models/program";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { PlannerNames_supersetNamePattern } from "../src/pages/planner/models/plannerNames";

const names = ["A", "My Group", "Push-Pull", "Push/Pull", "Group (1)", "A!B", "#1", "A|B", "{x}"];

describe("superset group name pattern", () => {
  const settings = Settings_build();
  const regex = new RegExp(`^(?:${PlannerNames_supersetNamePattern})$`);

  for (const name of names) {
    it(`agrees with the grammar for "${name}"`, () => {
      const { program } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\nSquat / 3x5 / 100lb / superset: ${name}\nBench Press / 3x5 / 100lb / superset: ${name}\n`
      );
      const exercises = Program_evaluate(program, settings).weeks[0].days[0].exercises;
      const parses = exercises.length === 2 && exercises.every((e) => e.superset?.name === name);
      expect(parses).to.eql(regex.test(name));
    });
  }
});
