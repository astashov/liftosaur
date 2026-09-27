import "mocha";
import { expect } from "chai";
import { WatchFlow_parse } from "../scripts/screenshots/watchFlow";

describe("WatchFlow", () => {
  it("parses the step lines and skips comments", () => {
    const steps = WatchFlow_parse(`
# rest timer on the watch
launch
wait 3000
tap 99 200
swipe 100 220 100 40
screenshot watch-rest-timer
`);
    expect(steps).to.eql([
      { type: "launch", bundleId: "com.liftosaur.www.watchkitapp" },
      { type: "wait", ms: 3000 },
      { type: "tap", x: 99, y: 200 },
      { type: "swipe", from: [100, 220], to: [100, 40] },
      { type: "screenshot", name: "watch-rest-timer" },
    ]);
  });

  it("rejects an unknown command", () => {
    expect(() => WatchFlow_parse("press crown")).to.throw("Unknown watch flow command");
  });
});
