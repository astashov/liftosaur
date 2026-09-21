import "mocha";
import { expect } from "chai";
import { ScriptRunner } from "../src/parser";

describe("ScriptRunner.hasKeyword", () => {
  it("finds rm1 used as a variable", () => {
    expect(ScriptRunner.hasKeyword("rm1 += round(rm1 * 0.04)", "rm1")).to.equal(true);
    expect(ScriptRunner.hasKeyword("state.mainJump += var.extra * rm1 / 100", "rm1")).to.equal(true);
  });

  it("is false when the name never appears, which skips the parse", () => {
    expect(ScriptRunner.hasKeyword("state.weight += 5lb", "rm1")).to.equal(false);
    expect(ScriptRunner.hasKeyword("", "rm1")).to.equal(false);
  });

  it("is false when rm1 appears only inside a longer identifier", () => {
    expect(ScriptRunner.hasKeyword("state.rm1Backup = 5", "rm1")).to.equal(false);
    expect(ScriptRunner.hasKeyword("state.myrm1 = 5", "rm1")).to.equal(false);
  });

  it("is false when rm1 appears only in a comment", () => {
    expect(ScriptRunner.hasKeyword("// rm1 is not used here\nstate.weight += 5lb", "rm1")).to.equal(false);
  });
});
