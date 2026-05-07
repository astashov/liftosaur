import { View, Text } from "react-native";
import { ITourConfig } from "./tourTypes";
import { IconSwap } from "../icons/iconSwap";
import { Program_evaluate } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState } from "../../models/state";
import { getCurrentScreenData } from "../../navigation/navigationService";

const paraCn = "text-sm leading-relaxed text-text-secondary";

function getPlannerExerciseFromState(state: IState): IPlannerProgramExercise | undefined {
  const screenData = getCurrentScreenData();
  if (!screenData || screenData.name !== "editProgramExercise") {
    return undefined;
  }
  const exerciseKey = screenData.params?.key;
  const dayData = screenData.params?.dayData;
  const programId = screenData.params?.programId;
  if (!exerciseKey || !dayData || !programId) {
    return undefined;
  }
  const exerciseStateKey = `${programId}_${exerciseKey}`;
  const plannerExerciseState = state.editProgramExerciseStates[exerciseStateKey];
  if (!plannerExerciseState) {
    return undefined;
  }
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
          <Text className={`mb-2 ${paraCn}`}>
            This is where you customize an exercise in your program - sets, reps, weights, warmups, and progression
            rules.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            Changes are <Text className="font-bold">not saved</Text> until you tap the{" "}
            <Text className="font-bold">Save</Text> button. You can also <Text className="font-bold">undo/redo</Text>{" "}
            any changes.
          </Text>
          <View className="flex-row flex-wrap items-center">
            <Text className={paraCn}>
              To change the exercise itself (e.g. swap Bench Press for Close-Grip Bench), tap the{" "}
            </Text>
            <View className="mx-1">
              <IconSwap size={12} />
            </View>
            <Text className={`${paraCn} font-bold`}>swap icon</Text>
            <Text className={paraCn}> next to the exercise name.</Text>
          </View>
        </>
      ),
    },
    {
      id: "sets",
      title: "Editing sets",
      dino: "programexercisetoursets.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Change <Text className="font-bold">reps</Text> and <Text className="font-bold">weight</Text> directly in the
            set table.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            <Text className="font-bold">Swipe left</Text> on a set to reveal <Text className="font-bold">Edit</Text> and{" "}
            <Text className="font-bold">Delete</Text>. Edit lets you add features like{" "}
            <Text className="font-bold">RPE</Text>, <Text className="font-bold">Timer</Text>,{" "}
            <Text className="font-bold">Rep Range</Text>, and <Text className="font-bold">Label</Text>.
          </Text>
          <Text className={paraCn}>
            Use the <Text className="font-bold">"By week/day"</Text> tab to edit sets for a specific week, or{" "}
            <Text className="font-bold">"Across all weeks"</Text> to change all at once.
          </Text>
        </>
      ),
    },
    {
      id: "warmups",
      title: "Warmups",
      dino: "programexercisetourwarmups.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Every exercise has <Text className="font-bold">default warmup sets</Text> based on the exercise type. Tap{" "}
            <Text className="font-bold">Customize</Text> to edit warmup reps and weights.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            Warmup weights can be <Text className="font-bold">absolute</Text> (e.g. 95lb) or{" "}
            <Text className="font-bold">percentage-based of first set</Text> (e.g. 60% of your first set weight).
          </Text>
          <Text className={paraCn}>
            Some default warmup sets <Text className="font-bold">may be skipped</Text> if the first set weight is too
            light.
          </Text>
        </>
      ),
    },
    {
      id: "progress",
      title: "Progression",
      dino: "programexercisetourprogress.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Progression controls how the exercise <Text className="font-bold">changes after you finish a workout</Text>.
            Four types available:
          </Text>
          <View className="pl-4 mb-2">
            <View className="flex-row">
              <Text className={paraCn}>{"• "}</Text>
              <Text className={`flex-1 ${paraCn}`}>
                <Text className="font-bold">Linear</Text> - increase weight by a fixed amount
              </Text>
            </View>
            <View className="flex-row">
              <Text className={paraCn}>{"• "}</Text>
              <Text className={`flex-1 ${paraCn}`}>
                <Text className="font-bold">Double</Text> - increase reps first, then bump weight
              </Text>
            </View>
            <View className="flex-row">
              <Text className={paraCn}>{"• "}</Text>
              <Text className={`flex-1 ${paraCn}`}>
                <Text className="font-bold">Sum Reps</Text> - progress when total reps hit a target
              </Text>
            </View>
            <View className="flex-row">
              <Text className={paraCn}>{"• "}</Text>
              <Text className={`flex-1 ${paraCn}`}>
                <Text className="font-bold">Custom</Text> - write your own Liftoscript logic
              </Text>
            </View>
          </View>
          <Text className={paraCn}>
            Enable or disable progression via the <Text className="font-bold">kebab menu</Text> in the top right.
          </Text>
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
          <Text className={`mb-2 ${paraCn}`}>
            <Text className="font-bold">Update</Text> is an advanced feature - a Liftoscript that runs{" "}
            <Text className="font-bold">during the workout</Text> to dynamically change sets. For example,
            auto-calculating weight based on previous sets.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            This is different from <Text className="font-bold">Progression</Text>, which runs{" "}
            <Text className="font-bold">after</Text> you finish the workout.
          </Text>
          <Text className={paraCn}>
            Enable or disable via the <Text className="font-bold">kebab menu</Text> in the top right.
          </Text>
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
          <Text className={`mb-2 ${paraCn}`}>
            In multi-week programs, an exercise can <Text className="font-bold">repeat across weeks</Text>{" "}
            automatically. You set a week range (e.g. weeks 1-4) and the exercise appears in all those weeks without
            being listed separately.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            The sets come from whatever the exercise (or its reuse target) defines. This is useful with{" "}
            <Text className="font-bold">templates</Text> - define a template once, reuse it, and just change the
            template each week.
          </Text>
          <Text className={paraCn}>
            If you need to <Text className="font-bold">override</Text> the exercise for a specific week, you can break
            out of the repeat and customize that week independently.
          </Text>
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
          <Text className={`mb-2 ${paraCn}`}>
            Exercises can <Text className="font-bold">reuse</Text> sets, progression, update, and descriptions from
            another exercise. This keeps your program <Text className="font-bold">DRY</Text> - change once, apply
            everywhere.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            If something is reused, you'll see a <Text className="font-bold">"Reuse from"</Text> dropdown and an{" "}
            <Text className="font-bold">Override</Text> button to break the link and customize independently.
          </Text>
          <Text className={paraCn}>
            Under the hood, reuse is the <Text className="font-bold">...ExerciseName</Text> syntax in Liftoscript.
            Complex reuse patterns are sometimes easier to manage in the text editor.
          </Text>
        </>
      ),
    },
  ],
};
