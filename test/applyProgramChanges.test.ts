import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_nextHistoryRecord } from "../src/models/program";
import { Progress_applyProgramDay } from "../src/models/progress";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryRecord } from "../src/types";

const settings = Settings_build();

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, settings, Stats_getEmpty());
}

function applyText(progress: IHistoryRecord, text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Progress_applyProgramDay(progress, Program_evaluate(program, settings), progress.day, settings);
}

describe("Progress_applyProgramDay", () => {
  it("applies changed global rest timer to uncompleted sets", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 60s\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([60, 60, 60]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 180s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([180, 180, 180]);
  });

  it("applies a rest timer added after the workout started", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([undefined, undefined, undefined]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 120s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([120, 120, 120]);
  });

  it("applies per-set rest timers", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 1x5 60s, 2x5 90s / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([60, 90, 90]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 1x5 30s, 2x5 240s / 100lb\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([30, 240, 240]);
  });

  it("keeps the timer of already completed sets", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 60s\n");
    progress.entries[0].sets[0].isCompleted = true;
    progress.entries[0].sets[0].completedReps = 5;

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 180s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([60, 180, 180]);
  });

  it("applies changed set timer and askWeight", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nPlank / 3x5 30s|60s / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.setTimer)).to.eql([30, 30, 30]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nPlank / 3x5 45s+|60s / 100lb+\n");
    expect(newProgress.entries[0].sets.map((s) => s.setTimer)).to.eql([45, 45, 45]);
    expect(newProgress.entries[0].sets.map((s) => s.isOverflowSetTimer)).to.eql([true, true, true]);
    expect(newProgress.entries[0].sets.map((s) => s.askWeight)).to.eql([true, true, true]);
  });
});
