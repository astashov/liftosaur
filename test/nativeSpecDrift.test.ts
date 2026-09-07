import "mocha";
import { expect } from "chai";
import fs from "fs";
import path from "path";

const SPEC = path.join(__dirname, "..", "src", "specs", "NativeLiftosaurLiveActivity.ts");
const BRIDGE = path.join(__dirname, "..", "ios", "Liftosaur", "RCTLiftosaurLiveActivity.mm");

const ANDROID_ONLY: Record<string, string> = {
  isSetTimer: "LiveUpdateManager.kt",
};

function propertiesOf(spec: string, typeName: string): string[] {
  const match = spec.match(new RegExp(`export type ${typeName} = \\{([\\s\\S]*?)\\n\\};`));
  if (match == null) {
    throw new Error(`${typeName} is not in ${path.basename(SPEC)} — rename the test or the type`);
  }
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .map((line) => line.split(/[?:]/)[0].trim())
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
}

describe("Live Activity spec drift", () => {
  const spec = fs.readFileSync(SPEC, "utf8");
  const bridge = fs.readFileSync(BRIDGE, "utf8");

  for (const typeName of ["LiveActivitySetTimer", "LiveActivityGetReady", "LiveActivityEntry", "LiveActivityRest"]) {
    it(`copies every ${typeName} field in DictFromState`, () => {
      const properties = propertiesOf(spec, typeName);
      expect(properties.length).to.be.greaterThan(0);
      const missing = properties.filter((name) => ANDROID_ONLY[name] == null && !bridge.includes(`@"${name}"`));
      expect(missing, `${typeName} fields missing from DictFromState`).to.eql([]);
    });
  }

  it("reads a spec that still declares the types it checks", () => {
    expect(propertiesOf(spec, "LiveActivitySetTimer")).to.include.members(["phaseId", "side", "recordedThisSide"]);
    expect(propertiesOf(spec, "LiveActivityGetReady")).to.include.members(["phaseId", "side"]);
  });
});
