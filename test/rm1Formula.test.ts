import "mocha";
import { expect } from "chai";
import {
  Rm1Formula_fromSettings,
  Rm1Formula_name,
  Rm1Formula_preview,
  Rm1Formula_previewText,
} from "../src/models/rm1Formula";
import { rm1Formulas } from "../src/types";

describe("Rm1Formula", () => {
  it("defaults to RTS when the setting is missing", () => {
    expect(Rm1Formula_fromSettings({})).to.equal("rts");
    expect(Rm1Formula_fromSettings({ rm1formula: "epley" })).to.equal("epley");
  });

  it("previews 5, 10 and 15 reps at RPE 10", () => {
    expect(Rm1Formula_preview("rts")).to.eql([
      { reps: 5, pct: 87 },
      { reps: 10, pct: 73 },
      { reps: 15, pct: 60 },
    ]);
    expect(Rm1Formula_preview("epley")).to.eql([
      { reps: 5, pct: 86 },
      { reps: 10, pct: 75 },
      { reps: 15, pct: 67 },
    ]);
    expect(Rm1Formula_preview("brzycki")).to.eql([
      { reps: 5, pct: 89 },
      { reps: 10, pct: 75 },
      { reps: 15, pct: 61 },
    ]);
    expect(Rm1Formula_preview("lombardi")).to.eql([
      { reps: 5, pct: 85 },
      { reps: 10, pct: 79 },
      { reps: 15, pct: 76 },
    ]);
  });

  it("writes the preview as one line", () => {
    expect(Rm1Formula_previewText("epley")).to.equal("5 reps: 86% · 10 reps: 75% · 15 reps: 67%");
  });

  it("names every formula", () => {
    for (const formula of rm1Formulas) {
      expect(Rm1Formula_name(formula)).to.be.a("string").and.not.equal("");
    }
  });
});
