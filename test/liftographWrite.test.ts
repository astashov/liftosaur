import "mocha";
import { expect } from "chai";
import { LiftographWrite_quote } from "../src/liftograph/liftographWrite";
import { LiftographDocument_parse, LiftographDocument_valueText } from "../src/liftograph/liftographDocument";

function roundTrip(name: string): string | undefined {
  const doc = LiftographDocument_parse(`value / name: ${LiftographWrite_quote(name)} / source: workout`);
  const item = doc.items[0];
  const pair = item?.type === "widget" ? item.pairs.find((p) => p.key === "name") : undefined;
  return pair?.value != null ? LiftographDocument_valueText(pair.value) : undefined;
}

describe("LiftographWrite_quote", () => {
  it("leaves plain names bare and quotes names with delimiters", () => {
    expect(LiftographWrite_quote("Bench Press")).to.equal("Bench Press");
    expect(LiftographWrite_quote("Row (Chest Supported)")).to.equal('"Row (Chest Supported)"');
    expect(LiftographWrite_quote('Say "hi"')).to.equal('"Say \\"hi\\""');
  });

  it("round-trips names through the parser", () => {
    const names = [
      "Bench Press",
      "Chest-Supported Row",
      "Row (Chest Supported)",
      "Push / Pull",
      "a, b",
      "key: value",
      'Say "hi"',
      "back\\slash",
      "tilde ~ here",
      "21s",
      "My  Plan",
      " Leading",
      "Trailing ",
      "",
    ];
    expect(names.map(roundTrip)).to.deep.equal(names);
  });

  it("quotes empty strings and spacing the bare form would lose", () => {
    expect(LiftographWrite_quote("")).to.equal('""');
    expect(LiftographWrite_quote("My  Plan")).to.equal('"My  Plan"');
    expect(LiftographWrite_quote("My Plan")).to.equal("My Plan");
  });
});
