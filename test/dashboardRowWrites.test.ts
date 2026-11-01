import "mocha";
import { expect } from "chai";
import { DashboardRowWrites_plan } from "../lambda/utils/dashboardRowWrites";
import { IDashboard } from "../src/types";

function dashboard(id: string): IDashboard {
  return { vtype: "dashboard", id, name: id, text: "" };
}

describe("DashboardRowWrites_plan", () => {
  it("puts every merged dashboard and deletes nothing without tombstones", () => {
    expect(DashboardRowWrites_plan([dashboard("a"), dashboard("b")], [])).to.deep.equal({
      idsToDelete: [],
      dashboardsToPut: [dashboard("a"), dashboard("b")],
    });
  });

  it("deletes tombstoned ids and never puts them back", () => {
    expect(DashboardRowWrites_plan([dashboard("a"), dashboard("b")], ["b", "gone", "b"])).to.deep.equal({
      idsToDelete: ["b", "gone"],
      dashboardsToPut: [dashboard("a")],
    });
  });
});
