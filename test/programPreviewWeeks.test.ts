import "mocha";
import { expect } from "chai";
import { ProgramPreviewWeeks_build } from "../src/components/preview/programPreviewWeeks";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { KitchenSinkProgram_build } from "../test-render/harness/kitchenSinkProgram";

const program = KitchenSinkProgram_build();
const settings = Settings_build();
const stats = Stats_getEmpty();

describe("ProgramPreviewWeeks", () => {
  it("carries the week's name and description", () => {
    const week = ProgramPreviewWeeks_build(program, settings, stats, 3)!;
    expect(week.name).to.equal("Week 4");
    expect(week.description).to.contain("Deload");
  });

  it("numbers a later week's days after all the days before it", () => {
    expect(ProgramPreviewWeeks_build(program, settings, stats, 0)!.days.map((d) => d.day)).to.deep.equal([1, 2, 3]);
    expect(ProgramPreviewWeeks_build(program, settings, stats, 2)!.days.map((d) => d.day)).to.deep.equal([7, 8, 9]);
  });

  it("builds each day's workout as the program would start it", () => {
    const week = ProgramPreviewWeeks_build(program, settings, stats, 1)!;
    const expected = Program_nextHistoryRecord(program, settings, stats, 5);
    expect(week.days[1].progress.entries.map((e) => e.sets.length)).to.deep.equal(
      expected.entries.map((e) => e.sets.length)
    );
  });

  it("returns nothing for a week the program does not have", () => {
    expect(ProgramPreviewWeeks_build(program, settings, stats, 9)).to.equal(undefined);
  });
});
