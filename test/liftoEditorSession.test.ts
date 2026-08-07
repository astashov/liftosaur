import "mocha";
import { expect } from "chai";
import {
  ILiftoEditorSession,
  ILiftoEditorSessionResult,
  LiftoEditorSession_applyPill,
  LiftoEditorSession_consumePendingCaret,
  LiftoEditorSession_create,
  LiftoEditorSession_deactivate,
  LiftoEditorSession_highlight,
  LiftoEditorSession_keypadInput,
  LiftoEditorSession_pills,
  LiftoEditorSession_removeFocused,
  LiftoEditorSession_selectLevel,
  LiftoEditorSession_setUnit,
  LiftoEditorSession_step,
  LiftoEditorSession_switchToFreeform,
  LiftoEditorSession_switchToStructured,
  LiftoEditorSession_tap,
  LiftoEditorSession_textChanged,
  LiftoEditorSession_walkFocus,
} from "../src/components/primitives/liftoEditorSession";
import { Settings_build } from "../src/models/settings";
import { Exercise_toKey } from "../src/models/exercise";
import { Weight_build, Weight_increment } from "../src/models/weight";
import { IExerciseType, ISettings } from "../src/types";
import { LiftoEditorTestUtils_applyEdits, LiftoEditorTestUtils_pos } from "./utils/liftoEditorTestUtils";

const exerciseType: IExerciseType = { id: "squat", equipment: "barbell" };

function buildSettings(rm1Lb?: number): ISettings {
  const settings = Settings_build();
  if (rm1Lb != null) {
    settings.exerciseData[Exercise_toKey(exerciseType)] = { rm1: Weight_build(rm1Lb, "lb") };
  }
  return settings;
}

// Mirrors the controller's dispatch: applies the effect edits to the text and echoes the
// change back through textChanged, like the native editor would.
function run(session: ILiftoEditorSession, result: ILiftoEditorSessionResult): ILiftoEditorSession {
  let next = result.session;
  if (result.effects.edits != null && result.effects.edits.length > 0) {
    next = LiftoEditorSession_textChanged(next, LiftoEditorTestUtils_applyEdits(next.text, result.effects.edits));
  }
  return next;
}

function tapAt(text: string, needle: string, occurrence: number = 0): ILiftoEditorSessionResult {
  const session = LiftoEditorSession_create(text);
  return LiftoEditorSession_tap(session, LiftoEditorTestUtils_pos(text, needle, occurrence), 1000);
}

describe("LiftoEditorSession", () => {
  describe("tap", () => {
    it("activates a numeric token and opens the keypad", () => {
      const result = tapAt("Squat / 3x8 100kg", "100kg");
      expect(result.effects.keypad).to.equal("open");
      expect(result.session.active?.buffer).to.equal("100");
      expect(result.session.active?.suffix).to.equal("kg");
      expect(result.session.active?.fresh).to.equal(true);
      expect(result.session.focusedToken?.text).to.equal("100kg");
    });

    it("focuses a plain token and closes the keypad", () => {
      const result = tapAt("Squat / 3x8 100kg", "Squat");
      expect(result.effects.keypad).to.equal("close");
      expect(result.session.active).to.equal(undefined);
      expect(result.session.focusedToken?.text).to.equal("Squat");
      expect(result.session.context?.breadcrumb).to.deep.equal(["Squat"]);
    });

    it("switches to freeform on a quick double tap with the caret at the tap point", () => {
      const text = "Squat / 3x8 100kg";
      const first = tapAt(text, "Squat");
      const index = LiftoEditorTestUtils_pos(text, "Squat");
      const second = LiftoEditorSession_tap(first.session, index, 1200);
      expect(second.session.mode).to.equal("freeform");
      expect(second.session.pendingCaret).to.equal(index);
      const consumed = LiftoEditorSession_consumePendingCaret(second.session);
      expect(consumed.caret).to.equal(index);
      expect(consumed.session.pendingCaret).to.equal(undefined);
    });

    it("keeps the typed buffer on a slow re-tap while the keypad is open", () => {
      const text = "Squat / 3x8 100kg";
      const first = tapAt(text, "100kg");
      const typed = LiftoEditorSession_keypadInput(first.session, "9");
      const index = LiftoEditorTestUtils_pos(text, "100kg");
      const retap = LiftoEditorSession_tap(typed.session, index, 5000);
      expect(retap.session.active?.buffer).to.equal("9");
      expect(retap.effects).to.deep.equal({});
    });
  });

  describe("walkFocus", () => {
    it("hops between stops in both directions and wraps around", () => {
      const text = "Squat / 3x8 100kg";
      let result = tapAt(text, "Squat");
      result = LiftoEditorSession_walkFocus(result.session, 1);
      expect(result.session.focusedToken?.text).to.equal("3");
      result = LiftoEditorSession_walkFocus(result.session, 1);
      expect(result.session.focusedToken?.text).to.equal("8");
      result = LiftoEditorSession_walkFocus(result.session, 1);
      expect(result.session.focusedToken?.text).to.equal("100kg");
      expect(result.effects.keypad).to.equal("open");
      result = LiftoEditorSession_walkFocus(result.session, 1);
      expect(result.session.focusedToken?.text).to.equal("Squat");
      result = LiftoEditorSession_walkFocus(result.session, -1);
      expect(result.session.focusedToken?.text).to.equal("100kg");
    });
  });

  describe("selectLevel", () => {
    it("closes the keypad when zooming out past the active number", () => {
      const result = tapAt("Squat / 3x8 100kg", "100kg");
      const zoomed = LiftoEditorSession_selectLevel(result.session, 0);
      expect(zoomed.effects.keypad).to.equal("close");
      expect(zoomed.session.active).to.equal(undefined);
      expect(zoomed.session.focusLevel).to.equal(0);
    });
  });

  describe("keypadInput", () => {
    it("replaces the value on the first digit and appends afterwards", () => {
      const text = "Squat / 3x8 100kg";
      let result = tapAt(text, "100kg");
      let session = run(result.session, result);
      result = LiftoEditorSession_keypadInput(session, "9");
      session = run(result.session, result);
      expect(session.text).to.equal("Squat / 3x8 9kg");
      result = LiftoEditorSession_keypadInput(session, "5");
      session = run(result.session, result);
      expect(session.text).to.equal("Squat / 3x8 95kg");
    });

    it("backspaces to a parseable zero", () => {
      const text = "Squat / 3x8 5kg";
      let result = tapAt(text, "5kg");
      let session = run(result.session, result);
      result = LiftoEditorSession_keypadInput(session, "⌫");
      session = run(result.session, result);
      expect(session.text).to.equal("Squat / 3x8 0kg");
    });

    it("adds a single dot, prefixing bare dots with zero", () => {
      const text = "Squat / 3x8 5kg";
      let result = tapAt(text, "5kg");
      let session = run(result.session, result);
      result = LiftoEditorSession_keypadInput(session, ".");
      session = run(result.session, result);
      result = LiftoEditorSession_keypadInput(session, ".");
      session = run(result.session, result);
      result = LiftoEditorSession_keypadInput(session, "5");
      session = run(result.session, result);
      expect(session.text).to.equal("Squat / 3x8 5.5kg");
    });
  });

  describe("step", () => {
    it("steps set-section weights through equipment settings", () => {
      const settings = buildSettings();
      const text = "Squat / 3x8 100lb";
      const result = tapAt(text, "100lb");
      const stepped = LiftoEditorSession_step(result.session, 1, settings, exerciseType);
      const expected = Weight_increment(Weight_build(100, "lb"), settings, exerciseType);
      expect(stepped.session.active?.buffer).to.equal(`${expected.value}`);
      expect(stepped.session.active?.suffix).to.equal(expected.unit);
    });

    it("steps function-argument weights by a plain unit", () => {
      const text = "Squat / 3x8 / progress: lp(5lb)";
      const result = tapAt(text, "5lb");
      const stepped = LiftoEditorSession_step(result.session, 1, buildSettings(), exerciseType);
      expect(stepped.session.active?.buffer).to.equal("6");
    });

    it("steps timers by fifteen seconds", () => {
      const result = tapAt("Squat / 3x8 60s", "60s");
      const stepped = LiftoEditorSession_step(result.session, -1, buildSettings(), exerciseType);
      expect(stepped.session.active?.buffer).to.equal("45");
      expect(stepped.session.active?.suffix).to.equal("s");
    });
  });

  describe("setUnit", () => {
    it("keeps the raw value when switching between kg and lb", () => {
      const result = tapAt("Squat / 3x8 100lb", "100lb");
      const switched = LiftoEditorSession_setUnit(result.session, "kg", buildSettings(), exerciseType);
      expect(switched.session.active?.buffer).to.equal("100");
      expect(switched.session.active?.suffix).to.equal("kg");
    });

    it("converts between % and weight through the exercise 1RM", () => {
      const settings = buildSettings(100);
      const toPercent = tapAt("Squat / 3x8 80lb", "80lb");
      const percent = LiftoEditorSession_setUnit(toPercent.session, "%", settings, exerciseType);
      expect(percent.session.active?.buffer).to.equal("80");
      expect(percent.session.active?.suffix).to.equal("%");
      expect(percent.session.active?.numeric.kind).to.equal("percentage");

      const toWeight = tapAt("Squat / 3x8 80%", "80%");
      const weight = LiftoEditorSession_setUnit(toWeight.session, "lb", settings, exerciseType);
      expect(weight.session.active?.buffer).to.equal("80");
      expect(weight.session.active?.suffix).to.equal("lb");
      expect(weight.session.active?.numeric.kind).to.equal("weight");
    });

    it("keeps the + of a plus-weight outside the edited token", () => {
      // The numeric token is the Weight node; the trailing + is a sibling Plus node and
      // survives the unit switch untouched.
      const text = "Squat / 3x8 100lb+";
      const result = tapAt(text, "100lb");
      const switched = LiftoEditorSession_setUnit(result.session, "kg", buildSettings(), exerciseType);
      expect(switched.session.active?.suffix).to.equal("kg");
      expect(LiftoEditorTestUtils_applyEdits(text, switched.effects.edits ?? [])).to.equal("Squat / 3x8 100kg+");
    });
  });

  describe("applyPill", () => {
    it("applies a single edit and shifts the anchor and focused token after it", () => {
      const text = "Squat / 3x8 100kg";
      const tap = tapAt(text, "100kg");
      const result = LiftoEditorSession_applyPill(tap.session, {
        label: "x",
        category: "neutral",
        start: 0,
        end: 0,
        text: "aux: ",
      });
      expect(result.effects.edits).to.deep.equal([{ start: 0, end: 0, text: "aux: " }]);
      const shift = "aux: ".length;
      expect(result.session.focusedToken?.start).to.equal(text.indexOf("100kg") + shift);
      expect(result.session.anchor).to.equal(LiftoEditorTestUtils_pos(text, "100kg") + shift);
    });

    it("snaps the focus to the replacement when the edit overlaps the focused token", () => {
      const text = "Squat / 3x8 100kg";
      const tap = tapAt(text, "100kg");
      const start = text.indexOf("100kg");
      const result = LiftoEditorSession_applyPill(tap.session, {
        label: "x",
        category: "neutral",
        start,
        end: start + "100kg".length,
        text: "80%",
      });
      expect(result.session.focusedToken).to.deep.equal({
        start,
        end: start + "80%".length,
        text: "80%",
        walkStop: true,
      });
    });

    it("applies multi-span pills with the net shift and emits edits in descending order", () => {
      const text = "Squat / 3x8 / ! 5x5 / 10x1";
      const tap = tapAt(text, "10x1");
      const markerStart = text.indexOf("! ");
      const targetStart = text.indexOf("10x1");
      const result = LiftoEditorSession_applyPill(tap.session, {
        label: "Make current",
        category: "sets",
        start: targetStart,
        end: targetStart,
        text: "! ",
        extraEdits: [{ start: markerStart, end: markerStart + 2, text: "" }],
      });
      expect(result.effects.edits).to.deep.equal([
        { start: targetStart, end: targetStart, text: "! " },
        { start: markerStart, end: markerStart + 2, text: "" },
      ]);
      expect(LiftoEditorTestUtils_applyEdits(text, result.effects.edits!)).to.equal("Squat / 3x8 / 5x5 / ! 10x1");
      // -2 from the marker removal, +2 from the insertion: the focused token (the tapped
      // "10" rep count) stays put.
      expect(result.session.focusedToken?.text).to.equal("10");
      expect(result.session.focusedToken?.start).to.equal(targetStart);
      expect(result.session.anchor).to.equal(LiftoEditorTestUtils_pos(text, "10x1"));
    });

    it("closes the keypad when a pill applies over an active number", () => {
      const tap = tapAt("Squat / 3x8 100kg", "100kg");
      const result = LiftoEditorSession_applyPill(tap.session, {
        label: "x",
        category: "neutral",
        start: 0,
        end: 0,
        text: "a",
      });
      expect(result.effects.keypad).to.equal("close");
      expect(result.session.active).to.equal(undefined);
    });
  });

  describe("removeFocused", () => {
    function removeLevel(text: string, needle: string, levelLabel: string): string {
      const tap = tapAt(text, needle);
      const levelIndex = tap.session.context!.levels.findIndex((l) => l.label === levelLabel);
      expect(levelIndex, `level "${levelLabel}" in ${tap.session.context!.breadcrumb.join("/")}`).to.be.at.least(0);
      const selected = LiftoEditorSession_selectLevel(tap.session, levelIndex);
      const result = LiftoEditorSession_removeFocused(selected.session);
      return LiftoEditorTestUtils_applyEdits(text, result.effects.edits ?? []);
    }

    it("a removed section eats its leading separator", () => {
      expect(removeLevel("Squat / 5x5 / 100kg / progress: lp(5kg)", "100kg", "Globals")).to.equal(
        "Squat / 5x5 / progress: lp(5kg)"
      );
    });

    it("a removed first set group eats its trailing comma", () => {
      expect(removeLevel("Squat / 3x8, 5x5 / 100kg", "3x8", "Set group 1")).to.equal("Squat / 5x5 / 100kg");
    });

    it("a removed last set group eats its leading comma", () => {
      expect(removeLevel("Squat / 3x8, 5x5 / 100kg", "5x5", "Set group 2")).to.equal("Squat / 3x8 / 100kg");
    });

    it("a removed state variable eats its trailing comma", () => {
      expect(removeLevel("Squat / 3x8 / progress: custom(foo: 1, bar: 2) {~ ~}", "foo", "foo")).to.equal(
        "Squat / 3x8 / progress: custom(bar: 2) {~ ~}"
      );
    });

    it("a removed first exercise variation eats its trailing pipe", () => {
      expect(removeLevel("Squat | ! Front Squat / 3x8", "Squat", "Variation 1")).to.equal("! Front Squat / 3x8");
    });

    it("a removed last exercise variation eats its leading pipe and marker", () => {
      expect(removeLevel("Squat | ! Front Squat / 3x8", "Front Squat", "Variation 2")).to.equal("Squat / 3x8");
    });

    it("a removed marked sets section takes its marker along", () => {
      expect(removeLevel("Squat / 3x8 / ! 5x5 100lb", "5x5", "Sets 2")).to.equal("Squat / 3x8");
    });
  });

  describe("mode switching", () => {
    it("freeform clears focus state and structured restores pill mode", () => {
      const tap = tapAt("Squat / 3x8", "Squat");
      const freeform = LiftoEditorSession_switchToFreeform(tap.session);
      expect(freeform.session.mode).to.equal("freeform");
      expect(freeform.session.context).to.equal(undefined);
      expect(freeform.effects.keypad).to.equal("close");
      const structured = LiftoEditorSession_switchToStructured(freeform.session);
      expect(structured.session.mode).to.equal("structured");
    });

    it("deactivate closes the keypad and drops the focus", () => {
      const tap = tapAt("Squat / 3x8 100kg", "100kg");
      const result = LiftoEditorSession_deactivate(tap.session);
      expect(result.effects.keypad).to.equal("close");
      expect(result.session.active).to.equal(undefined);
      expect(result.session.focusedToken).to.equal(undefined);
    });
  });

  describe("textChanged", () => {
    it("recomputes the context at the anchor from the new text", () => {
      const tap = tapAt("Squat / 3x8", "Squat");
      const changed = LiftoEditorSession_textChanged(tap.session, "Bench / 3x8");
      expect(changed.text).to.equal("Bench / 3x8");
      expect(changed.context?.breadcrumb[0]).to.equal("Bench");
    });
  });

  describe("pills", () => {
    it("falls through leaf levels to the nearest pill boundary", () => {
      const tap = tapAt("Squat / 3x8 100kg", "100kg");
      const labels = LiftoEditorSession_pills(tap.session).map((p) => p.label);
      expect(labels).to.include("Add RPE");
    });

    it("stops at an empty boundary instead of surfacing ancestor pills", () => {
      const tap = tapAt("Squat / 3x8 / used: none", "none");
      expect(LiftoEditorSession_pills(tap.session)).to.deep.equal([]);
    });
  });

  describe("highlight", () => {
    it("highlights the focused level and the active number", () => {
      const text = "Squat / 3x8 100kg";
      const tap = tapAt(text, "100kg");
      const ranges = LiftoEditorSession_highlight(tap.session);
      expect(ranges.some((r) => text.slice(r.start, r.end) === "100kg")).to.equal(true);
    });
  });
});
