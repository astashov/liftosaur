import "mocha";
import { expect } from "chai";
import { Exercise_nameError, Exercise_sanitizeName } from "../src/models/exercise";

describe("Exercise_nameError", () => {
  it("accepts regular names", () => {
    expect(Exercise_nameError("Meadows Row")).to.equal(undefined);
    expect(Exercise_nameError("Cable Row - Upper Back")).to.equal(undefined);
    expect(Exercise_nameError("Pallof Press, Half-Kneeling")).to.equal(undefined);
    expect(Exercise_nameError("Décliné Press")).to.equal(undefined);
  });

  it("rejects empty and whitespace-only names", () => {
    expect(Exercise_nameError("")).to.equal("Name cannot be empty");
    expect(Exercise_nameError("   ")).to.equal("Name cannot be empty");
  });

  it("rejects every Liftoscript syntax character", () => {
    for (const ch of ["/", "{", "}", "(", ")", "#", "[", "]", "|", "!", ":"]) {
      expect(Exercise_nameError(`Meadows Row ${ch}Ganbaru`), `char ${ch}`).to.be.a("string");
    }
  });
});

describe("Exercise_sanitizeName", () => {
  it("replaces syntax characters and collapses whitespace", () => {
    expect(Exercise_sanitizeName("Press (Machine)")).to.equal("Press Machine");
    expect(Exercise_sanitizeName("T2: Squat")).to.equal("T2 Squat");
    expect(Exercise_sanitizeName("Row / Cable | Heavy!")).to.equal("Row Cable Heavy");
    expect(Exercise_sanitizeName("  Bench Press  ")).to.equal("Bench Press");
  });

  it("always produces a name that passes validation", () => {
    for (const name of ["Press (Machine)", "a/b", "{}", "()", "   ", "#1 [Top]: set!"]) {
      expect(Exercise_nameError(Exercise_sanitizeName(name)), name).to.equal(undefined);
    }
  });
});
