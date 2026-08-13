import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import {
  IProgramExerciseSharedSection,
  ProgramExerciseText_findDeclaration,
  ProgramExerciseText_sharedSections,
} from "../src/models/programExerciseText";
import {
  EditorSheetDraft_create,
  EditorSheetDraft_fromEditor,
  EditorSheetDraft_isDirty,
  EditorSheetDraft_mountText,
  EditorSheetDraft_pendingChange,
} from "../src/models/editorSheetDraft";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";

const settings = Settings_build();

const multiweek = `# Week 1
## Day 1
Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x8 90lb
`;

function week2(): { declaration: IPlannerProgramExercise; shared: IProgramExerciseSharedSection[] } {
  const { program } = PlannerTestUtils_get(multiweek);
  const evaluated = Program_evaluate(program, settings);
  const exercise = Program_getAllProgramExercises(evaluated).find(
    (e) => e.key === "squat_barbell" && e.dayData.week === 2
  )!;
  const declaration = ProgramExerciseText_findDeclaration(evaluated, exercise);
  return { declaration, shared: ProgramExerciseText_sharedSections(evaluated, declaration) };
}

describe("EditorSheetDraft", () => {
  it("starts clean and mounts the plain local line", () => {
    const { declaration, shared } = week2();
    const draft = EditorSheetDraft_create(declaration.text, shared);
    expect(EditorSheetDraft_isDirty(draft)).to.eql(false);
    expect(EditorSheetDraft_mountText(draft, false)).to.eql("Squat / 3x8 90lb");
  });

  it("mounts the shared sections in when they're visible", () => {
    const { declaration, shared } = week2();
    const draft = EditorSheetDraft_create(declaration.text, shared);
    expect(EditorSheetDraft_mountText(draft, true)).to.eql("Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(5lb)");
  });

  // The sequence that used to discard silently: the remount text is derived from the dirty
  // draft, so anything measuring "changed?" against it concluded nothing had.
  it("stays dirty across showing and hiding the shared sections", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);

    draft = EditorSheetDraft_fromEditor(draft, "Squat / 4x8 95lb");
    expect(EditorSheetDraft_isDirty(draft)).to.eql(true);

    const shown = EditorSheetDraft_mountText(draft, true);
    expect(shown).to.eql("Squat / 4x8 95lb / warmup: 2x5 45lb / progress: lp(5lb)");
    draft = EditorSheetDraft_fromEditor(draft, shown);
    expect(EditorSheetDraft_isDirty(draft)).to.eql(true);

    const hidden = EditorSheetDraft_mountText(draft, false);
    expect(hidden).to.eql("Squat / 4x8 95lb");
    draft = EditorSheetDraft_fromEditor(draft, hidden);
    expect(EditorSheetDraft_isDirty(draft)).to.eql(true);
    expect(draft.localText).to.eql("Squat / 4x8 95lb");
  });

  it("reports a shared edit made while visible, and keeps it after hiding", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(10lb)");
    expect(EditorSheetDraft_isDirty(draft)).to.eql(true);

    const hidden = EditorSheetDraft_mountText(draft, false);
    draft = EditorSheetDraft_fromEditor(draft, hidden);
    expect(EditorSheetDraft_pendingChange(draft, shared).sharedEdits.map((e) => [e.property, e.text])).to.eql([
      ["progress", "progress: lp(10lb)"],
    ]);
    // Re-showing offers the edit back, not the persisted value.
    expect(EditorSheetDraft_mountText(draft, true)).to.include("progress: lp(10lb)");
  });

  // The reverting bug: showing a section recorded it verbatim, so a later save compared that
  // cached copy against a freshly resolved baseline and wrote the stale value back.
  it("records nothing for a shared section the user only looked at", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    draft = EditorSheetDraft_fromEditor(draft, EditorSheetDraft_mountText(draft, true));
    expect(draft.sharedEdits).to.eql({});
    expect(EditorSheetDraft_pendingChange(draft, shared).sharedEdits).to.eql([]);
  });

  it("drops a shared edit that is typed back to its original", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(10lb)");
    expect(EditorSheetDraft_isDirty(draft)).to.eql(true);
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(5lb)");
    expect(draft.sharedEdits).to.eql({});
    expect(EditorSheetDraft_isDirty(draft)).to.eql(false);
  });

  // Save resolves against a freshly evaluated program. An untouched property must produce no
  // edit at all, whatever the fresh value is, or it overwrites whoever changed it.
  it("does not write an untouched property back over a newer value", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    draft = EditorSheetDraft_fromEditor(draft, EditorSheetDraft_mountText(draft, true));
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 4x8 95lb / warmup: 2x5 45lb / progress: lp(5lb)");

    const freshShared = shared.map((s) => (s.property === "progress" ? { ...s, text: "progress: lp(25lb)" } : s));
    const pending = EditorSheetDraft_pendingChange(draft, freshShared);
    expect(pending.localText).to.eql("Squat / 4x8 95lb");
    expect(pending.sharedEdits).to.eql([]);
  });

  it("is clean when the text comes back to what was persisted", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 4x8 95lb");
    draft = EditorSheetDraft_fromEditor(draft, "Squat / 3x8 90lb");
    expect(EditorSheetDraft_isDirty(draft)).to.eql(false);
  });

  it("doesn't count merely showing a shared section as an edit", () => {
    const { declaration, shared } = week2();
    let draft = EditorSheetDraft_create(declaration.text, shared);
    const shown = EditorSheetDraft_mountText(draft, true);
    draft = EditorSheetDraft_fromEditor(draft, shown);
    expect(EditorSheetDraft_pendingChange(draft, shared).sharedEdits).to.eql([]);
    expect(EditorSheetDraft_isDirty(draft)).to.eql(false);
  });
});
