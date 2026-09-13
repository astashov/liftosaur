import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import { IHistoryRecord, IPlannerProgram, IProgram } from "../src/types";
import {
  ExerciseLiftoEditorDraft_create,
  ExerciseLiftoEditorDraft_fromEditor,
  IExerciseLiftoEditorDraft,
} from "../src/models/exerciseLiftoEditorDraft";
import {
  ProgramExerciseText_blurb,
  ProgramExerciseText_findDeclaration,
  ProgramExerciseText_sharedSections,
} from "../src/models/programExerciseText";
import {
  ExerciseLiftoEditorSave_decide,
  ExerciseLiftoEditorSave_lenses,
  ExerciseLiftoEditorSave_withScope,
  IExerciseLiftoEditorSaveDecision,
  IExerciseLiftoEditorSaveInput,
} from "../src/models/exerciseLiftoEditorSave";
import {
  LiftoEditorBrain_exerciseFullName,
  LiftoEditorParseCache,
} from "../src/components/primitives/liftoEditorBrain";
import { ProgramExerciseSwap_detect } from "../src/models/programExerciseSwap";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";

const settings = Settings_build();
const cache = new LiftoEditorParseCache();

const twoDays = `# Week 1
## Day 1
Squat / 5x5 100lb / progress: lp(5lb)
Bench Press / 3x8 80lb
## Day 2
Squat / 3x8 90lb
`;

interface IOpened {
  program: IProgram & { planner: IPlannerProgram };
  currentExercise: IPlannerProgramExercise;
  draft: IExerciseLiftoEditorDraft;
}

function open(programText: string = twoDays): IOpened {
  const { program } = PlannerTestUtils_get(programText);
  if (program.planner == null) {
    throw new Error("No planner");
  }
  const evaluated = Program_evaluate(program, settings);
  const currentExercise = Program_getAllProgramExercises(evaluated).find(
    (e) => e.name === "Squat" && e.dayData.week === 1 && e.dayData.dayInWeek === 1
  );
  if (currentExercise == null) {
    throw new Error("No Squat");
  }
  const declaration = ProgramExerciseText_findDeclaration(evaluated, currentExercise);
  return {
    program: { ...program, planner: program.planner },
    currentExercise,
    draft: ExerciseLiftoEditorDraft_create(
      ProgramExerciseText_blurb(program.planner, declaration),
      ProgramExerciseText_sharedSections(evaluated, declaration)
    ),
  };
}

function input(opened: IOpened, overrides: Partial<IExerciseLiftoEditorSaveInput> = {}): IExerciseLiftoEditorSaveInput {
  return {
    program: opened.program,
    target: {
      exerciseKey: opened.currentExercise.key,
      day: opened.currentExercise.dayData.day,
      selectedDayData: undefined,
    },
    draft: opened.draft,
    hasPendingPlanner: false,
    isFromWorkout: true,
    hasEditorDraft: false,
    progress: undefined,
    cachedScope: undefined,
    settings,
    detectSwap: (text, declaration) => {
      const parsed = LiftoEditorBrain_exerciseFullName(cache, text);
      return parsed != null ? ProgramExerciseSwap_detect(parsed, declaration, settings) : undefined;
    },
    ...overrides,
  };
}

function typed(opened: IOpened, text: string): IExerciseLiftoEditorDraft {
  return ExerciseLiftoEditorDraft_fromEditor(opened.draft, text);
}

function writeOf(
  decision: IExerciseLiftoEditorSaveDecision
): Extract<IExerciseLiftoEditorSaveDecision, { kind: "write" }> {
  if (decision.kind !== "write") {
    throw new Error(`Expected a write, got ${JSON.stringify(decision)}`);
  }
  return decision;
}

function dayText(planner: IPlannerProgram, dayInWeek: number): string {
  return planner.weeks[0].days[dayInWeek - 1].exerciseText.trim();
}

describe("ExerciseLiftoEditorSave", () => {
  it("closes a clean sheet without writing", () => {
    expect(ExerciseLiftoEditorSave_decide(input(open()))).to.deep.equal({ kind: "close" });
  });

  it("counts a pending whole-program rewrite as unsaved work", () => {
    const decision = ExerciseLiftoEditorSave_decide(input(open(), { hasPendingPlanner: true }));
    expect(decision.kind).to.equal("write");
  });

  it("alerts and closes when the program is gone", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(
      input(opened, { program: undefined, draft: typed(opened, "Squat / 5x3 100lb / progress: lp(5lb)") })
    );
    expect(decision).to.deep.equal({
      kind: "alert",
      message: "Couldn't find this program anymore, so the changes weren't saved.",
      closes: true,
    });
  });

  it("alerts and stays up when the exercise was changed elsewhere", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(
      input(opened, {
        target: { exerciseKey: "nope", day: 1, selectedDayData: undefined },
        draft: typed(opened, "Squat / 5x3 100lb / progress: lp(5lb)"),
      })
    );
    expect(decision.kind).to.equal("alert");
    expect(decision.kind === "alert" && decision.closes).to.equal(false);
  });

  it("refuses empty text", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(input(opened, { draft: typed(opened, "  ") }));
    expect(decision).to.deep.equal({
      kind: "alert",
      message: "The exercise text is empty. Delete the exercise from the program screen instead.",
      closes: false,
    });
  });

  it("writes a plain edit to storage from a workout", () => {
    const opened = open();
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(input(opened, { draft: typed(opened, "Squat / 5x3 100lb / progress: lp(5lb)") }))
    );
    expect(decision.plan.destination).to.equal("storage");
    expect(decision.plan.mirrorToEditorDraft).to.equal(false);
    expect(decision.plan.remap).to.equal(undefined);
    expect(decision.plan.labelNotice).to.equal(undefined);
    expect(decision.plan.description).to.equal("Save program changes");
    expect(dayText(decision.plan.updatedProgram.planner, 1)).to.contain("Squat / 5x3 100lb / progress: lp(5lb)");
    expect(ExerciseLiftoEditorSave_lenses(decision.plan, false)).to.have.length(1);
  });

  it("keeps an edit from the program editor as the editor's draft", () => {
    const opened = open();
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(
        input(opened, {
          isFromWorkout: false,
          hasEditorDraft: true,
          draft: typed(opened, "Squat / 5x3 100lb / progress: lp(5lb)"),
        })
      )
    );
    expect(decision.plan.destination).to.equal("editorDraft");
    expect(decision.plan.description).to.equal("Update program from edit exercise");
    expect(ExerciseLiftoEditorSave_lenses(decision.plan, false)).to.have.length(1);
  });

  it("mirrors a workout edit into an open program editor", () => {
    const opened = open();
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(
        input(opened, { hasEditorDraft: true, draft: typed(opened, "Squat / 5x3 100lb / progress: lp(5lb)") })
      )
    );
    expect(decision.plan.destination).to.equal("storage");
    expect(decision.plan.mirrorToEditorDraft).to.equal(true);
    expect(ExerciseLiftoEditorSave_lenses(decision.plan, false)).to.have.length(2);
  });

  it("alerts an apply error and stays up", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(input(opened, { draft: typed(opened, "Squat / 5x? 100lb") }));
    expect(decision.kind).to.equal("alert");
    expect(decision.kind === "alert" && decision.closes).to.equal(false);
  });

  it("asks the scope for a swap on an exercise declared on two days", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(
      input(opened, { draft: typed(opened, "Deadlift / 5x5 100lb / progress: lp(5lb)") })
    );
    if (decision.kind !== "askScope") {
      throw new Error(`Expected askScope, got ${decision.kind}`);
    }
    expect(decision.declarations).to.equal(2);
    const oneDay = writeOf(ExerciseLiftoEditorSave_withScope(decision.prepared, "one"));
    expect(dayText(oneDay.plan.updatedProgram.planner, 1)).to.contain("Deadlift / 5x5 / 100lb");
    expect(dayText(oneDay.plan.updatedProgram.planner, 2)).to.contain("Squat / 3x8 / 90lb");
  });

  it("alerts and stays up when the scoped swap fails to apply", () => {
    const opened = open();
    const decision = ExerciseLiftoEditorSave_decide(input(opened, { draft: typed(opened, "Deadlift / 5x? 100lb") }));
    if (decision.kind !== "askScope") {
      throw new Error(`Expected askScope, got ${decision.kind}`);
    }
    const scoped = ExerciseLiftoEditorSave_withScope(decision.prepared, "one");
    expect(scoped.kind).to.equal("alert");
    expect(scoped.kind === "alert" && scoped.closes).to.equal(false);
  });

  it("uses the cached scope instead of asking again", () => {
    const opened = open();
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(
        input(opened, { cachedScope: "all", draft: typed(opened, "Deadlift / 5x5 100lb / progress: lp(5lb)") })
      )
    );
    expect(dayText(decision.plan.updatedProgram.planner, 1)).to.contain("Deadlift / 5x5 / 100lb");
    expect(dayText(decision.plan.updatedProgram.planner, 2)).to.contain("Deadlift / 3x8 / 90lb");
  });

  it("writes a swap on a single declaration without asking", () => {
    const opened = open(`# Week 1
## Day 1
Squat / 5x5 100lb
`);
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(input(opened, { draft: typed(opened, "Deadlift / 5x5 100lb") }))
    );
    expect(dayText(decision.plan.updatedProgram.planner, 1)).to.equal("Deadlift / 5x5 / 100lb");
  });

  it("carries the remap question when the swapped exercise has logged sets in the workout", () => {
    const opened = open();
    const progress: IHistoryRecord = {
      vtype: "history_record",
      date: new Date(0).toISOString(),
      programId: opened.program.id,
      programName: opened.program.name,
      day: 1,
      dayName: "Day 1",
      startTime: 0,
      id: 0,
      entries: [
        {
          vtype: "history_entry",
          index: 0,
          id: "entry-squat",
          exercise: { id: "squat", equipment: "barbell" },
          programExerciseId: opened.currentExercise.key,
          warmupSets: [],
          sets: [
            {
              vtype: "set",
              id: "set-1",
              index: 0,
              reps: 5,
              completedReps: 5,
              isCompleted: true,
              weight: { value: 100, unit: "lb" },
              originalWeight: { value: 100, unit: "lb" },
              isUnilateral: false,
            },
          ],
        },
      ],
    };
    const decision = writeOf(
      ExerciseLiftoEditorSave_decide(
        input(opened, {
          progress,
          cachedScope: "all",
          draft: typed(opened, "Deadlift / 5x5 100lb / progress: lp(5lb)"),
        })
      )
    );
    expect(decision.plan.remap?.needsConfirmation).to.equal(true);
    expect(decision.plan.remap?.question).to.contain("logged sets for Squat");
    expect(ExerciseLiftoEditorSave_lenses(decision.plan, true)).to.have.length(2);
    expect(ExerciseLiftoEditorSave_lenses(decision.plan, false)).to.have.length(1);
  });
});
