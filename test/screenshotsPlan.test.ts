import "mocha";
import { expect } from "chai";
import {
  ScreenshotsPlan_assign,
  ScreenshotsPlan_driverPort,
  ScreenshotsPlan_flowName,
  ScreenshotsPlan_ownsFile,
  ScreenshotsPlan_parseResults,
  ScreenshotsPlan_splitRunKey,
} from "../scripts/screenshots/plan";

describe("ScreenshotsPlan", () => {
  const sims = [
    { udid: "a", email: "screenshots1@test.liftosaur.com", driverPort: 7001 },
    { udid: "b", email: "screenshots2@test.liftosaur.com", driverPort: 7002 },
  ];

  it("spreads flows round-robin over the simulators", () => {
    const assignments = ScreenshotsPlan_assign(["f1", "f2", "f3"], sims);
    expect(assignments.map((a) => [a.sim.udid, a.flows])).to.eql([
      ["a", ["f1", "f3"]],
      ["b", ["f2"]],
    ]);
  });

  it("drops simulators that get no flows", () => {
    expect(ScreenshotsPlan_assign(["f1"], sims).map((a) => a.sim.udid)).to.eql(["a"]);
  });

  it("derives the flow name from its file path", () => {
    expect(ScreenshotsPlan_flowName("screenshots/flows/rest-timer.yaml")).to.equal("rest-timer");
    expect(ScreenshotsPlan_flowName("screenshots/flows/watch/rest-timer.txt")).to.equal("rest-timer");
  });

  it("reads per-flow results from maestro's summary", () => {
    const output = "Running...\n[Passed] rest-timer.yaml (48s)\n[Failed] graphs.yaml (12s)\n";
    expect(ScreenshotsPlan_parseResults(output)).to.eql({ "rest-timer": "passed", graphs: "failed" });
  });

  it("gives every device its own Maestro driver port", () => {
    expect(ScreenshotsPlan_driverPort(0)).to.equal(7001);
    expect(ScreenshotsPlan_driverPort(3)).to.equal(7004);
  });

  it("splits a run key into the platform prefix and the flow directory", () => {
    expect(ScreenshotsPlan_splitRunKey("android-rest-timer")).to.eql({ prefix: "android-", flow: "rest-timer" });
    expect(ScreenshotsPlan_splitRunKey("watch-rest-timer")).to.eql({ prefix: "watch-", flow: "rest-timer" });
    expect(ScreenshotsPlan_splitRunKey("rest-timer")).to.eql({ prefix: "", flow: "rest-timer" });
  });

  it("lets each platform replace only its own files in the flow directory", () => {
    expect(ScreenshotsPlan_ownsFile("android-", "android-rest-timer-live-update.webp")).to.equal(true);
    expect(ScreenshotsPlan_ownsFile("android-", "rest-timer-collapsed.webp")).to.equal(false);
    expect(ScreenshotsPlan_ownsFile("", "rest-timer-collapsed.webp")).to.equal(true);
    expect(ScreenshotsPlan_ownsFile("", "watch-rest-timer.webp")).to.equal(false);
  });
});
