import { ITourConfig } from "./tourTypes";
import { IconSwap } from "../icons/iconSwap";
import { Program_evaluate } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState } from "../../models/state";
import { getCurrentScreenData } from "../../navigation/navigationService";

function getPlannerExerciseFromState(state: IState): IPlannerProgramExercise | undefined {
  const screenData = getCurrentScreenData();
  if (!screenData || screenData.name !== "editProgramExercise") return undefined;
  const exerciseKey = screenData.params?.key;
  const dayData = screenData.params?.dayData;
  const programId = screenData.params?.programId;
  if (!exerciseKey || !dayData || !programId) return undefined;
  const exerciseStateKey = `${programId}_${exerciseKey}`;
  const plannerExerciseState = state.editProgramExerciseStates[exerciseStateKey];
  if (!plannerExerciseState) return undefined;
  const evaluatedProgram = Program_evaluate(plannerExerciseState.current.program, state.storage.settings);
  return evaluatedProgram?.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1].exercises.find(
    (e) => e.key === exerciseKey
  );
}

export const editProgramExerciseTourConfig: ITourConfig = {
  id: "editProgramExercise",
  shouldStart: (state) => {
    if (getCurrentScreenData()?.name !== "editProgramExercise") {
      return false;
    }
    if (state.storage.history.length >= 4) {
      return false;
    }
    const plannerExercise = getPlannerExerciseFromState(state);
    return !!plannerExercise;
  },
  steps: [
    {
      id: "overview",
      title: "Edit program exercise",
      dino: "programexercisetoursummary.png",
      content: () => (
        <>
          <p className="mb-2">
            This is where you customize an exercise in your program - sets, reps, weights, warmups, and progression
            rules.
          </p>
          <p className="mb-2">
            Changes are <strong>not saved</strong> until you tap the <strong>Save</strong> button. You can also{" "}
            <strong>undo/redo</strong> any changes.
          </p>
          <p>
            To change the exercise itself (e.g. swap Bench Press for Close-Grip Bench), tap the{" "}
            <strong>
              <IconSwap className="inline-block mx-1" size={12} /> swap icon
            </strong>{" "}
            next to the exercise name.
          </p>
        </>
      ),
    },
    {
      id: "sets",
      title: "Editing sets",
      dino: "programexercisetoursets.png",
      content: () => (
        <>
          <p className="mb-2">
            Change <strong>reps</strong> and <strong>weight</strong> directly in the set table.
          </p>
          <p className="mb-2">
            <strong>Swipe left</strong> on a set to reveal <strong>Edit</strong> and <strong>Delete</strong>. Edit lets
            you add features like <strong>RPE</strong>, <strong>Timer</strong>, <strong>Rep Range</strong>, and{" "}
            <strong>Label</strong>.
          </p>
          <p>
            Use the <strong>"By week/day"</strong> tab to edit sets for a specific week, or{" "}
            <strong>"Across all weeks"</strong> to change all at once.
          </p>
        </>
      ),
    },
    {
      id: "warmups",
      title: "Warmups",
      dino: "programexercisetourwarmups.png",
      content: () => (
        <>
          <p className="mb-2">
            Every exercise has <strong>default warmup sets</strong> based on the exercise type. Tap{" "}
            <strong>Customize</strong> to edit warmup reps and weights.
          </p>
          <p className="mb-2">
            Warmup weights can be <strong>absolute</strong> (e.g. 95lb) or{" "}
            <strong>percentage-based of first set</strong> (e.g. 60% of your first set weight).
          </p>
          <p>
            Some default warmup sets <strong>may be skipped</strong> if the first set weight is too light.
          </p>
        </>
      ),
    },
    {
      id: "progress",
      title: "Progression",
      dino: "programexercisetourprogress.png",
      content: () => (
        <>
          <p className="mb-2">
            Progression controls how the exercise <strong>changes after you finish a workout</strong>. Four types
            available:
          </p>
          <ul className="pl-4 mb-2 list-disc">
            <li>
              <strong>Linear</strong> - increase weight by a fixed amount
            </li>
            <li>
              <strong>Double</strong> - increase reps first, then bump weight
            </li>
            <li>
              <strong>Sum Reps</strong> - progress when total reps hit a target
            </li>
            <li>
              <strong>Custom</strong> - write your own Liftoscript logic
            </li>
          </ul>
          <p>
            Enable or disable progression via the <strong>kebab menu</strong> in the top right.
          </p>
        </>
      ),
    },
    {
      id: "update",
      title: "Update script",
      dino: "programtourtext.png",
      condition: (state) => {
        const plannerExercise = getPlannerExerciseFromState(state);
        if (!plannerExercise) {
          return false;
        }
        return plannerExercise.update != null;
      },
      content: () => (
        <>
          <p className="mb-2">
            <strong>Update</strong> is an advanced feature - a Liftoscript that runs <strong>during the workout</strong>{" "}
            to dynamically change sets. For example, auto-calculating weight based on previous sets.
          </p>
          <p className="mb-2">
            This is different from <strong>Progression</strong>, which runs <strong>after</strong> you finish the
            workout.
          </p>
          <p>
            Enable or disable via the <strong>kebab menu</strong> in the top right.
          </p>
        </>
      ),
    },
    {
      id: "repeat",
      title: "Repeating across weeks",
      dino: "programexercisetourrepeat.png",
      condition: (state) => {
        const plannerExercise = getPlannerExerciseFromState(state);
        if (!plannerExercise) {
          return false;
        }
        return plannerExercise.repeating.length > 0;
      },
      content: () => (
        <>
          <p className="mb-2">
            In multi-week programs, an exercise can <strong>repeat across weeks</strong> automatically. You set a week
            range (e.g. weeks 1-4) and the exercise appears in all those weeks without being listed separately.
          </p>
          <p className="mb-2">
            The sets come from whatever the exercise (or its reuse target) defines. This is useful with{" "}
            <strong>templates</strong> - define a template once, reuse it, and just change the template each week.
          </p>
          <p>
            If you need to <strong>override</strong> the exercise for a specific week, you can break out of the repeat
            and customize that week independently.
          </p>
        </>
      ),
    },
    {
      id: "reuse",
      title: "Reusing from other exercises",
      dino: "programexercisetourreuse.png",
      condition: (state) => {
        const plannerExercise = getPlannerExerciseFromState(state);
        if (!plannerExercise) {
          return false;
        }
        return !!(plannerExercise.update?.reuse || plannerExercise.progress?.reuse || plannerExercise.reuse);
      },
      content: () => (
        <>
          <p className="mb-2">
            Exercises can <strong>reuse</strong> sets, progression, update, and descriptions from another exercise. This
            keeps your program <strong>DRY</strong> - change once, apply everywhere.
          </p>
          <p className="mb-2">
            If something is reused, you'll see a <strong>"Reuse from"</strong> dropdown and an <strong>Override</strong>{" "}
            button to break the link and customize independently.
          </p>
          <p>
            Under the hood, reuse is the <strong>...ExerciseName</strong> syntax in Liftoscript. Complex reuse patterns
            are sometimes easier to manage in the text editor.
          </p>
        </>
      ),
    },
  ],
};
