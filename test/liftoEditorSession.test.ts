import "mocha";
import { expect } from "chai";
import {
  ILiftoEditorSession,
  ILiftoEditorSessionResult,
  LiftoEditorSession_applyPill,
  LiftoEditorSession_consumePendingCaret,
  LiftoEditorSession_create,
  LiftoEditorSession_deactivate,
  LiftoEditorSession_focusedExerciseFullName,
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

    it("switches to freeform on a quick double tap in token-free text, like a script body", () => {
      const text = "Squat / 1x5 / progress: custom() {~ weights += 2.5kg ~}";
      const index = LiftoEditorTestUtils_pos(text, "weights");
      const first = LiftoEditorSession_tap(LiftoEditorSession_create(text), index, 1000);
      expect(first.session.focusedToken).to.equal(undefined);
      const second = LiftoEditorSession_tap(first.session, index + 1, 1200);
      expect(second.session.mode).to.equal("freeform");
      expect(second.session.pendingCaret).to.equal(index + 1);
    });

    it("treats quick taps on two different tokens as navigation, not a double tap", () => {
      const text = "Squat / 3x8 100kg";
      const first = tapAt(text, "3");
      const second = LiftoEditorSession_tap(first.session, LiftoEditorTestUtils_pos(text, "8"), 1200);
      expect(second.session.mode).to.equal("structured");
      expect(second.session.active?.buffer).to.equal("8");
    });

    it("keeps the typed buffer and the keypad on a slow re-tap", () => {
      const text = "Squat / 3x8 100kg";
      const first = tapAt(text, "100kg");
      const typed = LiftoEditorSession_keypadInput(first.session, "9");
      const index = LiftoEditorTestUtils_pos(text, "100kg");
      const retap = LiftoEditorSession_tap(typed.session, index, 5000);
      expect(retap.session.active?.buffer).to.equal("9");
      // The keypad host dismisses itself on any tap that didn't (re)open it, so a re-tap on
      // the focused number has to claim it — otherwise the first tap of a double tap closes
      // the keypad and the layout shift makes the second one miss.
      expect(retap.effects).to.deep.equal({ keypad: "open" });
    });

    it("reaches freeform by double tapping the number the keypad is open on", () => {
      const text = "Squat / 3x8 100kg";
      const index = LiftoEditorTestUtils_pos(text, "100kg");
      const opened = LiftoEditorSession_tap(LiftoEditorSession_create(text), index, 1000);
      const first = LiftoEditorSession_tap(opened.session, index, 5000);
      const second = LiftoEditorSession_tap(first.session, index, 5200);
      expect(second.session.mode).to.equal("freeform");
      expect(second.effects.keypad).to.equal("close");
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

    it("activates each timer of a combined set timer separately", () => {
      const text = "Squat / 3x8 30s|60s";
      const setPart = tapAt(text, "30s");
      expect(setPart.effects.keypad).to.equal("open");
      expect(setPart.session.active?.buffer).to.equal("30");
      expect(setPart.session.active?.suffix).to.equal("s");
      const restPart = tapAt(text, "60s");
      expect(restPart.session.active?.buffer).to.equal("60");
      const stepped = LiftoEditorSession_step(restPart.session, 1, buildSettings(), exerciseType);
      expect(run(restPart.session, stepped).text).to.equal("Squat / 3x8 30s|75s");
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

    it("still switches units when the exercise has no 1RM to convert through", () => {
      // A custom exercise nobody has entered a 1RM for: there is no basis for the conversion,
      // but the unit button still has to do something.
      const custom: IExerciseType = { id: "qvkxpalv" };
      const settings = Settings_build();
      settings.exercises[custom.id] = {
        vtype: "custom_exercise",
        id: custom.id,
        name: "Hack Squat",
        types: [],
        meta: { targetMuscles: [], synergistMuscles: [], bodyParts: [], sortedEquipment: [] },
        isDeleted: false,
      };
      const result = tapAt("Hack Squat / 5x3 / 110lb", "110lb");
      const switched = LiftoEditorSession_setUnit(result.session, "%", settings, custom);
      expect(switched.session.active?.buffer).to.equal("110");
      expect(switched.session.active?.suffix).to.equal("%");
      expect(switched.session.active?.numeric.kind).to.equal("percentage");
    });

    it("switches a function argument between weight and percentage, keeping the increment", () => {
      const settings = buildSettings(200);
      const text = "Squat / 3x8 / progress: lp(5lb)";
      const result = tapAt(text, "5lb");
      // `lp(5%)` adds 5%, so the 5 is the same number in either unit — converting it through
      // the 1RM would turn a 5lb step into a 2.5% one.
      const percent = LiftoEditorSession_setUnit(result.session, "%", settings, exerciseType);
      expect(percent.session.active?.buffer).to.equal("5");
      expect(percent.session.active?.suffix).to.equal("%");
      expect(LiftoEditorTestUtils_applyEdits(text, percent.effects.edits ?? [])).to.equal(
        "Squat / 3x8 / progress: lp(5%)"
      );
    });

    it("switches a weight inside a script body", () => {
      const settings = buildSettings(200);
      const text = "Squat / 3x8 / progress: custom() {~ weights += 5lb ~}";
      const result = tapAt(text, "5lb");
      const percent = LiftoEditorSession_setUnit(result.session, "%", settings, exerciseType);
      expect(percent.session.active?.buffer).to.equal("5");
      expect(LiftoEditorTestUtils_applyEdits(text, percent.effects.edits ?? [])).to.equal(
        "Squat / 3x8 / progress: custom() {~ weights += 5% ~}"
      );
    });

    it("switches a warmup percentage to a weight without going through the 1RM", () => {
      const settings = buildSettings(200);
      const text = "Squat / 3x8 / warmup: 2x5 45%";
      const result = tapAt(text, "45%");
      const switched = LiftoEditorSession_setUnit(result.session, "lb", settings, exerciseType);
      expect(switched.session.active?.buffer).to.equal("45");
      expect(switched.session.active?.suffix).to.equal("lb");
      expect(switched.session.active?.numeric.kind).to.equal("weight");
      expect(LiftoEditorTestUtils_applyEdits(text, switched.effects.edits ?? [])).to.equal(
        "Squat / 3x8 / warmup: 2x5 45lb"
      );
    });

    it("switches a warmup weight back to a percentage even with no 1RM set", () => {
      const text = "Squat / 3x8 / warmup: 2x5 45lb";
      const result = tapAt(text, "45lb");
      const switched = LiftoEditorSession_setUnit(result.session, "%", buildSettings(), exerciseType);
      expect(switched.session.active?.buffer).to.equal("45");
      expect(switched.session.active?.suffix).to.equal("%");
      expect(switched.session.active?.numeric.kind).to.equal("percentage");
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

    it("removing sets×reps takes the whole set group", () => {
      expect(removeLevel("Squat / 3x8 100lb / progress: lp(5lb)", "3x8", "Sets×Reps")).to.equal(
        "Squat / progress: lp(5lb)"
      );
    });

    it("removing sets×reps of a first set group eats its trailing comma", () => {
      expect(removeLevel("Squat / 3x8 100lb, 5x5 120lb", "3x8", "Sets×Reps")).to.equal("Squat / 5x5 120lb");
    });

    it("removing a warmup group's sets×reps takes the whole group", () => {
      expect(removeLevel("Squat / 3x8 / warmup: 1x10 40%, 1x5 60%", "1x10", "Sets×Reps")).to.equal(
        "Squat / 3x8 / warmup: 1x5 60%"
      );
    });

    it("removing the last warmup group takes the whole warmup property", () => {
      expect(removeLevel("Squat / 3x8 100lb / warmup: 1x10 40%", "1x10", "Sets×Reps")).to.equal("Squat / 3x8 100lb");
    });

    it("removing the warmup sets level takes the whole warmup property", () => {
      expect(removeLevel("Squat / 3x8 / warmup: 1x10 40%", "1x10", "Warmup sets")).to.equal("Squat / 3x8");
    });

    it("removing auto eats its leading space", () => {
      expect(removeLevel("Squat / 3x8 100lb auto 60s", "auto", "Auto")).to.equal("Squat / 3x8 100lb 60s");
    });

    it("removing a script reuse restores an empty script body", () => {
      expect(removeLevel("Squat / 3x8 / progress: custom() { ...t1 }", "...t1", "Reuse")).to.equal(
        "Squat / 3x8 / progress: custom() {~ ~}"
      );
      expect(removeLevel("Squat / 3x8 / update: custom() { ...t1 }", "...t1", "Reuse")).to.equal(
        "Squat / 3x8 / update: custom() {~ ~}"
      );
    });

    it("removing a property's function value takes the whole property", () => {
      expect(removeLevel("Squat / 3x8 / id: tags(2)", "tags", "tags()")).to.equal("Squat / 3x8");
      expect(removeLevel("Squat / 3x8 / progress: lp(5lb) / update: custom() {~ ~}", "lp", "lp()")).to.equal(
        "Squat / 3x8 / update: custom() {~ ~}"
      );
    });
  });

  describe("focused exercise", () => {
    function fullNameAt(text: string, needle: string): string | undefined {
      const tap = LiftoEditorSession_tap(LiftoEditorSession_create(text), LiftoEditorTestUtils_pos(text, needle), 1000);
      return LiftoEditorSession_focusedExerciseFullName(tap.session);
    }

    it("names the exercise the caret is in, across a multi-exercise document", () => {
      const text = "Squat / 3x8 / 100kg\nT1: Bench Press, Barbell / 3x5";
      expect(fullNameAt(text, "100kg")).to.equal("Squat");
      expect(fullNameAt(text, "3x5")).to.equal("T1: Bench Press, Barbell");
    });

    // The breadcrumb label is only the first variation, but the planner knows this exercise
    // by every variation — matching on the label would miss it entirely.
    it("keeps every variation", () => {
      const text = "Squat, Barbell | Front Squat / 2x10";
      expect(fullNameAt(text, "2x10")).to.equal("Squat, Barbell | Front Squat");
    });

    it("is undefined when nothing is focused", () => {
      expect(LiftoEditorSession_focusedExerciseFullName(LiftoEditorSession_create("Squat / 3x8"))).to.equal(undefined);
    });
  });

  describe("scope", () => {
    function pillsAt(text: string, needle: string, scope: "exercise" | "day"): string[] {
      const session = LiftoEditorSession_create(text, scope);
      const tap = LiftoEditorSession_tap(session, LiftoEditorTestUtils_pos(text, needle), 1000);
      return LiftoEditorSession_pills(tap.session).map((pill) => pill.label);
    }

    it("offers the reuse target's own editor only when the document is one exercise", () => {
      const text = "Squat / ...Bench Press";
      expect(pillsAt(text, "Bench Press", "exercise")).to.include("Edit reused exercise…");
      expect(pillsAt(text, "Bench Press", "day")).to.not.include("Edit reused exercise…");
    });

    it("leaves every other pill alone", () => {
      const text = "Squat / ...Bench Press";
      const exercise = pillsAt(text, "Bench Press", "exercise").filter((l) => l !== "Edit reused exercise…");
      expect(pillsAt(text, "Bench Press", "day")).to.deep.equal(exercise);
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

    it("focusing a label offers only renaming", () => {
      const tap = tapAt("aux: Squat / 3x8", "aux");
      expect(LiftoEditorSession_pills(tap.session).map((p) => p.label)).to.deep.equal(["Rename…"]);
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
