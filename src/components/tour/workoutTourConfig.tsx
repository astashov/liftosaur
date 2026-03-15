import { h, Fragment } from "preact";
import { ITourConfig } from "./tourTypes";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_isEmpty,
  Program_uses1RM,
  Program_usesRPE,
  Program_getCurrentProgram,
  Program_runExerciseFinishDayScript,
  Program_getProgramExerciseForKeyAndDay,
  Program_getDiffState,
  Program_getDiffVars,
} from "../../models/program";
import { Screen_currentName } from "../../models/screen";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Weight_eqNull } from "../../models/weight";
import { IconKebab } from "../icons/iconKebab";
import { Reps_isFinished } from "../../models/set";
import { PlannerProgramExercise_getState } from "../../pages/planner/models/plannerProgramExercise";
import { ObjectUtils_isNotEmpty } from "../../utils/object";

function getEvaluatedProgram(
  state: Parameters<NonNullable<ITourConfig["shouldStart"]>>[0]
): IEvaluatedProgram | undefined {
  const program = Program_getCurrentProgram(state.storage);
  return program ? Program_evaluate(program, state.storage.settings) : undefined;
}

export const workoutTourConfig: ITourConfig = {
  id: "workout",
  shouldStart: (state) => {
    const screen = Screen_currentName(state.screenStack);
    if (screen !== "progress") {
      return false;
    }
    const progress = Progress_getCurrentProgress(state);
    if (!progress || progress.entries.length === 0) {
      return false;
    }
    const evaluatedProgram = getEvaluatedProgram(state);
    return evaluatedProgram != null && !Program_isEmpty(evaluatedProgram);
  },
  steps: [
    {
      id: "howItWorks",
      title: "How Liftosaur works",
      dino: "dinocoach.svg",
      content: () => (
        <>
          <p className="mb-2">
            Your <strong>program</strong> is the plan - it decides your exercises, sets, reps, and weights.
          </p>
          <p className="mb-2">
            Each <strong>workout</strong> is generated from that program. When you <strong>finish</strong>, the app runs
            the program's logic to update the program - like bumping weights if you hit all your reps.
          </p>
          <p>
            Changes you make during a workout (e.g. going heavier or less reps) are just for today - they don't change
            the program.
          </p>
        </>
      ),
    },
    {
      id: "completingSets",
      title: "Completing sets",
      dino: "firstworkouttoursets.png",
      content: () => (
        <>
          <p className="mb-2">
            Each set has a <strong>target</strong> prescribed by the program (reps and weight), and what you actually{" "}
            <strong>complete</strong>. Set what you completed in the reps / weight fields. If what you completed =
            what's prefilled in the fields, just tap the checkmark button.
          </p>
          <p className="mb-2">
            <span className="font-bold text-text-success">Green</span> = you hit the target. But green doesn't
            necessarily mean the program will progress - that depends on the program's logic.
          </p>
          <p>
            Based on what was the target and what you complete, programs decide how to <strong>adjust</strong> - e.g.
            increase weight, change reps, or keep things the same.
          </p>
        </>
      ),
    },
    {
      id: "whatIs1RM",
      title: "What is 1RM?",
      dino: "firstworkouttour1rm.png",
      condition: (state) => {
        const evaluatedProgram = getEvaluatedProgram(state);
        return evaluatedProgram != null && Program_uses1RM(evaluatedProgram);
      },
      content: () => (
        <>
          <p className="mb-2">
            This program uses <strong>percentage-based weights</strong>. That means the weights are calculated as a
            percentage of your <strong>1 Rep Max (1RM)</strong> - the heaviest weight you can lift once.
          </p>
          <p>
            You can set your 1RMs by tapping on <strong>1RM</strong> under the exercise name
          </p>
        </>
      ),
    },
    {
      id: "whatIsRPE",
      title: "What is RPE?",
      dino: "firstworkouttourrpe.png",
      condition: (state) => {
        const evaluatedProgram = getEvaluatedProgram(state);
        return evaluatedProgram != null && Program_usesRPE(evaluatedProgram);
      },
      content: () => (
        <>
          <p className="mb-2">
            This program uses <strong>RPE (Rate of Perceived Exertion)</strong> - a 1-10 scale of how hard a set feels.
          </p>
          <p>
            RPE 10 = absolute max effort, nothing left. RPE 8 = you could do 2 more reps. Some programs may also ask
            what was your "completed" RPE - and the difference could be used for progression logic.
          </p>
        </>
      ),
    },
    {
      id: "equipment",
      title: "Equipment & rounding",
      dino: "firstworkouttourequipment.png",
      condition: (state) => {
        const progress = Progress_getCurrentProgress(state);
        const currentEntry = progress?.entries[progress.ui?.currentEntryIndex ?? 0];
        return currentEntry?.sets.some((w) => !Weight_eqNull(w.originalWeight, w.weight)) || false;
      },
      content: () => (
        <>
          <p>
            If you have a <span className="line-through">crossed-out weight</span> in your target - that's{" "}
            <strong>rounding</strong>. The app adjusts the program's exact weight to match what you can actually load
            with your equipment. You can fine-tune this in <strong>Equipment</strong> settings.
          </p>
        </>
      ),
    },
    {
      id: "editingProgram",
      title: "Editing program exercise",
      dino: "firstworkouttouredit.png",
      content: () => (
        <>
          <p>
            Want to tweak the exercise in the program? Tap the{" "}
            <strong>
              <IconKebab className="inline-block mx-1" /> menu
            </strong>{" "}
            and select <strong>"Edit Program Exercise"</strong> to change sets, reps, weights, or progression rules for
            the program exercise.
          </p>
        </>
      ),
    },
    {
      id: "progressionPreview",
      title: "Progression preview",
      dino: "firstworkouttourprogress.png",
      condition: (state) => {
        const progress = Progress_getCurrentProgress(state);
        if (!progress || progress.entries.length === 0) {
          return false;
        }
        const program = getEvaluatedProgram(state);
        if (!program) {
          return false;
        }
        const entry = progress.entries[progress.ui?.currentEntryIndex ?? 0];
        const isFinished = Reps_isFinished(entry.sets);
        if (!isFinished) {
          return false;
        }
        const programExercise = entry.programExerciseId
          ? Program_getProgramExerciseForKeyAndDay(program, progress.day, entry.programExerciseId)
          : undefined;
        if (!programExercise) {
          return false;
        }
        const dayData = programExercise.dayData;
        const settings = state.storage.settings;
        const stateVars = PlannerProgramExercise_getState(programExercise);
        const { units } = settings;
        const userPromptedStateVars = progress.userPromptedStateVars?.[programExercise.key];
        const result = Program_runExerciseFinishDayScript(
          entry,
          dayData,
          settings,
          stateVars,
          program.states,
          programExercise,
          state.storage.stats,
          userPromptedStateVars
        );
        if (result.success) {
          const { state: newState, updates, bindings } = result.data;
          const diffState = Program_getDiffState(stateVars, newState, units);
          const diffVars = Program_getDiffVars(entry, updates, bindings, settings);
          const prints = result.data.prints;

          if (ObjectUtils_isNotEmpty(diffState) || ObjectUtils_isNotEmpty(diffVars) || prints.length > 0) {
            return true;
          }
        }
        return false;
      },
      content: () => (
        <>
          <p>
            When you finished all the sets, if the program exercise has progression, you'll see the{" "}
            <strong>progression preview</strong> under the sets. It shows how this program exercise will adjust when you
            finish a workout.
          </p>
        </>
      ),
    },
  ],
};
