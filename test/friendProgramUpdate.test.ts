import "mocha";
import { expect } from "chai";
import { FriendProgramUpdate_check } from "../lambda/utils/friendProgramUpdate";
import { Program_create } from "../src/models/program";
import {
  PlannerProgram_evaluateText,
  PlannerProgram_generateFullText,
} from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";
import { IProgram, IStorage } from "../src/types";

const original = "# Week 1\n## Day 1\nSquat / 3x5 / 100lb\n";
const edited = "# Week 1\n## Day 1\nSquat / 5x5 / 90lb\n";
const clock = { vc: { phone: 3 }, t: 300 };

function program(): IProgram {
  const base = Program_create("Strength", "p1");
  return {
    ...base,
    clonedAt: 1000,
    nextDay: 2,
    planner: { vtype: "planner", name: "Strength", weeks: PlannerProgram_evaluateText(original) },
  };
}

const versions = { programs: { items: { 1000: { planner: clock } }, deleted: {} } } as IStorage["_versions"];

function check(
  overrides: Partial<Parameters<typeof FriendProgramUpdate_check>[0]> = {}
): ReturnType<typeof FriendProgramUpdate_check> {
  return FriendProgramUpdate_check({
    ownerId: "owner",
    programId: "p1",
    base: { v: 1, ownerId: "owner", programId: "p1", clonedAt: 1000, plannerVersion: clock },
    existing: program(),
    versions,
    text: edited,
    settings: Settings_build(),
    ...overrides,
  });
}

describe("FriendProgramUpdate_check", () => {
  it("writes the new text into the server copy and keeps everything else", () => {
    const result = check();
    expect(result.ok).to.equal(true);
    if (result.ok) {
      expect(PlannerProgram_generateFullText(result.program.planner!.weeks)).to.contain("Squat / 5x5 / 90lb");
      expect(result.program).to.include({ id: "p1", name: "Strength", nextDay: 2, clonedAt: 1000 });
      expect(result.program.planner!.name).to.equal("Strength");
    }
  });

  it("returns 409 when the planner clock moved, and when the program was replaced", () => {
    const moved = { programs: { items: { 1000: { planner: { vc: { phone: 4 }, t: 400 } } }, deleted: {} } };
    const movedResult = check({ versions: moved as IStorage["_versions"] });
    expect(!movedResult.ok && movedResult.error.status).to.equal(409);
    const replaced = check({ existing: { ...program(), clonedAt: 2000 } });
    expect(!replaced.ok && replaced.error.status).to.equal(409);
  });

  it("returns 400 for a missing base or one minted for another program", () => {
    const missing = check({ base: undefined });
    expect(!missing.ok && missing.error.status).to.equal(400);
    const other = check({ base: { v: 1, ownerId: "owner", programId: "p2", clonedAt: 1000, plannerVersion: clock } });
    expect(!other.ok && other.error.status).to.equal(400);
  });

  it("returns 404 for a missing or planner-less program", () => {
    const missing = check({ existing: undefined });
    expect(!missing.ok && missing.error.status).to.equal(404);
    const legacy = check({ existing: { ...program(), planner: undefined } });
    expect(!legacy.ok && legacy.error.status).to.equal(404);
  });

  it("rejects text that is not a string, and text that does not parse", () => {
    const notText = check({ text: 5 });
    expect(!notText.ok && notText.error.status).to.equal(400);
    const broken = check({ text: "# Week 1\n## Day 1\nSquat / 3x5 / progress: nope(\n" });
    expect(!broken.ok && broken.error.status).to.equal(422);
  });
});
