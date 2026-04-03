import { ITourConfig } from "./tourTypes";
import { IPlannerProgram } from "../../types";
import { IconDayTextMode } from "../icons/iconDayTextMode";
import { Link } from "../link";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import { IconEdit2 } from "../icons/iconEdit2";
import { IconUiMode } from "../icons/iconUiMode";
import { getCurrentScreenData } from "../../navigation/navigationService";
import { IState } from "../../models/state";

function getPlannerFromState(state: IState): IPlannerProgram | undefined {
  const screenData = getCurrentScreenData();
  const programId = screenData?.name === "editProgram" ? screenData.params?.programId : undefined;
  if (!programId) return undefined;
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
          <p className="mb-2">
            Programs consist of <strong>weeks</strong> (or just 1 week for simple programs). Each week has{" "}
            <strong>days</strong> (workouts). Each day has <strong>exercises</strong>.
          </p>
          <p className="mb-2">
            For periodized programs, you can have multiple weeks with different rep schemes that cycle through.
          </p>
          <p>
            When you finish last week and day, it <strong>loops back</strong> to the beginning - keeping all your
            progress and weight increases.
          </p>
        </>
      ),
    },
    {
      id: "updates",
      title: "How programs update",
      dino: "programtourupdate.png",
      content: () => (
        <>
          <p>
            After you finish a workout, the program <strong>updates itself</strong> based on program's progression logic
            and your performance and moves to the next day.
          </p>
        </>
      ),
    },
    {
      id: "text",
      title: "Programs are text",
      dino: "programtourtext.png",
      content: () => (
        <>
          <p className="mb-2">
            Under the hood, programs are just text using a special syntax called <strong>Liftoscript</strong>.
          </p>
          <p>
            You can use the UI to create and edit them, or use the{" "}
            <strong>
              <IconDayTextMode className="inline-block mx-1" /> mode
            </strong>{" "}
            to edit that <strong>Liftoscript</strong> text on a phone, or edit the text in the{" "}
            <strong>web editor</strong> on your laptop for more control.
          </p>
        </>
      ),
    },
    {
      id: "liftoscript",
      title: "Liftoscript",
      dino: "programtourliftoscript.png",
      content: () => (
        <>
          <p className="mb-2">
            <strong>Liftoscript</strong> is a simple declarative language that controls your program logic -
            progression, deloads, rep schemes, and more.
          </p>
          <p className="mb-2">A simple example:</p>
          <div className="p-2 mb-2 text-xs rounded bg-background-cardsecondary">
            <PlannerCodeBlock script={"Squat / 3x8 100lb / progress: lp(5lb)"} />
          </div>
          <p className="mb-2">
            This defines Squat for 3 sets of 8 reps at 100lb, with linear progression adding 5lb when you hit all reps.
          </p>
          <p>
            <Link href="https://www.liftosaur.com/doc/liftoscript">Read the full Liftoscript docs</Link> to learn more.
          </p>
        </>
      ),
    },
    {
      id: "addExercise",
      title: "Adding exercises",
      dino: "programtouradd.png",
      condition: (state) => isProgramEmpty(state),
      content: () => (
        <p>
          To add your first exercise - switch to <strong>Edit</strong>, then to{" "}
          <IconUiMode className="inline-block mx-1" /> (UI Mode) and tap <strong>"Add Exercise"</strong> and search for
          one - like <strong>Bench Press</strong>.
        </p>
      ),
    },
    {
      id: "editExercise",
      title: "Editing exercises",
      dino: "programtouredit.png",
      condition: (state) => !isProgramEmpty(state),
      content: () => (
        <p>
          To edit an exercise in UI Mode, tap the <strong>Edit</strong>, then{" "}
          <IconUiMode className="inline-block mx-1" /> (UI Mode), and then - <IconEdit2 className="inline-block mx-1" />
          on the right pane of the exercise.
        </p>
      ),
    },
    {
      id: "playground",
      title: "Playground",
      dino: "programtourplayground.png",
      condition: (state) => !isProgramEmpty(state),
      content: () => (
        <>
          <p className="mb-2">
            Use the <strong>Playground</strong> tab to test your program before you start training. You can simulate
            finishing workouts and see how reps, weights, and sets change over time.
          </p>
          <p>
            Everything in the Playground is <strong>ephemeral</strong> - it doesn't affect your real workouts, settings,
            or program. It's a safe sandbox to verify your progressions work as planned.
          </p>
        </>
      ),
    },
  ],
};
