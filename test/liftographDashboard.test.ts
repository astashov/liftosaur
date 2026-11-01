import "mocha";
import { expect } from "chai";
import {
  LiftographDashboard_document,
  LiftographDashboard_isHeading,
  LiftographDashboard_widgetKey,
} from "../src/liftograph/liftographDashboard";
import { Settings_build } from "../src/models/settings";
import { IDashboard } from "../src/types";

function dashboard(id: string): IDashboard {
  return { vtype: "dashboard", id, name: id, text: `// ${id}` };
}

describe("LiftographDashboard", () => {
  const settings = Settings_build();

  it("shows the current dashboard, the first when the current one is gone, and the old graphs when there is none", () => {
    const dashboards = [dashboard("a"), dashboard("b")];
    expect(LiftographDashboard_document({ dashboards, currentDashboardId: "b", settings })).to.deep.include({
      dashboardId: "b",
      origin: "persisted",
    });
    expect(LiftographDashboard_document({ dashboards, currentDashboardId: "x", settings }).dashboardId).to.equal("a");
    expect(LiftographDashboard_document({ settings })).to.eql({
      dashboardId: "graphs",
      name: "Graphs",
      text: "",
      origin: "fallback",
    });
  });

  it("keys identical widgets by their position", () => {
    expect(LiftographDashboard_widgetKey(0, 0, "value / source: workout")).to.not.equal(
      LiftographDashboard_widgetKey(0, 1, "value / source: workout")
    );
  });

  it("treats a single markdown heading as a section heading", () => {
    expect(LiftographDashboard_isHeading("## Strength")).to.equal(true);
    expect(LiftographDashboard_isHeading("## Strength\nHeavy days")).to.equal(false);
    expect(LiftographDashboard_isHeading("**Strength**")).to.equal(false);
  });
});
