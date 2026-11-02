import "mocha";
import { expect } from "chai";
import { parser } from "../src/liftoscript";
import {
  LiftographScriptSyntax_contextAt,
  LiftographScriptSyntax_hasError,
  LiftographScriptSyntax_pointArity,
  LiftographScriptSyntax_signature,
  LiftographScriptSyntax_stateKeys,
} from "../src/liftograph/liftographScriptSyntax";

function at(marked: string): ReturnType<typeof LiftographScriptSyntax_contextAt> {
  const pos = marked.indexOf("|");
  const script = marked.replace("|", "");
  return LiftographScriptSyntax_contextAt(parser.parse(script), script, pos);
}

describe("LiftographScriptSyntax", () => {
  it("counts point() arguments from the tree, ignoring commented-out calls", () => {
    const script = "// point(1, 2)\npoint(max(e1rm))";
    expect(Array.from(LiftographScriptSyntax_pointArity(parser.parse(script), script))).to.deep.equal([1]);
    const numeric = "for (var.i in reps) { point(reps[var.i], weights[var.i]) }";
    expect(Array.from(LiftographScriptSyntax_pointArity(parser.parse(numeric), numeric))).to.deep.equal([2]);
  });

  it("collects state keys from state variables only", () => {
    const script = "state.best = 1\nstate.count += 1\n// state.ignored\npoint(state.best)";
    expect(LiftographScriptSyntax_stateKeys(parser.parse(script), script).sort()).to.deep.equal(["best", "count"]);
  });

  it("tells nested calls from sibling arguments in the signature", () => {
    const a = "point(max(completedWeights))";
    const b = "point(max, completedWeights)";
    expect(LiftographScriptSyntax_signature(parser.parse(a), a).shape).to.not.equal(
      LiftographScriptSyntax_signature(parser.parse(b), b).shape
    );
  });

  it("flags unclosed strings and syntax errors", () => {
    expect(LiftographScriptSyntax_hasError(parser.parse('point(muscleSets("ch'))).to.equal(true);
    expect(LiftographScriptSyntax_hasError(parser.parse('point(muscleSets("chest"))'))).to.equal(false);
  });

  it("finds the caret context: comment, muscle group string, state key, word", () => {
    expect(at("// poi|").kind).to.equal("comment");
    expect(at('point(muscleSets("ch|')).to.deep.equal({
      kind: "muscleGroup",
      fn: "muscleSets",
      from: 18,
      to: 20,
      query: "ch",
    });
    expect(at('point(muscleSets("ch|est"))')).to.deep.include({ kind: "muscleGroup", query: "ch", to: 23 });
    expect(at('print("x|")').kind).to.equal("none");
    expect(at("point(state.be|)")).to.deep.include({ kind: "stateKey", query: "be" });
    expect(at("point(volu|)")).to.deep.include({ kind: "word", query: "volu" });
  });

  it("doesn't count a comment as a point() argument", () => {
    const script = "point(// x\n1)";
    expect(Array.from(LiftographScriptSyntax_pointArity(parser.parse(script), script))).to.deep.equal([1]);
  });
});
