import { View, Text } from "react-native";
import { ITourConfig } from "./tourTypes";
import { IPlannerProgram } from "../../types";
import { IconDayTextMode } from "../icons/iconDayTextMode";
import { Link } from "../link";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { IconEdit2 } from "../icons/iconEdit2";
import { IconUiMode } from "../icons/iconUiMode";
import { getCurrentScreenData } from "../../navigation/navigationService";
import { IState } from "../../models/state";

const paraCn = "text-sm leading-relaxed text-text-secondary";

function getPlannerFromState(state: IState): IPlannerProgram | undefined {
  const screenData = getCurrentScreenData();
  const programId = screenData?.name === "editProgram" ? screenData.params?.programId : undefined;
  if (!programId) {
    return undefined;
  }
  const editProgramState = state.editProgramStates[programId];
  return editProgramState?.current?.program?.planner;
}

function isProgramEmpty(state: Parameters<NonNullable<ITourConfig["shouldStart"]>>[0]): boolean {
  const planner = getPlannerFromState(state);
  if (!planner) {
    return true;
  }
  return planner.weeks.every((week) => week.days.every((day) => !day.exerciseText.trim()));
}

export const programTourConfig: ITourConfig = {
  id: "program",
  shouldStart: (state) => {
    return getCurrentScreenData()?.name === "editProgram" && state.storage.history.length < 4;
  },
  steps: [
    {
      id: "structure",
      title: "Program structure",
      dino: "programtourstructure.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Programs consist of <Text className="font-bold">weeks</Text> (or just 1 week for simple programs). Each week
            has <Text className="font-bold">days</Text> (workouts). Each day has{" "}
            <Text className="font-bold">exercises</Text>.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>
            For periodized programs, you can have multiple weeks with different rep schemes that cycle through.
          </Text>
          <Text className={paraCn}>
            When you finish last week and day, it <Text className="font-bold">loops back</Text> to the beginning -
            keeping all your progress and weight increases.
          </Text>
        </>
      ),
    },
    {
      id: "updates",
      title: "How programs update",
      dino: "programtourupdate.png",
      content: () => (
        <Text className={paraCn}>
          After you finish a workout, the program <Text className="font-bold">updates itself</Text> based on program's
          progression logic and your performance and moves to the next day.
        </Text>
      ),
    },
    {
      id: "text",
      title: "Programs are text",
      dino: "programtourtext.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Under the hood, programs are just text using a special syntax called{" "}
            <Text className="font-bold">Liftoscript</Text>.
          </Text>
          <View className="flex-row flex-wrap items-center">
            <Text className={paraCn}>You can use the UI to create and edit them, or use the </Text>
            <View className="mx-1">
              <IconDayTextMode />
            </View>
            <Text className={`${paraCn} font-bold`}>mode</Text>
            <Text className={paraCn}> to edit that </Text>
            <Text className={`${paraCn} font-bold`}>Liftoscript</Text>
            <Text className={paraCn}> text on a phone, or edit the text in the </Text>
            <Text className={`${paraCn} font-bold`}>web editor</Text>
            <Text className={paraCn}> on your laptop for more control.</Text>
          </View>
        </>
      ),
    },
    {
      id: "liftoscript",
      title: "Liftoscript",
      dino: "programtourliftoscript.png",
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            <Text className="font-bold">Liftoscript</Text> is a simple declarative language that controls your program
            logic - progression, deloads, rep schemes, and more.
          </Text>
          <Text className={`mb-2 ${paraCn}`}>A simple example:</Text>
          <View className="p-2 mb-2 rounded bg-background-cardsecondary">
            <PlannerCodeBlock script={"Squat / 3x8 100lb / progress: lp(5lb)"} />
          </View>
          <Text className={`mb-2 ${paraCn}`}>
            This defines Squat for 3 sets of 8 reps at 100lb, with linear progression adding 5lb when you hit all reps.
          </Text>
          <Text className={paraCn}>
            <Link href="https://www.liftosaur.com/doc/liftoscript">Read the full Liftoscript docs</Link> to learn more.
          </Text>
        </>
      ),
    },
    {
      id: "addExercise",
      title: "Adding exercises",
      dino: "programtouradd.png",
      condition: (state) => isProgramEmpty(state),
      content: () => (
        <View className="flex-row flex-wrap items-center">
          <Text className={paraCn}>To add your first exercise - switch to </Text>
          <Text className={`${paraCn} font-bold`}>Edit</Text>
          <Text className={paraCn}>, then to </Text>
          <View className="mx-1">
            <IconUiMode />
          </View>
          <Text className={paraCn}> (UI Mode) and tap </Text>
          <Text className={`${paraCn} font-bold`}>"Add Exercise"</Text>
          <Text className={paraCn}> and search for one - like </Text>
          <Text className={`${paraCn} font-bold`}>Bench Press</Text>
          <Text className={paraCn}>.</Text>
        </View>
      ),
    },
    {
      id: "editExercise",
      title: "Editing exercises",
      dino: "programtouredit.png",
      condition: (state) => !isProgramEmpty(state),
      content: () => (
        <View className="flex-row flex-wrap items-center">
          <Text className={paraCn}>To edit an exercise in UI Mode, tap the </Text>
          <Text className={`${paraCn} font-bold`}>Edit</Text>
          <Text className={paraCn}>, then </Text>
          <View className="mx-1">
            <IconUiMode />
          </View>
          <Text className={paraCn}> (UI Mode), and then - </Text>
          <View className="mx-1">
            <IconEdit2 />
          </View>
          <Text className={paraCn}> on the right pane of the exercise.</Text>
        </View>
      ),
    },
    {
      id: "playground",
      title: "Playground",
      dino: "programtourplayground.png",
      condition: (state) => !isProgramEmpty(state),
      content: () => (
        <>
          <Text className={`mb-2 ${paraCn}`}>
            Use the <Text className="font-bold">Playground</Text> tab to test your program before you start training.
            You can simulate finishing workouts and see how reps, weights, and sets change over time.
          </Text>
          <Text className={paraCn}>
            Everything in the Playground is <Text className="font-bold">ephemeral</Text> - it doesn't affect your real
            workouts, settings, or program. It's a safe sandbox to verify your progressions work as planned.
          </Text>
        </>
      ),
    },
  ],
};
