import { View, Text } from "react-native";
import { ITourConfig } from "./tourTypes";
import {
  Program_isEmpty,
  Program_uses1RM,
  Program_usesRPE,
  Program_runExerciseFinishDayScript,
  Program_getProgramExerciseForKeyAndDay,
  Program_getDiffState,
  Program_getDiffVars,
  Program_getEvaluatedProgramFromState,
} from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { getCurrentScreenData } from "../../navigation/navigationService";
import { Weight_eqNull } from "../../models/weight";
import { IconKebab } from "../icons/iconKebab";
import { Reps_isFinished } from "../../models/set";
import { PlannerProgramExercise_getState } from "../../pages/planner/models/plannerProgramExercise";
import { ObjectUtils_isNotEmpty } from "../../utils/object";

const paraCn = "text-sm leading-relaxed text-text-secondary";

export const workoutTourConfig: ITourConfig = {
  id: "workout",
  shouldStart: (state) => {
    const screen = getCurrentScreenData()?.name;
    if (screen !== "progress") {
      return false;
    }
    if (state.storage.history.length >= 4) {
      return false;
    }
    const progress = Progress_getCurrentProgress(state);
    if (!progress || progress.entries.length === 0) {
      return false;
    }
    const evaluatedProgram = Program_getEvaluatedProgramFromState(state);
    return evaluatedProgram != null && !Program_isEmpty(evaluatedProgram);
  },
  steps: [
    {
      id: "howItWorks",
      title: "How Liftosaur works",
      dino: "dinocoach.svg",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Your <Text className="font-bold">program</Text> is the plan - it decides your exercises, sets, reps, and
            weights.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            Each <Text className="font-bold">workout</Text> is generated from that program. When you{" "}
            <Text className="font-bold">finish</Text>, the app runs the program's logic to update the program - like
            bumping weights if you hit all your reps.
          </Text>
          <Text className={paraCn}>
            Changes you make during a workout (e.g. going heavier or less reps) are just for today - they don't change
            the program.
          </Text>
        </>
      ),
    },
    {
      id: "completingSets",
      title: "Completing sets",
      dino: "firstworkouttoursets.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Each set has a <Text className="font-bold">target</Text> prescribed by the program (reps and weight), and
            what you actually <Text className="font-bold">complete</Text>. Set what you completed in the reps / weight
            fields. If what you completed = what's prefilled in the fields, just tap the checkmark button.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            <Text className="font-bold text-text-success">Green</Text> = you hit the target. But green doesn't
            necessarily mean the program will progress - that depends on the program's logic.
          </Text>
          <Text className={paraCn}>
            Based on what was the target and what you complete, programs decide how to{" "}
            <Text className="font-bold">adjust</Text> - e.g. increase weight, change reps, or keep things the same.
          </Text>
        </>
      ),
    },
    {
      id: "swipeSets",
      title: "Adjusting sets",
      dino: "firstworkouttourswipe.png",
      condition: (state) => state.storage.history.length >= 1,
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            You can <Text className="font-bold">swipe left</Text> on any set to change its{" "}
            <Text className="font-bold">target</Text> reps and weight, or to delete it.
          </Text>
          <Text className={paraCn}>
            These changes only affect <Text className="font-bold">this workout</Text> - they won't modify your program.
            To change the program itself, use <Text className="font-bold">"Edit Program Exercise"</Text> from the
            exercise menu.
          </Text>
        </>
      ),
    },
    {
      id: "whatIs1RM",
      title: "What is 1RM?",
      dino: "firstworkouttour1rm.png",
      condition: (state) => {
        const evaluatedProgram = Program_getEvaluatedProgramFromState(state);
        return evaluatedProgram != null && Program_uses1RM(evaluatedProgram);
      },
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            This program uses <Text className="font-bold">percentage-based weights</Text>. That means the weights are
            calculated as a percentage of your <Text className="font-bold">1 Rep Max (1RM)</Text> - the heaviest weight
            you can lift once.
          </Text>
          <Text className={paraCn}>
            You can set your 1RMs by tapping on <Text className="font-bold">1RM</Text> under the exercise name
          </Text>
        </>
      ),
    },
    {
      id: "whatIsRPE",
      title: "What is RPE?",
      dino: "firstworkouttourrpe.png",
      condition: (state) => {
        const evaluatedProgram = Program_getEvaluatedProgramFromState(state);
        return evaluatedProgram != null && Program_usesRPE(evaluatedProgram);
      },
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            This program uses <Text className="font-bold">RPE (Rate of Perceived Exertion)</Text> - a 1-10 scale of how
            hard a set feels.
          </Text>
          <Text className={paraCn}>
            RPE 10 = absolute max effort, nothing left. RPE 8 = you could do 2 more reps. Some programs may also ask
            what was your "completed" RPE - and the difference could be used for progression logic.
          </Text>
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
        <Text className={paraCn}>
          If you have a <Text className="line-through">crossed-out weight</Text> in your target - that's{" "}
          <Text className="font-bold">rounding</Text>. The app adjusts the program's exact weight to match what you can
          actually load with your equipment. You can fine-tune this in <Text className="font-bold">Equipment</Text>{" "}
          settings.
        </Text>
      ),
    },
    {
      id: "editingProgram",
      title: "Editing program exercise",
      dino: "firstworkouttouredit.png",
      content: () => (
        <View className="flex-row flex-wrap items-center">
          <View>
            <Text className={paraCn}>Want to tweak the exercise in the program? Tap the </Text>
          </View>
          <View className="inline-block mx-1">
            <IconKebab />
          </View>
          <Text className={`${paraCn} font-bold`}>menu</Text>
          <Text className={paraCn}> and select </Text>
          <Text className={`${paraCn} font-bold`}>"Edit Program Exercise"</Text>
          <Text className={paraCn}> to change sets, reps, weights, or progression rules for the program exercise.</Text>
        </View>
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
        const program = Program_getEvaluatedProgramFromState(state);
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
        <Text className={paraCn}>
          When you finished all the sets, if the program exercise has progression, you'll see the{" "}
          <Text className="font-bold">progression preview</Text> under the sets. It shows how this program exercise will
          adjust when you finish a workout.
        </Text>
      ),
    },
  ],
};
