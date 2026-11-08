import "mocha";
import { expect } from "chai";
import { ILiftographWidgetModel, LiftographWidgetModel_read } from "../src/liftograph/liftographWidgetModel";
import {
  DashboardWidgetSheet_formError,
  DashboardWidgetSheet_init,
  DashboardWidgetSheet_setModel,
  DashboardWidgetSheet_setText,
  DashboardWidgetSheet_toForm,
  DashboardWidgetSheet_toText,
  DashboardWidgetSheet_written,
} from "../src/models/dashboardWidgetSheet";

const LF = { eol: "\n", indent: "" };

function model(snippet: string): ILiftographWidgetModel {
  const result = LiftographWidgetModel_read(snippet);
  if (result == null) {
    throw new Error("unreadable");
  }
  return result;
}

describe("DashboardWidgetSheet", () => {
  it("starts untouched in form mode", () => {
    const state = DashboardWidgetSheet_init(model("calendar / range: 3m"));
    expect(state.mode).to.equal("form");
    expect(state.isTouched).to.equal(false);
  });

  it("switching to text writes the model and does not count as a change", () => {
    const state = DashboardWidgetSheet_toText(DashboardWidgetSheet_init(model("calendar / range: 3m")), LF);
    expect(state.mode).to.equal("text");
    expect(state.text).to.equal("calendar / range: 3m");
    expect(state.isTouched).to.equal(false);
  });

  it("typing marks it touched and the written text is the typed text", () => {
    const text = DashboardWidgetSheet_toText(DashboardWidgetSheet_init(model("calendar / range: 3m")), LF);
    const typed = DashboardWidgetSheet_setText(text, "calendar / range: 1y");
    expect(typed.isTouched).to.equal(true);
    expect(DashboardWidgetSheet_written(typed, LF)).to.equal("calendar / range: 1y");
  });

  it("back to form reads the typed text", () => {
    const text = DashboardWidgetSheet_toText(DashboardWidgetSheet_init(model("calendar / range: 3m")), LF);
    const form = DashboardWidgetSheet_toForm(DashboardWidgetSheet_setText(text, "calendar / range: 1y"));
    expect(form.mode).to.equal("form");
    expect(form.model).to.eql({ kind: "calendar", range: "1y", extra: [] });
  });

  it("stays in text mode with an error when the text has no form", () => {
    const text = DashboardWidgetSheet_toText(DashboardWidgetSheet_init(model("calendar / range: 3m")), LF);
    const broken = DashboardWidgetSheet_toForm(DashboardWidgetSheet_setText(text, "calendar / range: 1y {"));
    expect(broken.mode).to.equal("text");
    expect(broken.formError).to.equal(DashboardWidgetSheet_formError);
    expect(DashboardWidgetSheet_setText(broken, "calendar").formError).to.equal(undefined);
  });

  it("a form edit marks it touched", () => {
    const state = DashboardWidgetSheet_init(model("calendar / range: 3m"));
    const next = DashboardWidgetSheet_setModel(state, { kind: "calendar", range: "6m", extra: [] });
    expect(next.isTouched).to.equal(true);
    expect(DashboardWidgetSheet_written(next, LF)).to.equal("calendar / range: 6m");
  });
});
