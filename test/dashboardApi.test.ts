import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  DashboardApi_compileErrors,
  DashboardApi_create,
  DashboardApi_delete,
  DashboardApi_get,
  DashboardApi_list,
  DashboardApi_parseCreate,
  DashboardApi_parsePreview,
  DashboardApi_parseUpdate,
  DashboardApi_update,
} from "../src/models/dashboardApi";
import { IDashboardWebStorage } from "../src/models/dashboardWebSave";
import { Dashboard_isTextTooLarge, Dashboard_maxTextBytes } from "../src/models/dashboard";
import { IDashboard } from "../src/types";
import { fxSettings } from "./liftographFixtures";

const settings = fxSettings();
const squat = "graph {\n  name: Squat / source: exercise(Squat) / y: e1rm\n}";

function dashboard(id: string, text: string = squat): IDashboard {
  return { vtype: "dashboard", id, name: id.toUpperCase(), text };
}

function storage(currentDashboardId?: string): IDashboardWebStorage {
  return { dashboards: [dashboard("a"), dashboard("b")], currentDashboardId };
}

const strict = { acceptsBooleanStrings: false };
const lenient = { acceptsBooleanStrings: true };

describe("DashboardApi input", () => {
  it("parses a create with defaults for the name and makeCurrent", () => {
    expect(DashboardApi_parseCreate({ text: squat }, strict)).to.deep.equal({
      success: true,
      data: { name: "New Dashboard", text: squat, makeCurrent: true },
    });
    expect(DashboardApi_parseCreate({ name: "  Mine  ", text: squat, makeCurrent: null }, strict)).to.deep.include({
      success: true,
      data: { name: "Mine", text: squat, makeCurrent: true },
    });
  });

  it("rejects a create with a missing text or a wrong-typed field", () => {
    expect(DashboardApi_parseCreate({ name: "Mine" }, strict)).to.deep.include({ success: false });
    expect(DashboardApi_parseCreate({ text: 123 }, strict)).to.deep.equal({
      success: false,
      error: "'text' must be a string, got number",
    });
    expect(DashboardApi_parseCreate({ text: squat, makeCurrent: "false" }, strict)).to.deep.equal({
      success: false,
      error: `'makeCurrent' must be true or false, got "false"`,
    });
  });

  it("accepts boolean strings only when asked to, and nothing else", () => {
    expect(DashboardApi_parseCreate({ text: squat, makeCurrent: "false" }, lenient)).to.deep.include({
      success: true,
      data: { name: "New Dashboard", text: squat, makeCurrent: false },
    });
    expect(DashboardApi_parseCreate({ text: squat, makeCurrent: "maybe" }, lenient)).to.deep.equal({
      success: false,
      error: `'makeCurrent' must be true or false, got "maybe"`,
    });
  });

  it("rejects an update that mixes a valid field with a wrong-typed one, or changes nothing", () => {
    expect(DashboardApi_parseUpdate({ name: "Rename", text: 123 }, strict)).to.deep.equal({
      success: false,
      error: "'text' must be a string, got number",
    });
    expect(DashboardApi_parseUpdate({}, strict)).to.deep.include({ success: false });
    expect(DashboardApi_parseUpdate({ name: "   " }, strict)).to.deep.equal({
      success: false,
      error: "'name' can't be empty",
    });
    expect(DashboardApi_parseUpdate({ makeCurrent: true }, strict)).to.deep.equal({
      success: true,
      data: { name: undefined, text: undefined, makeCurrent: true },
    });
  });

  it("requires a string text for a preview", () => {
    expect(DashboardApi_parsePreview({ text: squat })).to.deep.equal({ success: true, data: { text: squat } });
    expect(DashboardApi_parsePreview({ text: ["a"] })).to.deep.equal({
      success: false,
      error: "'text' must be a string, got array",
    });
  });
});

describe("DashboardApi", () => {
  it("lists dashboards and treats the first one as current when the stored id is missing", () => {
    expect(DashboardApi_list(storage("b")).map((d) => d.isCurrent)).to.deep.equal([false, true]);
    expect(DashboardApi_list(storage("gone")).map((d) => d.isCurrent)).to.deep.equal([true, false]);
  });

  it("resolves 'current' and reports a missing id", () => {
    const current = DashboardApi_get(storage("b"), "current");
    expect(current.success && current.data.id).to.equal("b");
    expect(DashboardApi_get(storage("b"), "zzz").success).to.equal(false);
  });

  it("reports compile errors with a line and a 1-based column", () => {
    const errors = DashboardApi_compileErrors(
      "calendar\ngraph {\n  name: X / source: exercise(Nope Lift)\n}",
      settings
    );
    expect(errors).to.have.length(1);
    expect(errors[0]).to.deep.include({ line: 3, offset: 21, message: "Unknown exercise 'Nope Lift'" });
  });

  it("creates a dashboard and makes it current unless asked not to", () => {
    const made = DashboardApi_create(storage("a"), settings, { id: "c", name: "C", text: squat, makeCurrent: true });
    expect(made.kind === "write" && [made.dashboards.length, made.currentDashboardId]).to.deep.equal([3, "c"]);
    const kept = DashboardApi_create(storage("a"), settings, { id: "c", name: "C", text: squat, makeCurrent: false });
    expect(kept.kind === "write" && kept.currentDashboardId).to.equal("a");
  });

  it("rejects text with compile errors with 422 and the details", () => {
    const result = DashboardApi_create(storage("a"), settings, {
      id: "c",
      name: "C",
      text: "value / source: stats(steps)",
      makeCurrent: true,
    });
    expect(result.kind === "error" && [result.status, result.details?.[0].message]).to.deep.equal([
      422,
      "Unknown stat 'steps'",
    ]);
  });

  it("refuses to re-create a deleted id", () => {
    const deleted: IDashboardWebStorage = {
      ...storage("a"),
      _versions: { dashboards: { items: {}, deleted: { c: 1 } } },
    };
    const result = DashboardApi_create(deleted, settings, { id: "c", name: "C", text: squat, makeCurrent: true });
    expect(result.kind === "error" && result.status).to.equal(409);
  });

  it("updates the name without compiling the stored text", () => {
    const broken: IDashboardWebStorage = {
      dashboards: [dashboard("a", "graph {\n  name: X / source: exercise(Nope)\n}")],
    };
    const result = DashboardApi_update(broken, settings, "a", { name: "Renamed" });
    expect(result.kind === "write" && result.dashboards[0].name).to.equal("Renamed");
  });

  it("switches the current dashboard with makeCurrent alone", () => {
    const result = DashboardApi_update(storage("a"), settings, "b", { makeCurrent: true });
    expect(result.kind === "write" && result.currentDashboardId).to.equal("b");
    expect(result.kind === "write" && result.dashboards.map((d) => d.text)).to.deep.equal([squat, squat]);
  });

  it("returns 404 when updating a missing dashboard", () => {
    const result = DashboardApi_update(storage("a"), settings, "zzz", { text: squat });
    expect(result.kind === "error" && result.status).to.equal(404);
  });

  it("compiles every example in the Liftograph reference without errors", () => {
    const reference = fs.readFileSync(path.join(__dirname, "..", "llms", "liftograph_llm.md"), "utf8");
    const examples = Array.from(reference.matchAll(/```liftograph\n([\s\S]*?)```/g)).map((m) => m[1]);
    expect(examples.length).to.be.greaterThan(8);
    const failures = examples.flatMap((example) =>
      DashboardApi_compileErrors(example, settings).map((e) => `${e.message} in:\n${example}`)
    );
    expect(failures).to.deep.equal([]);
  });

  it("deletes by id or 'current', and keeps the only dashboard", () => {
    const byCurrent = DashboardApi_delete(storage("b"), "current");
    expect(
      byCurrent.kind === "write" && [byCurrent.dashboards.map((d) => d.id), byCurrent.currentDashboardId]
    ).to.deep.equal([["a"], "a"]);
    expect(DashboardApi_delete(storage("a"), "zzz")).to.deep.include({ kind: "error", status: 404 });
    expect(DashboardApi_delete({ dashboards: [dashboard("a")] }, "a")).to.deep.include({ kind: "error", status: 400 });
  });

  it("counts dashboard size in UTF-8 bytes", () => {
    expect(Dashboard_isTextTooLarge("a".repeat(Dashboard_maxTextBytes))).to.equal(false);
    expect(Dashboard_isTextTooLarge("a".repeat(Dashboard_maxTextBytes + 1))).to.equal(true);
    expect(Dashboard_isTextTooLarge("é".repeat(Dashboard_maxTextBytes / 2))).to.equal(false);
    expect(Dashboard_isTextTooLarge("é".repeat(Dashboard_maxTextBytes / 2 + 1))).to.equal(true);
  });

  it("matches the limits the Liftograph reference states", () => {
    const accepted = [
      "graph {\n  name: All / source: workout / y: muscleSets(total) / group: sum(1w)\n}",
      "muscles / show: sets(chest, lats)",
      "value / source: stats(weight) / compare: 10y / trend: 1y / smooth: avg(10y)",
      "graph / range: all {\n  name: W / source: stats(weight)\n}",
    ];
    const rejected = [
      "muscles / show: sets(total)",
      "muscles / range: 6d",
      "value / source: stats(weight) / compare: all",
      "value / source: stats(weight) / trend: all",
      "value / source: stats(weight) / trend: 2y",
      "value / source: stats(weight) / smooth: avg(all)",
    ];
    expect(accepted.filter((text) => DashboardApi_compileErrors(text, settings).length > 0)).to.deep.equal([]);
    expect(rejected.filter((text) => DashboardApi_compileErrors(text, settings).length === 0)).to.deep.equal([]);
  });
});
